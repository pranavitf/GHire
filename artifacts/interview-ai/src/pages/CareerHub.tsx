import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useDropzone } from "react-dropzone";
import { Layout } from "@/components/Layout";
import { GlowingCard } from "@/components/GlowingCard";
import { UploadCloud, FileText, CheckCircle2, Loader2, Play, Clock, X } from "lucide-react";
import { useParseResume, useCreateSession } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import type { CandidateContext } from "@workspace/api-client-react/src/generated/api.schemas";
import { motion, AnimatePresence } from "framer-motion";

export default function CareerHub() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [candidateData, setCandidateData] = useState<CandidateContext | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  const parseMutation = useParseResume();
  const createMutation = useCreateSession();

  const [formData, setFormData] = useState({
    industry: "Tech",
    jobTitle: "",
    difficulty: "mid" as "entry" | "mid" | "senior" | "executive",
    sceneEnvironment: "tech" as "boardroom" | "hospital" | "studio" | "tech" | "legal" | "finance",
    durationMinutes: 5,
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      
      parseMutation.mutate({ data: { pdfBase64: base64, fileName: file.name } }, {
        onSuccess: (data) => {
          setCandidateData(data);
          setFormData(prev => ({
            ...prev,
            industry: data.industryField || "Tech",
            jobTitle: data.targetRoles?.[0] || "Software Engineer"
          }));
          setStep(2);
          toast({ title: "Resume parsed successfully", description: "AI Context configured." });
        },
        onError: () => {
          toast({ title: "Parsing failed", description: "Could not read PDF.", variant: "destructive" });
        }
      });
    };
    reader.readAsDataURL(file);
  }, [parseMutation, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1
  });

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleStartArena = () => {
    createMutation.mutate({
      data: {
        userId: "user_123",
        userName: candidateData?.name || "Guest Candidate",
        industry: formData.industry,
        jobTitle: formData.jobTitle,
        difficulty: formData.difficulty,
        sceneEnvironment: formData.sceneEnvironment,
        candidateContextId: candidateData?.id
      }
    }, {
      onSuccess: (session) => {
        setShowModal(false);
        setLocation(`/interview/${session.id}?duration=${formData.durationMinutes}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to initialize engine.", variant: "destructive" });
      }
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-black mb-2 text-glow-cyan">CAREER HUB</h1>
        <p className="text-muted-foreground mb-12 uppercase tracking-widest text-sm font-semibold">Prepare your interview session</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-display border ${step >= 1 ? 'border-primary bg-primary/20 text-primary box-glow-cyan' : 'border-muted text-muted'}`}>1</div>
              <h2 className="text-xl text-white">Neural Grounding</h2>
            </div>
            
            <GlowingCard className="p-1">
              {!candidateData ? (
                <div 
                  {...getRootProps()} 
                  className={`p-12 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                  }`}
                >
                  <input {...getInputProps()} />
                  {parseMutation.isPending ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                      <p className="text-lg text-white font-medium">Gemini is extracting context...</p>
                      <p className="text-sm text-muted-foreground mt-2">Parsing semantic history</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <UploadCloud className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-lg text-white font-medium mb-2">Drop your Resume PDF here</p>
                      <p className="text-sm text-muted-foreground">or click to browse local files</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-lg text-white font-bold">{candidateData.name}</h3>
                      <p className="text-sm text-muted-foreground">{candidateData.skills.length} skills indexed</p>
                    </div>
                    <button 
                      onClick={() => { setCandidateData(null); setStep(1); }}
                      className="ml-auto text-xs text-primary hover:underline uppercase tracking-wider"
                    >
                      Reset
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Extracted Experience</h4>
                      {candidateData.experience?.slice(0, 2).map((exp, i) => (
                        <div key={i} className="flex gap-3 mb-2 items-start">
                          <FileText className="w-4 h-4 text-primary shrink-0 mt-1" />
                          <div>
                            <p className="text-sm text-white font-medium">{exp.role}</p>
                            <p className="text-xs text-muted-foreground">{exp.company}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </GlowingCard>
          </div>

          <div className={`space-y-6 transition-opacity duration-500 ${step === 2 ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-display border ${step === 2 ? 'border-secondary bg-secondary/20 text-secondary' : 'border-muted text-muted'}`}>2</div>
              <h2 className="text-xl text-white">Interview Parameters</h2>
            </div>
            
            <GlowingCard glowColor="purple" className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Target Job Title</label>
                  <input 
                    type="text" 
                    value={formData.jobTitle}
                    onChange={e => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 transition-all"
                    placeholder="e.g. Senior Frontend Engineer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Industry Sector</label>
                    <select 
                      value={formData.industry}
                      onChange={e => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-secondary transition-all appearance-none"
                    >
                      <option value="Tech">Technology</option>
                      <option value="Nursing">Nursing</option>
                      <option value="Finance">Finance</option>
                      <option value="Legal">Legal</option>
                      <option value="Sales">Sales</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">3D Environment</label>
                    <select 
                      value={formData.sceneEnvironment}
                      onChange={e => setFormData(prev => ({ ...prev, sceneEnvironment: e.target.value as typeof formData.sceneEnvironment }))}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-secondary transition-all appearance-none"
                    >
                      <option value="tech">Tech Office</option>
                      <option value="boardroom">Boardroom</option>
                      <option value="hospital">Hospital Room</option>
                      <option value="studio">Creative Studio</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-3">Difficulty Level</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["entry", "mid", "senior", "executive"] as const).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setFormData(prev => ({ ...prev, difficulty: lvl }))}
                        className={`py-2 text-xs font-bold uppercase tracking-wider rounded-md border transition-all ${
                          formData.difficulty === lvl 
                            ? 'border-secondary bg-secondary/20 text-secondary' 
                            : 'border-white/10 text-muted-foreground hover:border-white/30 hover:bg-white/5'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 mt-6">
                  <button
                    onClick={handleOpenModal}
                    disabled={!formData.jobTitle}
                    className="w-full relative group px-6 py-4 rounded-xl font-bold uppercase tracking-widest bg-secondary text-white overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <span className="relative flex items-center justify-center gap-2">
                      <Play className="w-5 h-5 fill-current" />
                      Start Interview
                    </span>
                  </button>
                </div>
              </div>
            </GlowingCard>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0a0e1a] border border-white/10 rounded-2xl p-8 max-w-md w-full relative"
            >
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest">Interview Settings</h2>
                <p className="text-sm text-muted-foreground mt-2">{formData.jobTitle} · {formData.industry}</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-3">Profession / Role</label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={e => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs uppercase tracking-widest text-muted-foreground">Duration</label>
                    <span className="text-primary font-bold font-display text-lg">{formData.durationMinutes} min</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={15}
                    value={formData.durationMinutes}
                    onChange={e => setFormData(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-white/30 mt-1">
                    <span>2 min</span>
                    <span>15 min</span>
                  </div>
                </div>

                {formData.durationMinutes >= 5 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
                    <span className="text-yellow-400 text-sm mt-0.5">⚡</span>
                    <p className="text-xs text-yellow-300/80">
                      Curveball mode active — a high-stress scenario will be injected at the halfway mark to test your adaptability.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleStartArena}
                  disabled={createMutation.isPending}
                  className="w-full py-4 rounded-xl font-bold uppercase tracking-widest bg-gradient-to-r from-primary to-secondary text-white text-lg disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Initializing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Play className="w-5 h-5 fill-current" />
                      Begin Interview
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
