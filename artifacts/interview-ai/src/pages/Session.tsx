import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Mic, MicOff, Video, VideoOff, PhoneOff, AlertTriangle, Activity, Wifi, WifiOff, Loader2, MessageSquare, Shield, ShieldAlert } from "lucide-react";
import { useGetSession, useUpdateSession, useEvaluateSession, useGetGeminiLiveToken } from "@workspace/api-client-react";
import { useGeminiLive, type TranscriptEntry } from "@/hooks/use-gemini-live";
import { motion, AnimatePresence } from "framer-motion";

export default function Session() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();

  const webcamRef = useRef<HTMLVideoElement>(null);

  const { data: session, isLoading } = useGetSession(sessionId || "");
  const updateMutation = useUpdateSession();
  const evaluateMutation = useEvaluateSession();
  const tokenMutation = useGetGeminiLiveToken();

  const [time, setTime] = useState(0);
  const [proctorFlags, setProctorFlags] = useState<{ type: string; desc: string; ts: number }[]>([]);
  const [lastFlag, setLastFlag] = useState<string | null>(null);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleProctorFlag = useCallback((type: string, description: string) => {
    setProctorFlags(prev => [...prev, { type, desc: description, ts: Date.now() }]);
    setLastFlag(description);
    setTimeout(() => setLastFlag(null), 5000);
  }, []);

  const gemini = useGeminiLive({
    systemInstruction: "",  // will be set after token fetch
    onProctorFlag: handleProctorFlag,
  });

  // Fetch Gemini token then connect
  const [systemInstruction, setSystemInstruction] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!session || connected) return;
    tokenMutation.mutate(
      {
        sessionId: session.id,
        data: {
          industry: session.industry,
          jobTitle: session.jobTitle,
          difficulty: session.difficulty ?? "mid",
          sceneEnvironment: session.sceneEnvironment ?? "boardroom",
          candidateContextId: session.candidateContextId ?? undefined,
        },
      },
      {
        onSuccess: (token) => {
          setSystemInstruction(token.systemInstruction);
        },
      }
    );
  }, [session, connected]);

  // Once we have the system instruction, connect
  const liveRef = useRef<typeof gemini | null>(null);
  liveRef.current = gemini;

  useEffect(() => {
    if (!systemInstruction || connected) return;
    setConnected(true);
    // Re-create the hook with real instruction isn't possible directly;
    // instead we call connect after patching the instruction into the WS setup
    geminiConnectWithInstruction(systemInstruction);
  }, [systemInstruction]);

  // Direct connect with instruction
  const connectGeminiRef = useRef<((si: string) => Promise<void>) | null>(null);
  const [liveStatus, setLiveStatus] = useState<string>("idle");
  const [liveTranscript, setLiveTranscript] = useState<TranscriptEntry[]>([]);
  const [liveSpeaking, setLiveSpeaking] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCamOn, setIsCamOn] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const outputQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

  const pcmToBase64 = (pcm: Int16Array): string => {
    const bytes = new Uint8Array(pcm.buffer);
    let b = "";
    for (let i = 0; i < bytes.byteLength; i++) b += String.fromCharCode(bytes[i]);
    return btoa(b);
  };

  const playNextChunk = useCallback(async () => {
    if (isPlayingRef.current || outputQueueRef.current.length === 0) return;
    isPlayingRef.current = true;
    setLiveSpeaking(true);

    const ctx = audioCtxRef.current;
    if (!ctx) { isPlayingRef.current = false; return; }

    while (outputQueueRef.current.length > 0) {
      const chunk = outputQueueRef.current.shift()!;
      const float32 = new Float32Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) float32[i] = chunk[i] / 32768.0;
      const buf = ctx.createBuffer(1, float32.length, 24000);
      buf.copyToChannel(float32, 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      await new Promise<void>(r => { src.onended = () => r(); src.start(); });
    }

    isPlayingRef.current = false;
    setLiveSpeaking(false);
  }, []);

  const startMic = useCallback(async () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 }, video: false });
      micStreamRef.current = stream;
      setIsMicOn(true);
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const f32 = e.inputBuffer.getChannelData(0);
        const i16 = new Int16Array(f32.length);
        for (let i = 0; i < f32.length; i++) i16[i] = Math.max(-32768, Math.min(32767, f32[i] * 32768));
        wsRef.current.send(JSON.stringify({
          realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: pcmToBase64(i16) }] }
        }));
      };
      source.connect(processor);
      processor.connect(ctx.destination);
    } catch (err) { console.error("Mic error:", err); }
  }, []);

  const startCam = useCallback(async () => {
    if (!webcamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: "user" }, audio: false });
      camStreamRef.current = stream;
      webcamRef.current.srcObject = stream;
      setIsCamOn(true);
      // Send frames every 2s for proctoring
      frameTimerRef.current = setInterval(() => {
        if (!webcamRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const vid = webcamRef.current;
        if (vid.readyState < 2) return;
        const canvas = document.createElement("canvas");
        canvas.width = 320; canvas.height = 240;
        const c2d = canvas.getContext("2d");
        if (!c2d) return;
        c2d.drawImage(vid, 0, 0, 320, 240);
        const b64 = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
        wsRef.current.send(JSON.stringify({
          realtimeInput: { mediaChunks: [{ mimeType: "image/jpeg", data: b64 }] }
        }));
      }, 2000);
    } catch (err) { console.error("Cam error:", err); }
  }, []);

  const geminiConnectWithInstruction = useCallback(async (si: string) => {
    if (!GEMINI_API_KEY) {
      console.error("No VITE_GEMINI_API_KEY");
      setLiveStatus("error");
      return;
    }
    setLiveStatus("connecting");
    audioCtxRef.current = new AudioContext({ sampleRate: 16000 });

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        setup: {
          model: "models/gemini-2.0-flash-live-001",
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } }
          },
          systemInstruction: { parts: [{ text: si }] }
        }
      }));
    };

    ws.onmessage = async (event) => {
      let data: Record<string, unknown>;
      const raw = event.data instanceof Blob ? await event.data.text() : event.data;
      try { data = JSON.parse(raw); } catch { return; }

      if ((data as {setupComplete?: unknown}).setupComplete !== undefined) {
        setLiveStatus("connected");
        await startMic();
        await startCam();
        return;
      }

      const sc = (data as {serverContent?: Record<string, unknown>}).serverContent;
      if (!sc) return;

      if (sc.turnComplete) { playNextChunk(); return; }

      const mt = sc.modelTurn as { parts?: Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }> } | undefined;
      if (!mt?.parts) return;

      for (const part of mt.parts) {
        if (part.inlineData?.mimeType?.startsWith("audio/pcm") && part.inlineData.data) {
          const raw2 = atob(part.inlineData.data);
          const buf = new Int16Array(raw2.length / 2);
          for (let i = 0; i < buf.length; i++) {
            buf[i] = raw2.charCodeAt(i * 2) | (raw2.charCodeAt(i * 2 + 1) << 8);
          }
          outputQueueRef.current.push(buf);
          if (!isPlayingRef.current) playNextChunk();
        }
        if (part.text) {
          setLiveTranscript(prev => [...prev, { role: "ai", text: part.text!, ts: Date.now() }]);
          if (/look|distract|away|note|cheat/i.test(part.text)) {
            handleProctorFlag("gaze_away", "AI flagged: " + part.text.slice(0, 80));
          }
        }
      }
    };

    ws.onerror = (e) => { console.error("WS error", e); setLiveStatus("error"); };
    ws.onclose = () => setLiveStatus("disconnected");
  }, [GEMINI_API_KEY, startMic, startCam, playNextChunk, handleProctorFlag]);

  const toggleMic = useCallback(() => {
    micStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMicOn(prev => !prev);
  }, []);

  const toggleCam = useCallback(() => {
    if (isCamOn) {
      camStreamRef.current?.getTracks().forEach(t => t.stop());
      if (webcamRef.current) webcamRef.current.srcObject = null;
      if (frameTimerRef.current) clearInterval(frameTimerRef.current);
      setIsCamOn(false);
    } else {
      startCam();
    }
  }, [isCamOn, startCam]);

  const handleEndSession = useCallback(() => {
    if (!sessionId) return;
    // Stop everything
    processorRef.current?.disconnect();
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    camStreamRef.current?.getTracks().forEach(t => t.stop());
    wsRef.current?.close();
    if (frameTimerRef.current) clearInterval(frameTimerRef.current);

    // Save transcript + complete
    const apiFlags = proctorFlags.map(f => ({ type: "gaze_away" as const, timestamp: f.ts, description: f.desc, severity: "medium" as const }));
    const apiTranscript = liveTranscript.map(t => ({ role: t.role, content: t.text, timestamp: t.ts }));

    updateMutation.mutate(
      { sessionId, data: { status: "completed", durationSeconds: time, proctorFlags: apiFlags as never, transcript: apiTranscript as never } },
      {
        onSuccess: () => {
          evaluateMutation.mutate({ sessionId }, {
            onSuccess: () => setLocation(`/portfolio/${sessionId}`),
            onError: () => setLocation(`/portfolio/${sessionId}`),
          });
        },
      }
    );
  }, [sessionId, time, proctorFlags, liveTranscript, updateMutation, evaluateMutation, setLocation]);

  useEffect(() => {
    return () => {
      processorRef.current?.disconnect();
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      camStreamRef.current?.getTracks().forEach(t => t.stop());
      wsRef.current?.close();
      audioCtxRef.current?.close();
      if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    };
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const statusColors: Record<string, string> = {
    idle: "text-gray-400",
    connecting: "text-yellow-400",
    connected: "text-green-400",
    error: "text-red-400",
    disconnected: "text-gray-500",
  };

  const statusIcons: Record<string, JSX.Element> = {
    idle: <Loader2 className="w-3 h-3 animate-spin" />,
    connecting: <Loader2 className="w-3 h-3 animate-spin" />,
    connected: <Wifi className="w-3 h-3" />,
    error: <WifiOff className="w-3 h-3" />,
    disconnected: <WifiOff className="w-3 h-3" />,
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

      {/* ─── Top HUD ─── */}
      <header className="absolute top-0 w-full z-50 p-4 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-4 bg-black/70 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-full">
          <div className={`flex items-center gap-1.5 ${statusColors[liveStatus]}`}>
            {statusIcons[liveStatus]}
            <span className="font-mono text-xs font-bold uppercase tracking-widest">{liveStatus}</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <span className="font-mono text-primary font-bold text-sm">{formatTime(time)}</span>
          <div className="w-px h-4 bg-white/20" />
          <span className="text-xs text-gray-400 uppercase tracking-wider">{session.jobTitle} • {session.industry}</span>
        </div>

        <AnimatePresence>
          {lastFlag && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-auto bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 px-4 py-2 rounded-lg backdrop-blur-md flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold">{lastFlag}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {proctorFlags.length > 0 && (
          <div className="pointer-events-auto bg-black/60 border border-red-500/30 px-3 py-2 rounded-lg flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-400 font-bold">{proctorFlags.length} FLAG{proctorFlags.length !== 1 ? "S" : ""}</span>
          </div>
        )}
      </header>

      {/* ─── Main Area ─── */}
      <main className="flex-1 relative flex">

        {/* AI Avatar background */}
        <div className="absolute inset-0 bg-[#02040a]">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(ellipse at 50% 60%, rgba(0,200,255,0.15) 0%, transparent 70%)" }}
          />

          {/* Avatar center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <AnimatePresence>
                {liveSpeaking && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="absolute -inset-24 rounded-full blur-[80px]"
                    style={{ background: "radial-gradient(circle, rgba(0,240,255,0.25) 0%, transparent 70%)" }}
                  />
                )}
              </AnimatePresence>

              <motion.img
                src={`${import.meta.env.BASE_URL}images/avatar-placeholder.png`}
                alt="AI Interviewer"
                animate={{ scale: liveSpeaking ? 1.03 : 1 }}
                transition={{ duration: 0.3 }}
                className="w-80 h-80 object-contain drop-shadow-[0_0_40px_rgba(0,240,255,0.35)]"
              />

              {/* Speaking indicator */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 border border-primary/30 px-4 py-1.5 rounded-full backdrop-blur-sm">
                {liveSpeaking ? (
                  <>
                    <span className="flex gap-0.5">
                      {[0, 1, 2, 3].map(i => (
                        <motion.span
                          key={i}
                          className="w-1 bg-primary rounded-full"
                          animate={{ height: ["4px", "12px", "4px"] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                        />
                      ))}
                    </span>
                    <span className="text-xs text-primary font-display font-bold uppercase tracking-widest">Speaking</span>
                  </>
                ) : liveStatus === "connected" ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-green-400 font-display font-bold uppercase tracking-widest">Listening</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />
                    <span className="text-xs text-yellow-400 font-display font-bold uppercase tracking-widest">Connecting...</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Webcam PiP */}
          <div className="absolute bottom-28 left-6 z-20">
            <div className="relative w-48 h-36 rounded-xl overflow-hidden border border-white/20 bg-gray-900 shadow-2xl">
              <video
                ref={webcamRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${!isCamOn ? "opacity-0" : "opacity-100"}`}
              />
              {!isCamOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
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

        {/* ─── Transcript Sidebar ─── */}
        <div className="relative z-10 w-96 bg-black/70 backdrop-blur-2xl border-l border-white/10 ml-auto flex flex-col">
          <div className="p-5 border-b border-white/10 bg-gradient-to-b from-primary/10 to-transparent">
            <h3 className="font-display font-bold text-base text-primary tracking-widest uppercase flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Live Transcript
            </h3>
            <p className="text-[11px] text-muted-foreground uppercase mt-1">{session.industry} · {session.difficulty} Level</p>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[calc(100vh-220px)]">
            {liveTranscript.length === 0 && (
              <div className="text-center text-gray-600 text-sm py-12">
                {liveStatus === "connecting" ? "Connecting to AI interviewer..." : liveStatus === "connected" ? "AI will speak first..." : "Initializing..."}
              </div>
            )}
            <AnimatePresence initial={false}>
              {liveTranscript.map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-xl border text-sm leading-relaxed ${
                    entry.role === "ai"
                      ? "bg-white/5 border-white/10"
                      : "bg-primary/10 border-primary/30 ml-6"
                  }`}
                >
                  <p className={`text-[10px] font-bold font-display tracking-wider mb-1 ${entry.role === "ai" ? "text-primary" : "text-white"}`}>
                    {entry.role === "ai" ? "AI INTERVIEWER" : "YOU"}
                  </p>
                  <p className="text-gray-300">{entry.text}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Proctor flags in sidebar */}
          {proctorFlags.length > 0 && (
            <div className="border-t border-red-500/20 p-4 bg-red-500/5">
              <p className="text-[11px] text-red-400 font-bold uppercase tracking-widest flex items-center gap-1 mb-2">
                <Shield className="w-3 h-3" /> Proctor Flags ({proctorFlags.length})
              </p>
              <div className="space-y-1">
                {proctorFlags.slice(-3).map((f, i) => (
                  <p key={i} className="text-[11px] text-red-300/70">{f.desc}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─── Bottom Controls ─── */}
      <footer className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-3 bg-black/80 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)]">

          <button
            onClick={toggleMic}
            title={isMicOn ? "Mute microphone" : "Unmute microphone"}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              isMicOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500/20 text-red-400 border border-red-500/40"
            }`}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            <span className="text-[9px] uppercase tracking-wide font-bold opacity-60">{isMicOn ? "Mute" : "Unmuted"}</span>
          </button>

          <button
            onClick={toggleCam}
            title={isCamOn ? "Stop camera" : "Start camera"}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              isCamOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500/20 text-red-400 border border-red-500/40"
            }`}
          >
            {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            <span className="text-[9px] uppercase tracking-wide font-bold opacity-60">{isCamOn ? "Cam On" : "Cam Off"}</span>
          </button>

          <div className="w-px h-10 bg-white/10 mx-1" />

          <button
            onClick={handleEndSession}
            disabled={updateMutation.isPending || evaluateMutation.isPending}
            className="px-8 h-14 rounded-xl flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold tracking-widest uppercase transition-colors disabled:opacity-50 text-sm"
          >
            {updateMutation.isPending || evaluateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating...</>
            ) : (
              <><PhoneOff className="w-4 h-4" /> End &amp; Evaluate</>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
