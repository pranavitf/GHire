import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Zap, Play, Target, Shield, Cpu, Code, Stethoscope, BarChart3, Scale } from "lucide-react";
import { GlowingCard } from "@/components/GlowingCard";
import { useState, useEffect } from "react";

const DEMO_SCENARIOS = [
  { label: "Software Engineer", icon: Code, snippet: "function mergeSort(arr) {\n  if (arr.length <= 1) return arr;\n  const mid = Math.floor(arr.length / 2);\n  return merge(\n    mergeSort(arr.slice(0, mid)),\n    mergeSort(arr.slice(mid))\n  );\n}", color: "text-cyan-400" },
  { label: "Registered Nurse", icon: Stethoscope, snippet: "Patient presents with acute\nchest pain radiating to left arm.\nBP: 180/110 mmHg\nHR: 112 bpm\nO2 Sat: 94%\n\nPriority: STAT ECG\nAdminister: Aspirin 325mg", color: "text-green-400" },
  { label: "Financial Analyst", icon: BarChart3, snippet: "Q4 Revenue: $12.4M (+18% YoY)\nEBITDA Margin: 22.3%\nFCF Yield: 8.1%\nDebt/Equity: 0.45\n\nDCF Target: $84/share\nConsensus: $71/share\nRating: OUTPERFORM", color: "text-yellow-400" },
  { label: "Corporate Attorney", icon: Scale, snippet: "RE: Force Majeure Clause §12.3\n\nThe contractual obligation\nunder Article VII is subject to\nthe impossibility doctrine.\n\nRecommend: Amend indemnity\nprovisions per UCC §2-615.", color: "text-purple-400" },
];

const TICKER_ITEMS = [
  { name: "Sarah M.", score: 94, field: "B2B Sales", badge: true },
  { name: "James K.", score: 88, field: "Emergency Nursing", badge: true },
  { name: "Priya R.", score: 91, field: "Full-Stack Engineering", badge: false },
  { name: "Marcus L.", score: 97, field: "M&A Law", badge: true },
  { name: "Elena V.", score: 85, field: "Data Science", badge: true },
  { name: "David C.", score: 92, field: "ICU Nursing", badge: false },
  { name: "Aisha T.", score: 89, field: "Product Management", badge: true },
  { name: "Ryan P.", score: 96, field: "Quantitative Finance", badge: true },
  { name: "Sophie W.", score: 90, field: "DevOps Engineering", badge: true },
  { name: "Carlos M.", score: 87, field: "Corporate Law", badge: false },
];

export default function Home() {
  const [activeDemo, setActiveDemo] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveDemo(p => (p + 1) % DEMO_SCENARIOS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const demo = DEMO_SCENARIOS[activeDemo];

  return (
    <Layout>
      <section className="relative pt-16 pb-24 overflow-hidden flex-1 flex flex-col justify-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-50" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/50 bg-primary/10 text-primary mb-6 text-sm font-bold tracking-widest uppercase"
              >
                <Zap className="w-4 h-4" />
                Gemini Live Engine
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-5xl md:text-7xl font-black mb-4 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-primary/80 to-secondary"
              >
                GHIRE
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="text-xl md:text-2xl font-bold text-white/70 uppercase tracking-[0.3em] mb-4"
              >
                The Universal Hiring Network
              </motion.p>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto font-medium"
              >
                Enter the immersive AI arena. Face our multimodal proctor. 
                Prove your skills in high-stakes simulations across every industry.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16"
              >
                <Link 
                  href="/hub" 
                  className="group relative px-8 py-4 rounded-xl font-bold uppercase tracking-wider bg-primary text-primary-foreground overflow-hidden w-full sm:w-auto text-center"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="relative flex items-center justify-center gap-2">
                    <Play className="w-5 h-5 fill-current" />
                    Start Simulation
                  </span>
                </Link>
                
                <Link 
                  href="/leaderboard"
                  className="px-8 py-4 rounded-xl font-bold uppercase tracking-wider border-2 border-white/20 text-white hover:border-secondary hover:text-secondary transition-colors w-full sm:w-auto text-center"
                >
                  View Leaderboard
                </Link>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="relative max-w-5xl mx-auto"
            >
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-2xl blur-xl opacity-50" />
              <div className="relative border border-white/10 rounded-2xl overflow-hidden bg-black/80 backdrop-blur-xl">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-[10px] text-white/40 uppercase tracking-widest ml-2">GHire Arena — Live Demo</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-green-400 uppercase tracking-wider font-bold">Live</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 min-h-[320px]">
                  <div className="border-r border-white/10 flex flex-col items-center justify-center p-8 relative">
                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(ellipse at 50% 60%, rgba(0,200,255,0.15) 0%, transparent 70%)" }} />
                    <motion.img
                      src={`${import.meta.env.BASE_URL}images/avatar-placeholder.png`}
                      alt="ARIA"
                      className="w-40 h-40 object-contain drop-shadow-[0_0_30px_rgba(0,240,255,0.35)] relative z-10"
                      animate={{ scale: [1, 1.03, 1] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    />
                    <div className="mt-4 flex items-center gap-2 relative z-10">
                      <span className="flex gap-0.5">
                        {[0,1,2,3].map(i => (
                          <motion.span key={i} className="w-1 bg-primary rounded-full"
                            animate={{ height: ["4px","12px","4px"] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.12 }} />
                        ))}
                      </span>
                      <span className="text-xs text-primary font-display font-bold uppercase tracking-widest">ARIA Speaking</span>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col justify-center relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex gap-1">
                        {DEMO_SCENARIOS.map((s, i) => (
                          <button key={i} onClick={() => setActiveDemo(i)}
                            className={`w-2 h-2 rounded-full transition-all ${i === activeDemo ? "bg-primary scale-125" : "bg-white/20"}`} />
                        ))}
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.div key={activeDemo}
                          initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                          className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${demo.color}`}>
                          <demo.icon className="w-3.5 h-3.5" />
                          {demo.label}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.pre key={activeDemo}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="font-mono text-sm text-gray-300 bg-black/60 rounded-xl p-5 border border-white/10 leading-relaxed whitespace-pre overflow-hidden">
                        {demo.snippet}
                      </motion.pre>
                    </AnimatePresence>
                    <p className="text-[10px] text-white/30 mt-3 uppercase tracking-widest">Vision AI reads the screen in real-time</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/5 bg-black/60 overflow-hidden py-4">
        <div className="flex animate-marquee gap-8 whitespace-nowrap">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <div key={i} className="inline-flex items-center gap-2 text-sm shrink-0">
              <span className="text-yellow-400">🔥</span>
              <span className="font-bold text-white">{item.name}</span>
              <span className="text-muted-foreground">scored</span>
              <span className="text-primary font-bold">{item.score}</span>
              <span className="text-muted-foreground">in</span>
              <span className="text-white/80">{item.field}</span>
              {item.badge && <Shield className="w-3.5 h-3.5 text-green-500" />}
              <span className="text-white/10 mx-2">|</span>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 bg-black/40 border-t border-white/5 relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <GlowingCard delay={0.4} className="p-8">
              <Cpu className="w-12 h-12 text-primary mb-6" />
              <h3 className="text-xl mb-3 text-white">Multimodal Engine</h3>
              <p className="text-muted-foreground leading-relaxed">
                Powered by Gemini Live. Sub-second latency, bidirectional streaming voice, and real-time vision that reads your code and documents.
              </p>
            </GlowingCard>
            
            <GlowingCard delay={0.5} glowColor="purple" className="p-8">
              <Shield className="w-12 h-12 text-secondary mb-6" />
              <h3 className="text-xl mb-3 text-white">Live Proctoring</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our vision agent watches your gaze, detects external voices, and monitors your environment to issue Verified Anti-Cheat badges.
              </p>
            </GlowingCard>
            
            <GlowingCard delay={0.6} glowColor="cyan" className="p-8">
              <Target className="w-12 h-12 text-primary mb-6" />
              <h3 className="text-xl mb-3 text-white">Two-Sided Network</h3>
              <p className="text-muted-foreground leading-relaxed">
                Candidates build verified portfolios. Recruiters discover top talent with anti-cheat proof and AI-generated performance insights.
              </p>
            </GlowingCard>
          </div>
        </div>
      </section>
    </Layout>
  );
}
