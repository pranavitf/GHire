import { useParams, Link } from "wouter";
import { Layout } from "@/components/Layout";
import { useGetPortfolio } from "@workspace/api-client-react";
import { ShieldCheck, Target, CheckCircle2, ChevronRight, Activity, Share2 } from "lucide-react";
import { GlowingCard } from "@/components/GlowingCard";

export default function Portfolio() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data: portfolio, isLoading } = useGetPortfolio(sessionId || "");

  if (isLoading) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center h-full">
          <Activity className="w-16 h-16 text-primary animate-pulse mb-6" />
          <h2 className="text-2xl font-display font-bold text-glow-cyan uppercase tracking-widest">Generating Neural Report</h2>
          <p className="text-muted-foreground mt-2">Compiling performance metrics and proctor logs...</p>
        </div>
      </Layout>
    );
  }

  if (!portfolio) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <GlowingCard glowColor="red" className="p-8 max-w-md">
            <h2 className="text-xl font-bold text-destructive mb-2">Report Not Found</h2>
            <p className="text-muted-foreground mb-6">The evaluation for this session is unavailable or still processing.</p>
            <Link href="/hub" className="text-primary hover:underline">Return to Hub</Link>
          </GlowingCard>
        </div>
      </Layout>
    );
  }

  const { evaluation } = portfolio;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-white/10 pb-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-black text-white uppercase">{portfolio.jobTitle}</h1>
              {portfolio.verifiedBadge && (
                <div className="bg-green-500/10 border border-green-500 text-green-500 px-3 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Verified Clean</span>
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-lg">{portfolio.industry} Simulation • {new Date(portfolio.completedAt).toLocaleDateString()}</p>
          </div>
          
          <button className="px-6 py-3 rounded-lg border border-white/20 hover:border-primary hover:bg-primary/10 text-white flex items-center gap-2 transition-all uppercase tracking-widest text-sm font-bold">
            <Share2 className="w-4 h-4" /> Share Portfolio
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            <GlowingCard className="p-8" glowColor="cyan">
              <h2 className="font-display font-bold text-xl text-primary mb-6 uppercase tracking-widest">AI Verdict</h2>
              <p className="text-lg text-gray-200 leading-relaxed bg-white/5 p-6 rounded-xl border border-white/10">
                "{evaluation.verdict}"
              </p>
            </GlowingCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                <h3 className="font-bold text-lg text-white mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" /> Key Strengths
                </h3>
                <ul className="space-y-4">
                  {evaluation.strengths?.map((str, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-300">
                      <ChevronRight className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      {str}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                <h3 className="font-bold text-lg text-white mb-6 flex items-center gap-2">
                  <Target className="w-5 h-5 text-secondary" /> Areas to Improve
                </h3>
                <ul className="space-y-4">
                  {evaluation.improvements?.map((imp, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-300">
                      <ChevronRight className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                      {imp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column (Metrics) */}
          <div className="space-y-8">
            <GlowingCard className="p-8 flex flex-col items-center text-center bg-gradient-to-b from-primary/10 to-transparent">
              <h3 className="font-display font-bold text-sm text-muted-foreground uppercase tracking-widest mb-6">Overall Score</h3>
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="88" className="stroke-white/10" strokeWidth="8" fill="none" />
                  <circle 
                    cx="96" cy="96" r="88" 
                    className="stroke-primary drop-shadow-[0_0_10px_rgba(0,240,255,1)]" 
                    strokeWidth="8" fill="none" 
                    strokeDasharray={2 * Math.PI * 88}
                    strokeDashoffset={2 * Math.PI * 88 * (1 - evaluation.overallScore / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-6xl font-black font-display text-white">{evaluation.overallScore}</div>
              </div>
            </GlowingCard>

            <div className="bg-black/40 border border-white/10 rounded-xl p-6">
              <h3 className="font-bold text-sm text-white mb-6 uppercase tracking-widest">Category Breakdown</h3>
              <div className="space-y-5">
                {Object.entries(evaluation.categoryScores || {}).map(([key, score]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-bold text-white">{score}/100</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-secondary to-primary rounded-full"
                        style={{ width: `${score}%` }}
                      />
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
