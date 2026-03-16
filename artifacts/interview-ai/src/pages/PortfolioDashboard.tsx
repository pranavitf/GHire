import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { GlowingCard } from "@/components/GlowingCard";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { Trophy, ShieldCheck, ChevronRight, Share2, Award, Target, Activity } from "lucide-react";
import { useState } from "react";

const MOCK_SESSIONS = [
  { id: "s1", jobTitle: "Senior Software Engineer", industry: "Technology", score: 88, date: "2026-03-14", verified: true, difficulty: "senior" },
  { id: "s2", jobTitle: "Product Manager", industry: "Technology", score: 76, date: "2026-03-12", verified: true, difficulty: "mid" },
  { id: "s3", jobTitle: "Data Scientist", industry: "Technology", score: 92, date: "2026-03-10", verified: false, difficulty: "senior" },
  { id: "s4", jobTitle: "DevOps Engineer", industry: "Technology", score: 71, date: "2026-03-08", verified: true, difficulty: "entry" },
];

const MOCK_WEAKNESSES = [
  "Practice structuring answers using the STAR method for behavioral questions.",
  "Deepen knowledge of system design patterns — particularly distributed caching and message queues.",
  "Work on reducing filler words ('um', 'like') during high-pressure scenarios.",
  "Prepare concrete metrics and impact data for past project accomplishments.",
];

export default function PortfolioDashboard() {
  const [shareHover, setShareHover] = useState<string | null>(null);
  const avgScore = Math.round(MOCK_SESSIONS.reduce((a, s) => a + s.score, 0) / MOCK_SESSIONS.length);
  const verifiedCount = MOCK_SESSIONS.filter(s => s.verified).length;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-white/10 pb-8 mb-8">
          <div>
            <h1 className="text-4xl font-black text-glow-cyan mb-2">CANDIDATE HUB</h1>
            <p className="text-muted-foreground uppercase tracking-widest text-sm font-semibold">Your performance portfolio & verified credentials</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-3xl font-display font-black text-primary">{avgScore}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Avg Score</div>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-right">
              <div className="text-3xl font-display font-black text-green-400">{verifiedCount}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Verified</div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" /> Past Interview Scores
            </h2>

            {MOCK_SESSIONS.map((sess, i) => (
              <motion.div key={sess.id}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <GlowingCard className="p-5 flex items-center gap-6" glowColor={sess.score >= 85 ? "cyan" : "purple"}>
                  <div className={`text-3xl font-display font-black ${sess.score >= 85 ? "text-green-400" : sess.score >= 70 ? "text-primary" : "text-yellow-400"}`}>
                    {sess.score}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{sess.jobTitle}</h3>
                      {sess.verified && <ShieldCheck className="w-4 h-4 text-green-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{sess.industry} · {sess.difficulty} · {sess.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="relative"
                      onMouseEnter={() => setShareHover(sess.id)}
                      onMouseLeave={() => setShareHover(null)}
                    >
                      <button className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-all">
                        <Share2 className="w-4 h-4 text-white/60" />
                      </button>
                      {shareHover === sess.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                          className="absolute top-full mt-2 right-0 bg-[#0d1117] border border-white/10 rounded-xl p-4 w-64 z-50 shadow-2xl"
                        >
                          <div className="bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/10 rounded-lg p-4 text-center">
                            <p className="font-bold text-white text-sm">{sess.jobTitle}</p>
                            <p className="text-3xl font-display font-black text-primary my-1">{sess.score}/100</p>
                            <div className="flex items-center justify-center gap-1 text-[10px] text-green-400 uppercase tracking-widest">
                              <ShieldCheck className="w-3 h-3" /> Anti-Cheat Verified
                            </div>
                            <p className="text-[9px] text-white/30 mt-2 uppercase tracking-widest">GHire Proof of Work</p>
                          </div>
                          <p className="text-[10px] text-white/40 text-center mt-2">Optimized for LinkedIn sharing</p>
                        </motion.div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  </div>
                </GlowingCard>
              </motion.div>
            ))}
          </div>

          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <GlowingCard className="p-6" glowColor="purple">
                <h3 className="font-bold text-sm text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4" /> Weaknesses to Improve
                </h3>
                <div className="space-y-4">
                  {MOCK_WEAKNESSES.map((w, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-secondary">{i + 1}</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">{w}</p>
                    </div>
                  ))}
                </div>
              </GlowingCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-white/10 rounded-xl p-6 text-center">
                <Award className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-bold text-white text-lg mb-1">Share Proof of Work</h3>
                <p className="text-xs text-muted-foreground mb-4">Export a verified card for LinkedIn or your personal portfolio</p>
                <div className="bg-black/60 border border-primary/30 rounded-xl p-5">
                  <p className="font-bold text-white">Guest Candidate</p>
                  <p className="text-xs text-muted-foreground">Senior Software Engineer</p>
                  <p className="text-4xl font-display font-black text-primary my-2">{avgScore}/100</p>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-green-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="font-bold uppercase tracking-widest">Anti-Cheat Verified</span>
                  </div>
                  <p className="text-[9px] text-white/20 mt-3 uppercase tracking-widest">GHire · The Universal Hiring Network</p>
                </div>
              </div>
            </motion.div>

            <Link href="/hub"
              className="block w-full text-center py-4 rounded-xl border border-primary/40 text-primary font-bold uppercase tracking-widest text-sm hover:bg-primary/10 transition-colors">
              + New Simulation
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
