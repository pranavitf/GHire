import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Mic, MicOff, Video, VideoOff, PhoneOff, AlertTriangle, Activity } from "lucide-react";
import { useGetSession, useUpdateSession, useEvaluateSession } from "@workspace/api-client-react";
import { useProctoring } from "@/hooks/use-proctoring";
import { GlowingCard } from "@/components/GlowingCard";

export default function Session() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const { isMicActive, isCamActive, isSpeaking, toggleMic, toggleCam } = useProctoring();
  
  const { data: session, isLoading } = useGetSession(sessionId || "");
  const updateMutation = useUpdateSession();
  const evaluateMutation = useEvaluateSession();

  const [time, setTime] = useState(0);
  const [mockFlags, setMockFlags] = useState<{type: string, time: number}[]>([]);

  // Mock Timer
  useEffect(() => {
    const timer = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Mock Proctoring AI random flags
  useEffect(() => {
    const flagTimer = setInterval(() => {
      if (Math.random() > 0.9 && isCamActive) {
        setMockFlags(f => [...f, { type: "Gaze diverted from screen", time }]);
      }
    }, 15000);
    return () => clearInterval(flagTimer);
  }, [isCamActive, time]);

  const handleEndSession = () => {
    if (!sessionId) return;
    
    // 1. Mark session complete
    updateMutation.mutate({
      sessionId,
      data: {
        status: "completed",
        durationSeconds: time
      }
    }, {
      onSuccess: () => {
        // 2. Trigger Evaluation immediately
        evaluateMutation.mutate({ sessionId }, {
          onSuccess: () => {
            setLocation(`/portfolio/${sessionId}`);
          },
          onError: () => {
            // still go to portfolio even if eval fails for robust UX
            setLocation(`/portfolio/${sessionId}`);
          }
        });
      }
    });
  };

  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2, '0')}:${(s%60).toString().padStart(2, '0')}`;

  if (isLoading || !session) return <Layout><div className="flex-1 flex items-center justify-center"><Activity className="w-12 h-12 text-primary animate-pulse" /></div></Layout>;

  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col overflow-hidden">
      {/* Top HUD */}
      <header className="absolute top-0 w-full z-50 p-4 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-4 bg-black/60 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${mockFlags.length > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="font-display font-bold text-sm tracking-widest uppercase">
              Proctoring Status
            </span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <span className="font-mono text-primary font-bold">{formatTime(time)}</span>
        </div>

        {mockFlags.length > 0 && (
          <div className="pointer-events-auto bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 px-4 py-2 rounded-lg backdrop-blur-md animate-in slide-in-from-top flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{mockFlags.length} Warning(s) Logged</span>
          </div>
        )}
      </header>

      {/* Main 3D Viewport Placeholder */}
      <main className="flex-1 relative flex">
        {/* The 3D Engine Frame */}
        <div className="absolute inset-0 bg-[#02040a]">
           {/* Background subtle grid */}
           <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2000&blend=000000&blend-mode=multiply&blend-alpha=80')] bg-cover bg-center opacity-30" />
           <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />
           
           {/* The Avatar */}
           <div className="absolute inset-0 flex items-center justify-center">
             <div className="relative">
               {isSpeaking && (
                  <div className="absolute -inset-20 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
               )}
               <img 
                 src={`${import.meta.env.BASE_URL}images/avatar-placeholder.png`} 
                 alt="AI Avatar" 
                 className={`w-96 h-96 object-contain drop-shadow-[0_0_30px_rgba(0,240,255,0.4)] ${isSpeaking ? 'scale-[1.02]' : 'scale-100'} transition-transform duration-300`}
               />
               <div className="absolute bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/50 border border-primary/30 px-4 py-1 rounded-full backdrop-blur-sm">
                 <span className="text-xs text-primary font-display font-bold uppercase tracking-widest">
                   {isSpeaking ? 'Agent Speaking...' : 'Listening...'}
                 </span>
               </div>
             </div>
           </div>
        </div>

        {/* Right Sidebar - Live Transcript / Context */}
        <div className="relative z-10 w-96 bg-black/60 backdrop-blur-2xl border-l border-white/10 ml-auto flex flex-col h-full right-0">
          <div className="p-6 border-b border-white/10 bg-gradient-to-b from-primary/10 to-transparent">
             <h3 className="font-display font-bold text-lg text-glow-cyan tracking-widest uppercase mb-1">Live Engine</h3>
             <p className="text-xs text-muted-foreground uppercase">{session.industry} • {session.difficulty}</p>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
             {/* Mock Transcript entries */}
             <div className="bg-white/5 p-4 rounded-xl border border-white/10">
               <p className="text-xs text-primary font-bold mb-1 font-display tracking-wider">AI INTERVIEWER</p>
               <p className="text-sm text-gray-300 leading-relaxed">Welcome. I've reviewed your uploaded history. Let's begin the scenario for the {session.jobTitle} position. Are you ready?</p>
             </div>
             
             {time > 5 && (
               <div className="bg-primary/10 p-4 rounded-xl border border-primary/30 ml-8">
                 <p className="text-xs text-white font-bold mb-1 font-display tracking-wider">YOU</p>
                 <p className="text-sm text-gray-200 leading-relaxed">Yes, I'm ready to begin.</p>
               </div>
             )}

             {time > 10 && (
               <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                 <p className="text-xs text-primary font-bold mb-1 font-display tracking-wider">AI INTERVIEWER</p>
                 <p className="text-sm text-gray-300 leading-relaxed">Great. Let's start with a technical scenario...</p>
               </div>
             )}
          </div>
        </div>
      </main>

      {/* Bottom Controls HUD */}
      <footer className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-4 bg-black/80 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <button 
            onClick={toggleMic}
            className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${isMicActive ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-destructive/20 text-destructive border border-destructive/50'}`}
          >
            {isMicActive ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>
          
          <button 
            onClick={toggleCam}
            className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${isCamActive ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-destructive/20 text-destructive border border-destructive/50'}`}
          >
            {isCamActive ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>
          
          <div className="w-px h-8 bg-white/10 mx-2" />

          <button 
            onClick={handleEndSession}
            disabled={updateMutation.isPending || evaluateMutation.isPending}
            className="px-6 h-14 rounded-xl flex items-center justify-center gap-2 bg-destructive hover:bg-destructive/90 text-white font-bold tracking-widest uppercase transition-colors disabled:opacity-50"
          >
            <PhoneOff className="w-5 h-5" />
            End Session
          </button>
        </div>
      </footer>
    </div>
  );
}
