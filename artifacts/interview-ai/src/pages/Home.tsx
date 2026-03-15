import { Link } from "wouter";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Zap, Play, Target, Shield, Cpu } from "lucide-react";
import { GlowingCard } from "@/components/GlowingCard";

export default function Home() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden flex-1 flex flex-col justify-center">
        {/* Abstract Background Element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-50" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/50 bg-primary/10 text-primary mb-8 text-sm font-bold tracking-widest uppercase"
            >
              <Zap className="w-4 h-4" />
              Gemini Live Engine
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-black mb-6 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-primary/80 to-secondary"
            >
              THE UNIVERSAL<br />CAREER SIMULATION
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto font-medium"
            >
              Enter the immersive 3D interview room. Face our multimodal AI proctor. 
              Prove your skills in high-stakes simulations across Nursing, Tech, Finance, and Law.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6"
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
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-black/40 border-t border-white/5 relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <GlowingCard delay={0.4} className="p-8">
              <Cpu className="w-12 h-12 text-primary mb-6" />
              <h3 className="text-xl mb-3 text-white">Multimodal Engine</h3>
              <p className="text-muted-foreground leading-relaxed">
                Powered by Gemini Live. Sub-second latency, bidirectional streaming voice, and perfect viseme lip-sync mapping in 3D space.
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
              <h3 className="text-xl mb-3 text-white">Resume Grounding</h3>
              <p className="text-muted-foreground leading-relaxed">
                Upload your PDF. The AI contextually adapts the entire interview difficulty and scenario based on your precise career history.
              </p>
            </GlowingCard>
          </div>
        </div>
      </section>
    </Layout>
  );
}
