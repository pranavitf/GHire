import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useGetLeaderboard, useGetActivityFeed } from "@workspace/api-client-react";
import { Trophy, ShieldCheck, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlowingCard } from "@/components/GlowingCard";

export default function Leaderboard() {
  const [industryLabel, setIndustryLabel] = useState<string>("All");
  const industries = ["All", "Tech", "Nursing", "Finance", "Legal"];
  const industryMap: Record<string, string> = {
    "Tech": "Technology",
    "Nursing": "Healthcare",
    "Finance": "Finance",
    "Legal": "Legal",
    "All": "All",
  };
  const industry = industryMap[industryLabel] ?? industryLabel;

  const { data: leaderboard, isLoading: loadingBoard } = useGetLeaderboard({ industry: industry === "All" ? undefined : industry });
  const { data: feed, isLoading: loadingFeed } = useGetActivityFeed({ limit: 10 });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-white/10 pb-8">
          <div>
            <h1 className="text-4xl font-black mb-2 text-glow-cyan flex items-center gap-4">
              <Trophy className="w-10 h-10 text-primary" />
              GLOBAL RANKINGS
            </h1>
            <p className="text-muted-foreground uppercase tracking-widest text-sm font-semibold">Compare your neural assessment scores</p>
          </div>
          
          <div className="flex gap-2 mt-6 md:mt-0 bg-black/50 p-1.5 rounded-lg border border-white/10">
            {industries.map(ind => (
              <button
                key={ind}
                onClick={() => setIndustryLabel(ind)}
                className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                  industryLabel === ind ? 'bg-primary text-background' : 'text-muted-foreground hover:text-white hover:bg-white/5'
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Leaderboard */}
          <div className="lg:col-span-2 space-y-4">
            {loadingBoard ? (
              <div className="h-64 flex items-center justify-center"><Activity className="w-8 h-8 text-primary animate-pulse" /></div>
            ) : leaderboard && leaderboard.length > 0 ? (
              <AnimatePresence>
                {leaderboard.map((entry, idx) => (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <GlowingCard className="p-4 flex items-center gap-6" glowColor={idx === 0 ? "cyan" : "purple"}>
                      <div className={`w-12 text-center font-display font-black text-2xl ${idx === 0 ? 'text-primary text-glow-cyan' : 'text-white/50'}`}>
                        #{entry.rank}
                      </div>
                      
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/20 flex items-center justify-center font-bold text-lg">
                        {entry.avatarInitials || entry.userName.substring(0,2).toUpperCase()}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{entry.userName}</h3>
                          {entry.verifiedSessions ? (
                            <ShieldCheck className="w-4 h-4 text-green-500" />
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{entry.industry} • {entry.sessionsCompleted} simulations</p>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-3xl font-display font-black text-white">{entry.averageScore}</div>
                        <div className="text-[10px] text-primary uppercase tracking-widest">Avg Score</div>
                      </div>
                    </GlowingCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
                <p className="text-muted-foreground">No data available for this sector yet.</p>
              </div>
            )}
          </div>

          {/* Side Feed */}
          <div className="lg:col-span-1">
            <div className="bg-black/40 border border-white/10 rounded-xl p-6 h-full">
              <h3 className="font-display font-bold text-lg text-secondary mb-6 flex items-center gap-2 uppercase tracking-widest">
                <Activity className="w-5 h-5" /> Live Feed
              </h3>
              
              <div className="space-y-6">
                {loadingFeed ? (
                  <div className="h-32 flex items-center justify-center"><Activity className="w-6 h-6 text-secondary animate-pulse" /></div>
                ) : feed?.map((item) => (
                  <div key={item.id} className="relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-[-24px] before:w-px before:bg-white/10 last:before:hidden">
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-secondary/20 border border-secondary/50 flex items-center justify-center text-xs">
                      {item.emoji || '🚀'}
                    </div>
                    <div>
                      <p className="text-sm text-gray-300">
                        <span className="font-bold text-white">{item.userName}</span> just scored <span className="text-primary font-bold">{item.score}</span> in {item.industry}!
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{item.achievement}</p>
                      <p className="text-[10px] text-white/40 mt-2 uppercase tracking-wider">{item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
