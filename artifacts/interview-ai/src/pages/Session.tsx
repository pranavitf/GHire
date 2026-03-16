import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  AlertTriangle, Activity, Wifi, WifiOff,
  MessageSquare, Shield, ShieldAlert, Play, Star
} from "lucide-react";
import { useGetSession, useUpdateSession, useEvaluateSession } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";

type TranscriptEntry = { role: "ai" | "user"; text: string; ts: number; wordCount?: number };
type LiveStatus = "idle" | "connecting" | "connected" | "error" | "disconnected";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_MODEL   = "models/gemini-2.5-flash-native-audio-latest";
const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

function pcmToBase64(i16: Int16Array): string {
  const bytes = new Uint8Array(i16.buffer);
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function resampleTo16k(f32: Float32Array, fromRate: number): Int16Array {
  const ratio  = fromRate / 16000;
  const outLen = Math.floor(f32.length / ratio);
  const out    = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = f32[Math.floor(i * ratio)];
    out[i] = Math.max(-32768, Math.min(32767, src * 32768));
  }
  return out;
}

// Pick the top N user responses by word count as "best moments"
function pickBestMoments(entries: TranscriptEntry[], n = 3): TranscriptEntry[] {
  return [...entries]
    .filter(e => e.role === "user" && (e.wordCount ?? 0) >= 5)
    .sort((a, b) => (b.wordCount ?? 0) - (a.wordCount ?? 0))
    .slice(0, n);
}

export default function Session() {
  const { sessionId }   = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();

  const webcamRef     = useRef<HTMLVideoElement>(null);
  const wsRef         = useRef<WebSocket | null>(null);
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const micSrcRef     = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef  = useRef<ScriptProcessorNode | null>(null);
  const micStreamRef  = useRef<MediaStream | null>(null);
  const camStreamRef  = useRef<MediaStream | null>(null);
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scheduledEnd  = useRef<number>(0);
  const isMounted     = useRef(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const { data: session, isLoading } = useGetSession(sessionId || "");
  const updateMutation   = useUpdateSession();
  const evaluateMutation = useEvaluateSession();

  const [time,       setTime]       = useState(0);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [isMicOn,    setIsMicOn]    = useState(false);
  const [isCamOn,    setIsCamOn]    = useState(false);
  const [flags,      setFlags]      = useState<{ type: string; desc: string; ts: number }[]>([]);
  const [lastFlag,   setLastFlag]   = useState<string | null>(null);
  const [launched,   setLaunched]   = useState(false);
  const transcriptRef = useRef<TranscriptEntry[]>([]);   // always-fresh ref for handleEnd

  // Keep ref in sync
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  // Timer
  useEffect(() => {
    if (!launched) return;
    const t = setInterval(() => setTime(v => v + 1), 1000);
    return () => clearInterval(t);
  }, [launched]);

  // ── Audio output ────────────────────────────────────────────────────────
  const playPCM = useCallback((raw: string) => {
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === "closed") return;
    const binary = atob(raw);
    const i16    = new Int16Array(binary.length / 2);
    for (let i = 0; i < i16.length; i++) {
      i16[i] = (binary.charCodeAt(i * 2)) | (binary.charCodeAt(i * 2 + 1) << 8);
    }
    const f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768;
    const buf = ctx.createBuffer(1, f32.length, 24000);
    buf.copyToChannel(f32, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const now   = ctx.currentTime;
    const start = Math.max(now, scheduledEnd.current);
    src.start(start);
    scheduledEnd.current = start + buf.duration;
    setAiSpeaking(true);
    src.onended = () => {
      if (scheduledEnd.current <= (audioCtxRef.current?.currentTime ?? 0) + 0.05) setAiSpeaking(false);
    };
  }, []);

  // ── Webcam ──────────────────────────────────────────────────────────────
  const startCam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: "user" }, audio: false });
      camStreamRef.current = stream;
      if (webcamRef.current) webcamRef.current.srcObject = stream;
      setIsCamOn(true);
      frameTimerRef.current = setInterval(() => {
        const ws  = wsRef.current;
        const vid = webcamRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN || !vid || vid.readyState < 2) return;
        const canvas = document.createElement("canvas");
        canvas.width = 320; canvas.height = 240;
        canvas.getContext("2d")?.drawImage(vid, 0, 0, 320, 240);
        const b64 = canvas.toDataURL("image/jpeg", 0.5).split(",")[1];
        ws.send(JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType: "image/jpeg", data: b64 }] } }));
      }, 3000);
    } catch (e) { console.warn("Cam unavailable", e); }
  }, []);

  // ── Microphone + Speech Recognition ────────────────────────────────────
  const startMic = useCallback(async () => {
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === "closed") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;
      const nativeRate = ctx.sampleRate;
      const source     = ctx.createMediaStreamSource(stream);
      micSrcRef.current = source;
      const processor  = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const raw = e.inputBuffer.getChannelData(0);
        const i16 = resampleTo16k(raw, nativeRate);
        ws.send(JSON.stringify({
          realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: pcmToBase64(i16) }] }
        }));
      };
      source.connect(processor);
      processor.connect(ctx.destination);
      setIsMicOn(true);

      // ── Browser speech recognition for user transcription ──────────────
      const SpeechRecognitionAPI = (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
        ?? (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous      = true;
        recognition.interimResults  = false;
        recognition.lang            = "en-US";
        recognitionRef.current      = recognition;
        recognition.onresult = (ev) => {
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            if (ev.results[i].isFinal) {
              const text      = ev.results[i][0].transcript.trim();
              const wordCount = text.split(/\s+/).length;
              if (text.length > 3) {
                setTranscript(prev => [...prev, { role: "user", text, ts: Date.now(), wordCount }]);
              }
            }
          }
        };
        recognition.onerror = (e) => { if (e.error !== "no-speech") console.warn("SR error", e.error); };
        recognition.onend   = () => { if (isMounted.current && isMicOn) recognition.start(); };
        recognition.start();
      }
    } catch (e) { console.error("Mic error", e); }
  }, [isMicOn]);

  // ── Flag helper ─────────────────────────────────────────────────────────
  const addFlag = useCallback((type: string, desc: string) => {
    setFlags(prev => [...prev, { type, desc, ts: Date.now() }]);
    setLastFlag(desc);
    setTimeout(() => setLastFlag(null), 5000);
  }, []);

  // ── System instruction ──────────────────────────────────────────────────
  const buildInstruction = useCallback((sess: typeof session) => {
    if (!sess) return "";
    return `You are ARIA, an elite AI interview coach conducting a live voice interview for a ${sess.difficulty} level ${sess.jobTitle} position in the ${sess.industry} industry.

BEHAVIOR:
- Greet the candidate warmly and ask your first interview question immediately.
- Ask ONE question at a time. Listen for their answer before asking the next.
- Ask 5–8 well-chosen questions total, then end the interview professionally.
- Tailor difficulty to ${sess.difficulty} level.
- Keep responses short and natural — this is a real-time voice conversation.
- Do NOT use markdown, lists, or bullet points — speak naturally.
- If you detect the candidate is distracted or off-topic, address it naturally.

Start with a greeting and your first question the moment this session begins.`;
  }, []);

  // ── MAIN CONNECT — called on user click ────────────────────────────────
  const handleLaunch = useCallback(async () => {
    if (!session) return;
    if (!GEMINI_API_KEY) { alert("Gemini API key is missing."); return; }

    setLaunched(true);
    setLiveStatus("connecting");

    // AudioContext MUST be created inside a user gesture
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    if (ctx.state === "suspended") await ctx.resume();

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        setup: {
          model: GEMINI_MODEL,
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }
            }
          },
          systemInstruction: { parts: [{ text: buildInstruction(session) }] }
        }
      }));
    };

    ws.onmessage = async (event) => {
      if (!isMounted.current) return;
      const raw = event.data instanceof Blob ? await event.data.text() : (event.data as string);
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(raw); } catch { return; }

      // Connected — start mic and cam
      if ("setupComplete" in msg) {
        setLiveStatus("connected");
        await startMic();
        await startCam();
        return;
      }

      const sc = msg.serverContent as Record<string, unknown> | undefined;
      if (!sc) return;

      // AI audio
      const mt = sc.modelTurn as { parts?: Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }> } | undefined;
      if (mt?.parts) {
        for (const part of mt.parts) {
          if (part.inlineData?.mimeType?.startsWith("audio/pcm") && part.inlineData.data) {
            playPCM(part.inlineData.data);
          }
          // AI text response (some chunks include text alongside audio)
          if (part.text?.trim()) {
            setTranscript(prev => {
              // Merge with last AI entry if very recent (streaming words)
              const last = prev[prev.length - 1];
              if (last && last.role === "ai" && Date.now() - last.ts < 2000) {
                return [...prev.slice(0, -1), { ...last, text: last.text + " " + part.text!.trim() }];
              }
              return [...prev, { role: "ai", text: part.text!.trim(), ts: Date.now() }];
            });
          }
        }
      }

      // AI output transcription (if returned by API)
      const outTx = sc.outputTranscription as { text?: string } | undefined;
      if (outTx?.text?.trim()) {
        setTranscript(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === "ai" && Date.now() - last.ts < 2000) {
            return [...prev.slice(0, -1), { ...last, text: last.text + " " + outTx.text!.trim() }];
          }
          return [...prev, { role: "ai", text: outTx.text!.trim(), ts: Date.now() }];
        });
      }

      // Interrupt
      if (sc.interrupted) setAiSpeaking(false);
    };

    ws.onerror = (e) => { console.error("Gemini WS error", e); if (isMounted.current) setLiveStatus("error"); };
    ws.onclose = (e) => { console.warn("Gemini WS closed", e.code, e.reason); if (isMounted.current) setLiveStatus("disconnected"); };
  }, [session, buildInstruction, startMic, startCam, playPCM]);

  // ── Safe cleanup ────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    recognitionRef.current?.stop();
    wsRef.current?.close();
    processorRef.current?.disconnect();
    micSrcRef.current?.disconnect();
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    camStreamRef.current?.getTracks().forEach(t => t.stop());
    if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state !== "closed") ctx.close().catch(() => {});
  }, []);

  useEffect(() => () => { isMounted.current = false; cleanup(); }, [cleanup]);

  // ── Controls ────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    micStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMicOn(v => !v);
  }, []);

  const toggleCam = useCallback(() => {
    if (isCamOn) {
      camStreamRef.current?.getTracks().forEach(t => t.stop());
      if (webcamRef.current) webcamRef.current.srcObject = null;
      if (frameTimerRef.current) clearInterval(frameTimerRef.current);
      setIsCamOn(false);
    } else { startCam(); }
  }, [isCamOn, startCam]);

  // ── End session ─────────────────────────────────────────────────────────
  const handleEnd = useCallback(() => {
    if (!sessionId) return;
    cleanup();

    const tx = transcriptRef.current;
    const bestMoments = pickBestMoments(tx);
    const apiFlags    = flags.map(f => ({ type: "gaze_away" as const, timestamp: f.ts, description: f.desc, severity: "medium" as const }));
    const apiTx       = tx.map(t => ({ role: t.role, content: t.text, timestamp: t.ts }));

    // Attach best moments as a special marker so the evaluator sees them
    const bestMomentsMarkers = bestMoments.length > 0
      ? bestMoments.map(m => ({ role: "system" as unknown as "user", content: `[BEST_MOMENT]: ${m.text}`, timestamp: m.ts }))
      : [];

    updateMutation.mutate(
      {
        sessionId,
        data: {
          status: "completed",
          durationSeconds: time,
          proctorFlags: apiFlags as never,
          transcript: [...apiTx, ...bestMomentsMarkers] as never
        }
      },
      {
        onSuccess: () => {
          evaluateMutation.mutate(
            { sessionId },
            {
              onSuccess: () => setLocation(`/portfolio/${sessionId}`),
              onError:   () => setLocation(`/portfolio/${sessionId}`),
            }
          );
        },
        onError: () => setLocation(`/portfolio/${sessionId}`),
      }
    );
  }, [sessionId, time, flags, cleanup, updateMutation, evaluateMutation, setLocation]);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const statusColor: Record<LiveStatus, string> = {
    idle: "text-gray-400", connecting: "text-yellow-400",
    connected: "text-green-400", error: "text-red-400", disconnected: "text-gray-500"
  };
  const statusLabel: Record<LiveStatus, string> = {
    idle: "READY", connecting: "CONNECTING", connected: "LIVE",
    error: "ERROR", disconnected: "ENDED"
  };

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Activity className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden">

      {/* ─── Launch Overlay ─── */}
      <AnimatePresence>
        {!launched && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8"
          >
            <div className="relative">
              <div className="absolute -inset-20 rounded-full blur-[100px]"
                style={{ background: "radial-gradient(circle, rgba(0,200,255,0.18) 0%, transparent 70%)" }} />
              <img
                src={`${import.meta.env.BASE_URL}images/avatar-placeholder.png`}
                alt="ARIA"
                className="w-44 h-44 object-contain relative drop-shadow-[0_0_30px_rgba(0,200,255,0.5)]"
              />
            </div>
            <div className="text-center">
              <h1 className="text-5xl font-black font-display tracking-widest text-glow-cyan mb-2">ARIA</h1>
              <p className="text-muted-foreground text-sm uppercase tracking-widest">AI Interview Conductor · Gemini 2.5</p>
              <p className="text-white/50 mt-3 text-sm">{session.jobTitle} · {session.industry} · {session.difficulty}</p>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest px-8 text-center max-w-sm">
              Allow microphone access when prompted. ARIA will greet you and begin immediately.
            </p>
            <button
              onClick={handleLaunch}
              className="group relative flex items-center gap-3 px-12 py-5 rounded-2xl font-black text-xl uppercase tracking-widest overflow-hidden border border-primary/40"
              style={{ background: "linear-gradient(135deg, rgba(0,200,255,0.1), rgba(124,58,237,0.1))" }}
            >
              <div className="absolute inset-0 bg-white/10 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
              <Play className="w-6 h-6 fill-current text-primary relative" />
              <span className="relative text-glow-cyan">BEGIN INTERVIEW</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HUD ─── */}
      <header className="absolute top-0 w-full z-50 p-4 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-4 bg-black/70 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-full">
          <div className={`flex items-center gap-1.5 ${statusColor[liveStatus]}`}>
            {liveStatus === "connected"
              ? <Wifi className="w-3 h-3" />
              : liveStatus === "error" || liveStatus === "disconnected"
              ? <WifiOff className="w-3 h-3" />
              : <Activity className="w-3 h-3 animate-pulse" />}
            <span className="font-mono text-xs font-bold uppercase tracking-widest">{statusLabel[liveStatus]}</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <span className="font-mono text-primary font-bold text-sm">{fmt(time)}</span>
          <div className="w-px h-4 bg-white/20" />
          <span className="text-xs text-gray-400 uppercase tracking-wider">{session.jobTitle} · {session.industry}</span>
        </div>

        <AnimatePresence>
          {lastFlag && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="pointer-events-auto bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 px-4 py-2 rounded-lg backdrop-blur-md flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold">{lastFlag}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {flags.length > 0 && (
          <div className="pointer-events-auto bg-black/60 border border-red-500/30 px-3 py-2 rounded-lg flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-400 font-bold">{flags.length} FLAG{flags.length !== 1 ? "S" : ""}</span>
          </div>
        )}
      </header>

      {/* ─── Main ─── */}
      <main className="flex-1 relative flex">
        <div className="absolute inset-0 bg-[#02040a]">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(ellipse at 50% 60%, rgba(0,200,255,0.15) 0%, transparent 70%)" }} />

          {/* Avatar */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <AnimatePresence>
                {aiSpeaking && (
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1.2, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                    className="absolute -inset-24 rounded-full blur-[80px]"
                    style={{ background: "radial-gradient(circle, rgba(0,240,255,0.3) 0%, transparent 70%)" }} />
                )}
              </AnimatePresence>

              <motion.img
                src={`${import.meta.env.BASE_URL}images/avatar-placeholder.png`}
                alt="ARIA"
                animate={{ scale: aiSpeaking ? 1.04 : 1 }}
                transition={{ duration: 0.3 }}
                className="w-80 h-80 object-contain drop-shadow-[0_0_40px_rgba(0,240,255,0.35)]"
              />

              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 border border-primary/30 px-4 py-1.5 rounded-full backdrop-blur-sm whitespace-nowrap">
                {aiSpeaking ? (
                  <>
                    <span className="flex gap-0.5">
                      {[0,1,2,3].map(i => (
                        <motion.span key={i} className="w-1 bg-primary rounded-full"
                          animate={{ height: ["4px","14px","4px"] }}
                          transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }} />
                      ))}
                    </span>
                    <span className="text-xs text-primary font-display font-bold uppercase tracking-widest">Speaking</span>
                  </>
                ) : liveStatus === "connected" ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-green-400 font-display font-bold uppercase tracking-widest">Listening</span>
                  </>
                ) : liveStatus === "connecting" ? (
                  <>
                    <Activity className="w-3 h-3 text-yellow-400 animate-pulse" />
                    <span className="text-xs text-yellow-400 font-display font-bold uppercase tracking-widest">Connecting...</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-500 font-display uppercase tracking-widest">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Webcam PiP */}
          <div className="absolute bottom-28 left-6 z-20">
            <div className="relative w-48 h-36 rounded-xl overflow-hidden border border-white/20 bg-gray-900 shadow-2xl">
              <video ref={webcamRef} autoPlay muted playsInline
                className={`w-full h-full object-cover transition-opacity ${isCamOn ? "opacity-100" : "opacity-0"}`} />
              {!isCamOn && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-gray-600" />
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-0.5">
                <span className="text-[10px] text-white/60 uppercase tracking-wider">You</span>
              </div>
              {isMicOn && liveStatus === "connected" && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* ─── Transcript Panel ─── */}
        <div className="relative z-10 w-96 bg-black/70 backdrop-blur-2xl border-l border-white/10 ml-auto flex flex-col">
          <div className="p-5 border-b border-white/10 bg-gradient-to-b from-primary/10 to-transparent">
            <h3 className="font-display font-bold text-base text-primary tracking-widest uppercase flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Live Transcript
            </h3>
            <p className="text-[11px] text-muted-foreground uppercase mt-1">{session.industry} · {session.difficulty} Level</p>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[calc(100vh-220px)]">
            {transcript.length === 0 && (
              <div className="text-center text-gray-600 text-sm py-12">
                {liveStatus === "connecting" ? "Connecting to ARIA..." : liveStatus === "connected" ? "ARIA will greet you first..." : "Press BEGIN INTERVIEW to start"}
              </div>
            )}
            <AnimatePresence initial={false}>
              {transcript.map((entry, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-xl border text-sm leading-relaxed ${
                    entry.role === "ai"
                      ? "bg-white/5 border-white/10"
                      : "bg-primary/10 border-primary/30 ml-4"
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-[10px] font-bold font-display tracking-wider ${entry.role === "ai" ? "text-primary" : "text-white"}`}>
                      {entry.role === "ai" ? "ARIA" : "YOU"}
                    </p>
                    {entry.role === "user" && (entry.wordCount ?? 0) >= 15 && (
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" title="Strong response" />
                    )}
                  </div>
                  <p className="text-gray-300">{entry.text}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {flags.length > 0 && (
            <div className="border-t border-red-500/20 p-4 bg-red-500/5">
              <p className="text-[11px] text-red-400 font-bold uppercase tracking-widest flex items-center gap-1 mb-2">
                <Shield className="w-3 h-3" /> Proctor Flags ({flags.length})
              </p>
              {flags.slice(-3).map((f, i) => (
                <p key={i} className="text-[11px] text-red-300/70">{f.desc}</p>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ─── Controls ─── */}
      <footer className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-3 bg-black/80 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <button onClick={toggleMic} disabled={!launched}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-30 ${
              isMicOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500/20 text-red-400 border border-red-500/40"
            }`}>
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            <span className="text-[9px] uppercase tracking-wide font-bold opacity-60">{isMicOn ? "Mute" : "Unmuted"}</span>
          </button>

          <button onClick={toggleCam} disabled={!launched}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-30 ${
              isCamOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500/20 text-red-400 border border-red-500/40"
            }`}>
            {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            <span className="text-[9px] uppercase tracking-wide font-bold opacity-60">{isCamOn ? "Cam On" : "Cam Off"}</span>
          </button>

          <div className="w-px h-10 bg-white/10 mx-1" />

          <button onClick={handleEnd} disabled={!launched || updateMutation.isPending || evaluateMutation.isPending}
            className="px-8 h-14 rounded-xl flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold tracking-widest uppercase transition-colors disabled:opacity-50 text-sm">
            <PhoneOff className="w-4 h-4" />
            {updateMutation.isPending || evaluateMutation.isPending ? "Saving..." : "End & Evaluate"}
          </button>
        </div>
      </footer>
    </div>
  );
}
