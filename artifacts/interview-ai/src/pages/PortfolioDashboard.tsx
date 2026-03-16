import { Layout } from "@/components/Layout";
import { AuthGate, getAuthUser, logout } from "@/components/AuthGate";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { GlowingCard } from "@/components/GlowingCard";
import { useListSessions } from "@workspace/api-client-react";
import { Trophy, ShieldCheck, ChevronRight, Share2, Award, Target, Activity, LogOut, Copy, Check, Download, ExternalLink } from "lucide-react";
import { useState, useRef, useCallback, useMemo } from "react";

type SessionItem = {
  id: string;
  jobTitle: string;
  industry: string;
  score: number;
  date: string;
  verified: boolean;
  difficulty: string;
};

function ShareMenu({ session, onClose }: { session: SessionItem; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const user = getAuthUser("candidate");

  const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}portfolio/${session.id}`;

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl]);

  const handleExportCard = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 600, 400);
    gradient.addColorStop(0, "#0a0e1a");
    gradient.addColorStop(1, "#1a0e2e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 400);

    ctx.strokeStyle = "rgba(0,200,255,0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 560, 360);

    ctx.fillStyle = "#00c8ff";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("G HIRE · PROOF OF WORK", 40, 60);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(user?.name || "Candidate", 40, 110);

    ctx.fillStyle = "#888888";
    ctx.font = "16px sans-serif";
    ctx.fillText(session.jobTitle, 40, 140);
    ctx.fillText(`${session.industry} · ${session.difficulty}`, 40, 165);

    ctx.fillStyle = session.score >= 85 ? "#4ade80" : session.score >= 70 ? "#00c8ff" : "#fbbf24";
    ctx.font = "bold 72px sans-serif";
    ctx.fillText(`${session.score}`, 40, 270);

    ctx.fillStyle = "#666666";
    ctx.font = "20px sans-serif";
    ctx.fillText("/100", 40 + ctx.measureText(`${session.score}`).width + 8, 270);

    if (session.verified) {
      ctx.fillStyle = "#4ade80";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("✓ ANTI-CHEAT VERIFIED", 40, 310);
    }

    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.font = "10px sans-serif";
    ctx.fillText(`${session.date} · ghire.app`, 40, 360);

    const link = document.createElement("a");
    link.download = `g-hire-${session.jobTitle.replace(/\s+/g, "-").toLowerCase()}-${session.score}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [session, user]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className="absolute top-full mt-2 right-0 bg-[#0d1117] border border-white/10 rounded-xl p-4 w-64 z-50 shadow-2xl"
      onClick={e => e.stopPropagation()}
    >
      <div className="bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/10 rounded-lg p-4 text-center mb-3">
        <p className="font-bold text-white text-sm">{session.jobTitle}</p>
        <p className="text-3xl font-display font-black text-primary my-1">{session.score}/100</p>
        <div className="flex items-center justify-center gap-1 text-[10px] text-green-400 uppercase tracking-widest">
          <ShieldCheck className="w-3 h-3" /> Anti-Cheat Verified
        </div>
        <p className="text-[9px] text-white/30 mt-2 uppercase tracking-widest">G Hire Proof of Work</p>
      </div>
      <div className="space-y-2">
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-white/70 hover:bg-white/5 hover:text-white transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Link Copied!" : "Copy Share Link"}
        </button>
        <button
          onClick={handleExportCard}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-white/70 hover:bg-white/5 hover:text-white transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          Export Card Image
        </button>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-white/70 hover:bg-white/5 hover:text-white transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Share on LinkedIn
        </a>
      </div>
    </motion.div>
  );
}

function DashboardContent() {
  const [, setLocation] = useLocation();
  const [shareOpen, setShareOpen] = useState<string | null>(null);
  const user = getAuthUser("candidate");
  const { data: rawSessions, isLoading: sessionsLoading } = useListSessions(
    { userId: user?.email || "" },
    { query: { enabled: !!user?.email } }
  );

  const sessions: SessionItem[] = useMemo(() => {
    if (!rawSessions) return [];
    return rawSessions
      .filter((s: { status?: string }) => s.status === "completed")
      .map((s: { id: string; jobTitle: string; industry: string; overallScore?: number | null; completedAt?: string | null; proctorFlags?: unknown[]; difficulty?: string | null }) => ({
        id: s.id,
        jobTitle: s.jobTitle,
        industry: s.industry,
        score: Math.round(s.overallScore ?? 0),
        date: s.completedAt ? new Date(s.completedAt).toISOString().slice(0, 10) : "N/A",
        verified: !s.proctorFlags || (s.proctorFlags as unknown[]).length === 0,
        difficulty: s.difficulty ?? "mid",
      }));
  }, [rawSessions]);

  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length)
    : 0;
  const verifiedCount = sessions.filter(s => s.verified).length;

  const handleLogout = () => {
    logout("candidate");
    setLocation("/portfolio");
    window.location.reload();
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-white/10 pb-8 mb-8">
          <div>
            <h1 className="text-4xl font-black text-glow-cyan mb-2">CANDIDATE HUB</h1>
            <p className="text-muted-foreground uppercase tracking-widest text-sm font-semibold">
              {user?.name ? `Welcome back, ${user.name}` : "Your performance portfolio & verified credentials"}
            </p>
          </div>
          <div className="flex items-center gap-4">
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
            <button
              onClick={handleLogout}
              className="ml-2 w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center hover:border-red-500/50 hover:bg-red-500/10 transition-all"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-white/40 hover:text-red-400" />
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" /> Past Interview Scores
            </h2>

            {sessionsLoading && (
              <div className="flex items-center justify-center py-12">
                <Activity className="w-8 h-8 text-primary animate-pulse" />
              </div>
            )}

            {!sessionsLoading && sessions.length === 0 && (
              <GlowingCard className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No completed interviews yet.</p>
                <Link href="/hub" className="text-primary font-bold uppercase tracking-widest text-sm hover:underline">
                  Start Your First Interview →
                </Link>
              </GlowingCard>
            )}

            {sessions.map((sess, i) => (
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
                    <div className="relative">
                      <button
                        onClick={() => setShareOpen(shareOpen === sess.id ? null : sess.id)}
                        className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-all"
                      >
                        <Share2 className="w-4 h-4 text-white/60" />
                      </button>
                      <AnimatePresence>
                        {shareOpen === sess.id && (
                          <ShareMenu session={sess} onClose={() => setShareOpen(null)} />
                        )}
                      </AnimatePresence>
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
                  <Target className="w-4 h-4" /> Tips to Improve
                </h3>
                <div className="space-y-4">
                  {sessions.length === 0 ? (
                    <p className="text-sm text-gray-500">Complete your first interview to get personalized coaching tips.</p>
                  ) : (
                    [
                      "Practice structuring answers using the STAR method for behavioral questions.",
                      "Maintain consistent eye contact with the camera during responses.",
                      "Prepare concrete metrics and impact data for past accomplishments.",
                      "Use the whiteboard effectively when asked to demonstrate your thinking.",
                    ].map((w, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-secondary">{i + 1}</span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">{w}</p>
                      </div>
                    ))
                  )}
                </div>
              </GlowingCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-white/10 rounded-xl p-6 text-center">
                <Award className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-bold text-white text-lg mb-1">Share Proof of Work</h3>
                <p className="text-xs text-muted-foreground mb-4">Export a verified card for LinkedIn or your personal portfolio</p>
                <div className="bg-black/60 border border-primary/30 rounded-xl p-5">
                  <p className="font-bold text-white">{user?.name || "Guest Candidate"}</p>
                  <p className="text-xs text-muted-foreground">{sessions[0]?.jobTitle || "Interview Candidate"}</p>
                  <p className="text-4xl font-display font-black text-primary my-2">{avgScore}/100</p>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-green-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="font-bold uppercase tracking-widest">Anti-Cheat Verified</span>
                  </div>
                  <p className="text-[9px] text-white/20 mt-3 uppercase tracking-widest">G Hire · The Universal Hiring Network</p>
                </div>
              </div>
            </motion.div>

            <Link href="/hub"
              className="block w-full text-center py-4 rounded-xl border border-primary/40 text-primary font-bold uppercase tracking-widest text-sm hover:bg-primary/10 transition-colors">
              + New Interview
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function PortfolioDashboard() {
  return (
    <AuthGate role="candidate">
      <DashboardContent />
    </AuthGate>
  );
}
