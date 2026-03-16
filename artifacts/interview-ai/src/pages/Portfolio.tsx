import { useParams, Link } from "wouter";
import { Layout } from "@/components/Layout";
import { useGetPortfolio } from "@workspace/api-client-react";
import {
  ShieldCheck, Target, CheckCircle2, ChevronRight,
  Activity, Share2, Star, Zap, TrendingUp, Award
} from "lucide-react";
import { GlowingCard } from "@/components/GlowingCard";
import { motion } from "framer-motion";

export default function Portfolio() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data: portfolio, isLoading } = useGetPortfolio(sessionId || "");

  if (isLoading) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center h-full py-32">
          <Activity className="w-16 h-16 text-primary animate-pulse mb-6" />
          <h2 className="text-2xl font-display font-bold text-glow-cyan uppercase tracking-widest">Generating Neural Report</h2>
          <p className="text-muted-foreground mt-2">Compiling performance metrics and proctor analysis...</p>
        </div>
      </Layout>
    );
  }

  if (!portfolio) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center p-4 text-center py-32">
          <GlowingCard glowColor="red" className="p-8 max-w-md">
            <h2 className="text-xl font-bold text-destructive mb-2">Report Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The evaluation for this session is still processing or unavailable.
              This can happen if the interview ended before any responses were captured.
            </p>
            <Link href="/hub" className="text-primary hover:underline uppercase tracking-widest text-sm font-bold">
              → Start New Interview
            </Link>
          </GlowingCard>
        </div>
      </Layout>
    );
  }

  const { evaluation } = portfolio;
  const score = evaluation.overallScore ?? 0;
  const bestMoments: string[] = (evaluation as unknown as { bestMoments?: string[] }).bestMoments ?? [];

  const scoreColor = score >= 80 ? "text-green-400" : score >= 60 ? "text-primary" : "text-yellow-400";
  const scoreGlow  = score >= 80 ? "rgba(74,222,128,1)" : score >= 60 ? "rgba(0,240,255,1)" : "rgba(251,191,36,1)";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">

        {/* ─── Header ─── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-white/10 pb-8 mb-8">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-4xl font-black text-white uppercase">{portfolio.jobTitle}</h1>
              {portfolio.verifiedBadge && (
                <div className="bg-green-500/10 border border-green-500 text-green-500 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Verified Clean</span>
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-lg">{portfolio.industry} Interview · {new Date(portfolio.completedAt).toLocaleDateString("en-US", { dateStyle: "long" })}</p>
          </div>
          <button className="px-6 py-3 rounded-lg border border-white/20 hover:border-primary hover:bg-primary/10 text-white flex items-center gap-2 transition-all uppercase tracking-widest text-sm font-bold">
            <Share2 className="w-4 h-4" /> Share Portfolio
          </button>
        </motion.div>

        {/* ─── Main Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ─── Left 2/3 ─── */}
          <div className="lg:col-span-2 space-y-8">

            {/* AI Verdict */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <GlowingCard className="p-8" glowColor="cyan">
                <h2 className="font-display font-bold text-xl text-primary mb-4 uppercase tracking-widest flex items-center gap-2">
                  <Award className="w-5 h-5" /> Performance Verdict
                </h2>
                <p className="text-lg text-gray-200 leading-relaxed bg-white/5 p-6 rounded-xl border border-white/10 italic">
                  "{evaluation.verdict || "No assessment available."}"
                </p>
              </GlowingCard>
            </motion.div>

            {/* ─── Peak Performance Moments ─── */}
            {bestMoments.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <GlowingCard className="p-8" glowColor="purple">
                  <h2 className="font-display font-bold text-xl text-secondary mb-6 uppercase tracking-widest flex items-center gap-2">
                    <Zap className="w-5 h-5" /> Peak Performance Moments
                  </h2>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-5">
                    Your strongest responses from this interview — moments where you shone brightest
                  </p>
                  <div className="space-y-4">
                    {bestMoments.map((moment, i) => (
                      <motion.div key={i}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="flex gap-4 p-4 rounded-xl border border-secondary/20 bg-secondary/5">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                          <Star className="w-4 h-4 text-secondary fill-secondary" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Moment #{i + 1}</p>
                          <p className="text-sm text-gray-200 leading-relaxed">"{moment}"</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </GlowingCard>
              </motion.div>
            )}

            {/* Strengths + Improvements */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                <h3 className="font-bold text-lg text-white mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" /> Key Strengths
                </h3>
                <ul className="space-y-4">
                  {(evaluation.strengths ?? []).map((str: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-300">
                      <ChevronRight className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{str}</span>
                    </li>
                  ))}
                  {(evaluation.strengths ?? []).length === 0 && (
                    <li className="text-sm text-gray-500">No specific strengths identified.</li>
                  )}
                </ul>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                <h3 className="font-bold text-lg text-white mb-6 flex items-center gap-2">
                  <Target className="w-5 h-5 text-secondary" /> Coaching Improvements
                </h3>
                <ul className="space-y-4">
                  {(evaluation.improvements ?? []).map((imp: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-300">
                      <TrendingUp className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                      <span>{imp}</span>
                    </li>
                  ))}
                  {(evaluation.improvements ?? []).length === 0 && (
                    <li className="text-sm text-gray-500">No specific improvements identified.</li>
                  )}
                </ul>
              </div>
            </motion.div>
          </div>

          {/* ─── Right 1/3 ─── */}
          <div className="space-y-8">

            {/* Score Ring */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, type: "spring" }}>
              <GlowingCard className="p-8 flex flex-col items-center text-center bg-gradient-to-b from-primary/10 to-transparent">
                <h3 className="font-display font-bold text-sm text-muted-foreground uppercase tracking-widest mb-6">Overall Score</h3>
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="88" cy="88" r="80" className="stroke-white/10" strokeWidth="8" fill="none" />
                    <motion.circle
                      cx="88" cy="88" r="80"
                      stroke={scoreGlow}
                      strokeWidth="8" fill="none"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 80}
                      initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 80 * (1 - score / 100) }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                      style={{ filter: `drop-shadow(0 0 8px ${scoreGlow})` }}
                    />
                  </svg>
                  <div>
                    <div className={`text-5xl font-black font-display ${scoreColor}`}>{score}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">/100</div>
                  </div>
                </div>
                <div className={`mt-4 text-sm font-bold uppercase tracking-widest ${scoreColor}`}>
                  {score >= 85 ? "Exceptional" : score >= 70 ? "Strong" : score >= 55 ? "Developing" : "Needs Work"}
                </div>
              </GlowingCard>
            </motion.div>

            {/* Category Breakdown */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="bg-black/40 border border-white/10 rounded-xl p-6">
              <h3 className="font-bold text-sm text-white mb-6 uppercase tracking-widest">Category Breakdown</h3>
              <div className="space-y-5">
                {Object.entries(evaluation.categoryScores ?? {}).map(([key, val], i) => {
                  const s = val as number;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                        <span className="font-bold text-white">{s}/100</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-secondary to-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${s}%` }}
                          transition={{ duration: 0.8, delay: 0.4 + i * 0.1, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(evaluation.categoryScores ?? {}).length === 0 && (
                  <p className="text-sm text-gray-500">Scores not available.</p>
                )}
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Link href="/hub"
                className="block w-full text-center py-4 rounded-xl border border-primary/40 text-primary font-bold uppercase tracking-widest text-sm hover:bg-primary/10 transition-colors">
                → Practice Again
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
