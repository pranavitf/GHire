import { useEffect, useRef, useState, useCallback } from "react";

export type TranscriptEntry = { role: "ai" | "user"; text: string; ts: number };
export type ConnectionStatus = "idle" | "connecting" | "connected" | "error" | "disconnected";

interface GeminiLiveOptions {
  systemInstruction: string;
  onTranscript?: (entry: TranscriptEntry) => void;
  onSpeakingChange?: (speaking: boolean) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onProctorFlag?: (type: string, description: string) => void;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_LIVE_MODEL = "gemini-2.0-flash-live-001";
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

export function useGeminiLive(options: GeminiLiveOptions) {
  const { systemInstruction, onTranscript, onSpeakingChange, onStatusChange, onProctorFlag } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const outputQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const gazeAwayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCamOn, setIsCamOn] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const updateStatus = useCallback((s: ConnectionStatus) => {
    setStatus(s);
    onStatusChange?.(s);
  }, [onStatusChange]);

  const addTranscript = useCallback((role: "ai" | "user", text: string) => {
    const entry: TranscriptEntry = { role, text, ts: Date.now() };
    setTranscript(prev => [...prev, entry]);
    onTranscript?.(entry);
  }, [onTranscript]);

  // Convert Int16Array PCM to base64
  const pcmToBase64 = (pcm: Int16Array): string => {
    const bytes = new Uint8Array(pcm.buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Play audio queue sequentially
  const playNextChunk = useCallback(async () => {
    if (isPlayingRef.current || outputQueueRef.current.length === 0) return;
    isPlayingRef.current = true;
    onSpeakingChange?.(true);
    setIsSpeaking(true);

    const ctx = audioContextRef.current;
    if (!ctx) { isPlayingRef.current = false; return; }

    while (outputQueueRef.current.length > 0) {
      const chunk = outputQueueRef.current.shift()!;
      const float32 = new Float32Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        float32[i] = chunk[i] / 32768.0;
      }
      const buffer = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
      buffer.copyToChannel(float32, 0);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      await new Promise<void>(resolve => {
        source.onended = () => resolve();
        source.start();
      });
    }

    isPlayingRef.current = false;
    setIsSpeaking(false);
    onSpeakingChange?.(false);
  }, [onSpeakingChange]);

  // Send a frame from webcam for proctoring
  const sendVideoFrame = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) return;

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    ctx2d.drawImage(video, 0, 0, 320, 240);
    const jpeg = canvas.toDataURL("image/jpeg", 0.7);
    const b64 = jpeg.split(",")[1];

    const msg = {
      realtimeInput: {
        mediaChunks: [{ mimeType: "image/jpeg", data: b64 }]
      }
    };
    wsRef.current.send(JSON.stringify(msg));
  }, []);

  // Connect to Gemini Live
  const connect = useCallback(async () => {
    if (!GEMINI_API_KEY) {
      console.error("No GEMINI_API_KEY set");
      updateStatus("error");
      return;
    }

    updateStatus("connecting");

    // Set up AudioContext
    audioContextRef.current = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send setup message
      const setup = {
        setup: {
          model: `models/${GEMINI_LIVE_MODEL}`,
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Aoede" }
              }
            }
          },
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          }
        }
      };
      ws.send(JSON.stringify(setup));
    };

    ws.onmessage = async (event) => {
      let data: Record<string, unknown>;
      if (event.data instanceof Blob) {
        const text = await event.data.text();
        try { data = JSON.parse(text); } catch { return; }
      } else {
        try { data = JSON.parse(event.data); } catch { return; }
      }

      // Setup complete
      if ((data as {setupComplete?: unknown}).setupComplete !== undefined) {
        updateStatus("connected");
        startMic();
        return;
      }

      // Handle server content
      const sc = (data as {serverContent?: Record<string, unknown>}).serverContent;
      if (!sc) return;

      // Turn complete
      if (sc.turnComplete) {
        playNextChunk();
        return;
      }

      const modelTurn = sc.modelTurn as {parts?: Array<{inlineData?: {mimeType?: string; data?: string}; text?: string}>} | undefined;
      if (!modelTurn?.parts) return;

      for (const part of modelTurn.parts) {
        // Audio chunk
        if (part.inlineData?.mimeType?.startsWith("audio/pcm") && part.inlineData.data) {
          const raw = atob(part.inlineData.data);
          const buf = new Int16Array(raw.length / 2);
          for (let i = 0; i < buf.length; i++) {
            buf[i] = (raw.charCodeAt(i * 2)) | (raw.charCodeAt(i * 2 + 1) << 8);
          }
          outputQueueRef.current.push(buf);
          if (!isPlayingRef.current) playNextChunk();
        }
        // Text / transcript
        if (part.text) {
          addTranscript("ai", part.text);
          // Proctor: check if AI is flagging looking away
          if (part.text.toLowerCase().includes("looking") || part.text.toLowerCase().includes("distract")) {
            onProctorFlag?.("gaze_away", "AI detected possible distraction");
          }
        }
      }
    };

    ws.onerror = (e) => {
      console.error("Gemini WS error", e);
      updateStatus("error");
    };

    ws.onclose = () => {
      updateStatus("disconnected");
      setIsSpeaking(false);
    };
  }, [systemInstruction, updateStatus, addTranscript, playNextChunk, onProctorFlag, sendVideoFrame]);

  // Start microphone
  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;
      setIsMicOn(true);

      const ctx = audioContextRef.current!;
      const source = ctx.createMediaStreamSource(stream);
      // ScriptProcessor for raw PCM (works cross-browser)
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      inputProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const float32 = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
        }
        const b64 = pcmToBase64(int16);
        wsRef.current.send(JSON.stringify({
          realtimeInput: {
            mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: b64 }]
          }
        }));
      };

      source.connect(processor);
      processor.connect(ctx.destination);
    } catch (err) {
      console.error("Mic error:", err);
    }
  }, []);

  // Start webcam
  const startCam = useCallback(async (videoEl: HTMLVideoElement) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
      camStreamRef.current = stream;
      videoEl.srcObject = stream;
      videoRef.current = videoEl;
      setIsCamOn(true);

      // Send frames every 2 seconds for proctoring
      frameIntervalRef.current = setInterval(() => {
        sendVideoFrame();
      }, 2000);

      // Gaze detection: simple proxy — if video track becomes muted/inactive
      stream.getVideoTracks()[0].addEventListener("mute", () => {
        gazeAwayTimerRef.current = setTimeout(() => {
          onProctorFlag?.("gaze_away", "Camera signal lost — possible gaze diversion");
        }, 3000);
      });
      stream.getVideoTracks()[0].addEventListener("unmute", () => {
        if (gazeAwayTimerRef.current) clearTimeout(gazeAwayTimerRef.current);
      });
    } catch (err) {
      console.error("Camera error:", err);
    }
  }, [sendVideoFrame, onProctorFlag]);

  const stopCam = useCallback(() => {
    camStreamRef.current?.getTracks().forEach(t => t.stop());
    camStreamRef.current = null;
    videoRef.current = null;
    setIsCamOn(false);
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
  }, []);

  const toggleMic = useCallback(() => {
    if (!micStreamRef.current) return;
    micStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMicOn(prev => !prev);
  }, []);

  // Send text message (for barge-in / testing)
  const sendText = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    addTranscript("user", text);
    wsRef.current.send(JSON.stringify({
      clientContent: {
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true
      }
    }));
  }, [addTranscript]);

  // Disconnect
  const disconnect = useCallback(() => {
    inputProcessorRef.current?.disconnect();
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    stopCam();
    wsRef.current?.close();
    audioContextRef.current?.close();
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    updateStatus("disconnected");
  }, [stopCam, updateStatus]);

  useEffect(() => {
    return () => { disconnect(); };
  }, []);

  return {
    connect,
    disconnect,
    startCam,
    stopCam,
    toggleMic,
    sendText,
    status,
    isMicOn,
    isCamOn,
    isSpeaking,
    transcript,
  };
}
