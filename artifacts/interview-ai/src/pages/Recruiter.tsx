import { Layout } from "@/components/Layout";
import { AuthGate, getAuthUser, logout } from "@/components/AuthGate";
import { motion, AnimatePresence } from "framer-motion";
import { GlowingCard } from "@/components/GlowingCard";
import { Shield, ShieldCheck, ShieldAlert, Play, X, Search, Filter, Users, Eye, LogOut, Star, StarOff, MessageSquare, ChevronDown, ChevronUp, Activity } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useListSessions } from "@workspace/api-client-react";

type CandidateRow = {
  id: string;
  name: string;
  profession: string;
  score: number;
  verified: boolean;
  antiCheat: string;
  highlight: string;
  transcript: { role: "ai" | "user"; text: string; ts: number }[];
};

const MOCK_CANDIDATES: CandidateRow[] = [
  {
    id: "mock-1",
    name: "Elena Vasquez",
    profession: "Full-Stack Engineer",
    score: 94,
    verified: true,
    antiCheat: "clean",
    highlight: "\"I architected a real-time collaborative editor using CRDTs and WebSocket sync, handling 50k concurrent users with sub-100ms latency across global regions.\"",
    transcript: [
      { role: "ai", text: "Tell me about a complex distributed system you've built.", ts: 0 },
      { role: "user", text: "I architected a real-time collaborative editor using CRDTs and WebSocket sync, handling 50k concurrent users with sub-100ms latency across global regions.", ts: 15 },
      { role: "ai", text: "How did you handle conflict resolution at that scale?", ts: 45 },
      { role: "user", text: "We used operation-based CRDTs with vector clocks for causal ordering, and built a custom merge engine that could process 10k ops/sec per node.", ts: 60 },
    ],
  },
  {
    id: "mock-2",
    name: "Marcus Chen",
    profession: "ML Engineer",
    score: 91,
    verified: true,
    antiCheat: "clean",
    highlight: "\"I fine-tuned a transformer model for medical image classification that achieved 98.7% accuracy on the validation set, outperforming the previous SOTA by 3.2%.\"",
    transcript: [
      { role: "ai", text: "Walk me through your most impactful ML project.", ts: 0 },
      { role: "user", text: "I fine-tuned a transformer model for medical image classification that achieved 98.7% accuracy on the validation set, outperforming the previous SOTA by 3.2%.", ts: 20 },
      { role: "ai", text: "What was your approach to handling class imbalance in medical datasets?", ts: 50 },
      { role: "user", text: "We combined focal loss with progressive resizing and used a custom augmentation pipeline including elastic deformations and stain normalization.", ts: 65 },
    ],
  },
  {
    id: "mock-3",
    name: "Priya Sharma",
    profession: "DevOps Lead",
    score: 88,
    verified: true,
    antiCheat: "clean",
    highlight: "\"I migrated our entire infrastructure from monolithic VMs to Kubernetes, reducing deployment time from 2 hours to 4 minutes with zero downtime.\"",
    transcript: [
      { role: "ai", text: "Describe a major infrastructure migration you led.", ts: 0 },
      { role: "user", text: "I migrated our entire infrastructure from monolithic VMs to Kubernetes, reducing deployment time from 2 hours to 4 minutes with zero downtime.", ts: 18 },
      { role: "ai", text: "How did you ensure zero downtime during the migration?", ts: 48 },
      { role: "user", text: "Blue-green deployments with canary releases — we routed 1% of traffic to K8s initially and gradually shifted over 3 weeks while monitoring error rates.", ts: 62 },
    ],
  },
  {
    id: "mock-4",
    name: "James O'Brien",
    profession: "Frontend Architect",
    score: 86,
    verified: false,
    antiCheat: "1 flag",
    highlight: "\"I built a design system from scratch serving 12 product teams, with a component library that reduced feature development time by 40%.\"",
    transcript: [
      { role: "ai", text: "Tell me about a design system you've created.", ts: 0 },
      { role: "user", text: "I built a design system from scratch serving 12 product teams, with a component library that reduced feature development time by 40%.", ts: 22 },
      { role: "ai", text: "How did you handle versioning and adoption across teams?", ts: 55 },
      { role: "user", text: "Semantic versioning with automated visual regression tests, plus a migration CLI that could upgrade components across repos in minutes.", ts: 70 },
    ],
  },
  {
    id: "mock-5",
    name: "Aisha Patel",
    profession: "Data Engineer",
    score: 92,
    verified: true,
    antiCheat: "clean",
    highlight: "\"I designed a real-time data pipeline processing 2TB daily using Apache Flink, with exactly-once semantics and sub-second end-to-end latency.\"",
    transcript: [
      { role: "ai", text: "Describe your experience with real-time data processing.", ts: 0 },
      { role: "user", text: "I designed a real-time data pipeline processing 2TB daily using Apache Flink, with exactly-once semantics and sub-second end-to-end latency.", ts: 16 },
      { role: "ai", text: "How did you achieve exactly-once semantics?", ts: 46 },
      { role: "user", text: "Two-phase commit with Kafka transactions and idempotent sinks, plus custom checkpointing for state recovery.", ts: 58 },
    ],
  },
  {
    id: "mock-6",
    name: "David Kim",
    profession: "Security Engineer",
    score: 89,
    verified: true,
    antiCheat: "clean",
    highlight: "\"I discovered and responsibly disclosed a critical OAuth vulnerability affecting 200M+ users across three major platforms.\"",
    transcript: [
      { role: "ai", text: "Tell me about a significant security vulnerability you discovered.", ts: 0 },
      { role: "user", text: "I discovered and responsibly disclosed a critical OAuth vulnerability affecting 200M+ users across three major platforms.", ts: 20 },
      { role: "ai", text: "Walk me through your methodology for finding this.", ts: 52 },
      { role: "user", text: "I built a custom fuzzer targeting token exchange flows and found a CSRF bypass in the redirect URI validation that allowed account takeover.", ts: 68 },
    ],
  },
  {
    id: "mock-7",
    name: "Sofia Rodriguez",
    profession: "Mobile Developer",
    score: 85,
    verified: true,
    antiCheat: "clean",
    highlight: "\"I rebuilt our React Native app with a custom navigation system that improved cold start time by 60% and reduced crash rate to 0.1%.\"",
    transcript: [
      { role: "ai", text: "Tell me about optimizing a mobile application.", ts: 0 },
      { role: "user", text: "I rebuilt our React Native app with a custom navigation system that improved cold start time by 60% and reduced crash rate to 0.1%.", ts: 18 },
      { role: "ai", text: "What specific techniques improved the cold start time?", ts: 50 },
      { role: "user", text: "Lazy screen loading, Hermes engine optimization, inline requires, and pre-warming critical API calls during the splash screen.", ts: 64 },
    ],
  },
  {
    id: "mock-8",
    name: "Ryan Foster",
    profession: "Backend Engineer",
    score: 78,
    verified: false,
    antiCheat: "2 flags",
    highlight: "\"I scaled our API from 1k to 100k requests per second using a combination of caching strategies, connection pooling, and async processing.\"",
    transcript: [
      { role: "ai", text: "Describe how you handled a major scaling challenge.", ts: 0 },
      { role: "user", text: "I scaled our API from 1k to 100k requests per second using a combination of caching strategies, connection pooling, and async processing.", ts: 25 },
      { role: "ai", text: "What caching layers did you implement?", ts: 55 },
      { role: "user", text: "Three-tier: CDN edge caching, Redis for hot data with LRU eviction, and application-level memoization with TTL-based invalidation.", ts: 72 },
    ],
  },
  {
    id: "mock-9",
    name: "Nina Andersson",
    profession: "Product Designer",
    score: 90,
    verified: true,
    antiCheat: "clean",
    highlight: "\"I led a complete redesign of the onboarding flow that increased user activation by 45% and reduced time-to-value from 12 minutes to 3 minutes.\"",
    transcript: [
      { role: "ai", text: "Tell me about a design that significantly impacted business metrics.", ts: 0 },
      { role: "user", text: "I led a complete redesign of the onboarding flow that increased user activation by 45% and reduced time-to-value from 12 minutes to 3 minutes.", ts: 20 },
      { role: "ai", text: "How did you validate your design decisions?", ts: 48 },
      { role: "user", text: "A/B testing with 10k users per cohort, heat maps for click analysis, and weekly user interviews to capture qualitative feedback.", ts: 62 },
    ],
  },
  {
    id: "mock-10",
    name: "Alex Thompson",
    profession: "Cloud Architect",
    score: 87,
    verified: true,
    antiCheat: "clean",
    highlight: "\"I designed a multi-region active-active architecture on AWS that achieved 99.999% uptime and saved $2M annually in infrastructure costs.\"",
    transcript: [
      { role: "ai", text: "Describe your approach to high-availability architecture.", ts: 0 },
      { role: "user", text: "I designed a multi-region active-active architecture on AWS that achieved 99.999% uptime and saved $2M annually in infrastructure costs.", ts: 22 },
      { role: "ai", text: "How did you handle data consistency across regions?", ts: 54 },
      { role: "user", text: "Eventually consistent with DynamoDB global tables for most data, and strongly consistent with Aurora Global for financial transactions.", ts: 68 },
    ],
  },
  {
    id: "mock-11",
    name: "Jon Doe",
    profession: "Software Architect",
    score: 91,
    verified: true,
    antiCheat: "clean",
    highlight: "\"I redesigned our monolithic Spring Boot application into 24 microservices, cutting deploy cycles from weekly to hourly with full CI/CD automation.\"",
    transcript: [
      { role: "ai", text: "Tell me about a large-scale architecture transformation you led.", ts: 0 },
      { role: "user", text: "I redesigned our monolithic Spring Boot application into 24 microservices, cutting deploy cycles from weekly to hourly with full CI/CD automation.", ts: 18 },
      { role: "ai", text: "How did you manage the transition without disrupting existing users?", ts: 50 },
      { role: "user", text: "Strangler fig pattern — we routed traffic gradually per endpoint using an API gateway, with feature flags for instant rollback capability.", ts: 66 },
    ],
  },
];

function RecruiterContent() {
  const [, setLocation] = useLocation();
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVerified, setFilterVerified] = useState(false);
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const [showTranscript, setShowTranscript] = useState(false);
  const [showShortlistOnly, setShowShortlistOnly] = useState(false);
  const user = getAuthUser("recruiter");

  const { data: rawSessions, isLoading: sessionsLoading } = useListSessions(
    {},
    { query: { refetchInterval: 15000 } }
  );

  const candidates: CandidateRow[] = useMemo(() => {
    const fromDb: CandidateRow[] = (rawSessions ?? [])
      .filter((s: { status?: string; overallScore?: number | null }) => s.status === "completed" && s.overallScore != null)
      .map((s: { id: string; userName: string; jobTitle: string; overallScore?: number | null; proctorFlags?: unknown[]; transcript?: unknown[] }) => {
        const flags = (s.proctorFlags ?? []) as { type: string; description?: string; severity?: string }[];
        const flagCount = flags.length;
        const verified = flagCount === 0;
        const tx = (s.transcript ?? []) as { role: string; content: string; timestamp?: number }[];
        const txFiltered = tx.filter(t => !t.content.startsWith("[BEST_MOMENT]"));
        const userResponses = txFiltered.filter(t => t.role === "user");
        const longestResponse = userResponses.sort((a, b) => (b.content?.length ?? 0) - (a.content?.length ?? 0))[0];
        return {
          id: s.id,
          name: s.userName,
          profession: s.jobTitle,
          score: Math.round(s.overallScore ?? 0),
          verified,
          antiCheat: verified ? "clean" : `${flagCount} flag${flagCount > 1 ? "s" : ""}`,
          highlight: longestResponse ? `"${longestResponse.content}"` : "No highlight available.",
          transcript: txFiltered.map((t, i) => ({
            role: t.role as "ai" | "user",
            text: t.content,
            ts: t.timestamp ? Math.floor((t.timestamp - (txFiltered[0]?.timestamp ?? t.timestamp)) / 1000) : i * 30,
          })),
        };
      });

    const all = [...fromDb, ...MOCK_CANDIDATES];
    const bestByName = new Map<string, CandidateRow>();
    for (const c of all) {
      const key = c.name.toLowerCase();
      const existing = bestByName.get(key);
      if (!existing || c.score > existing.score) {
        bestByName.set(key, c);
      }
    }
    return Array.from(bestByName.values()).sort((a, b) => b.score - a.score);
  }, [rawSessions]);

  const toggleShortlist = useCallback((id: string) => {
    setShortlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filtered = candidates.filter(c => {
    if (filterVerified && !c.verified) return false;
    if (showShortlistOnly && !shortlist.has(c.id)) return false;
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !c.profession.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleLogout = () => {
    logout("recruiter");
    setLocation("/recruiter");
    window.location.reload();
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-white/10 pb-8 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-secondary/50 bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-widest mb-3">
              <Shield className="w-3 h-3" /> Employer Access
            </div>
            <h1 className="text-4xl font-black text-glow-cyan mb-2 flex items-center gap-3">
              <Users className="w-9 h-9 text-primary" />
              RECRUITER DASHBOARD
            </h1>
            <p className="text-muted-foreground uppercase tracking-widest text-sm font-semibold">
              {user?.name ? `Welcome, ${user.name}` : "Discover verified talent across all industries"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-3xl font-display font-black text-white">{candidates.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Candidates</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-right">
                <div className="text-3xl font-display font-black text-yellow-400">{shortlist.size}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Shortlisted</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-right">
                <div className="text-3xl font-display font-black text-green-400">{candidates.filter(c => c.verified).length}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Verified</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center hover:border-red-500/50 hover:bg-red-500/10 transition-all"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-white/40" />
            </button>
          </div>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search candidates by name or profession..."
              className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary text-sm"
            />
          </div>
          <button
            onClick={() => setFilterVerified(!filterVerified)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-bold uppercase tracking-wider transition-all ${
              filterVerified ? "border-green-500 bg-green-500/10 text-green-400" : "border-white/10 text-muted-foreground hover:border-white/30"
            }`}
          >
            <Filter className="w-4 h-4" />
            Verified Only
          </button>
          <button
            onClick={() => setShowShortlistOnly(!showShortlistOnly)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-bold uppercase tracking-wider transition-all ${
              showShortlistOnly ? "border-yellow-500 bg-yellow-500/10 text-yellow-400" : "border-white/10 text-muted-foreground hover:border-white/30"
            }`}
          >
            <Star className="w-4 h-4" />
            Shortlist ({shortlist.size})
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
          <div className="grid grid-cols-[auto_2fr_2fr_1fr_1.5fr_1fr] gap-4 px-6 py-3 border-b border-white/10 bg-white/5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-8"></span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Name</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Profession</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Score</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Anti-Cheat</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</span>
          </div>

          {filtered.map((candidate, i) => (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`grid grid-cols-[auto_2fr_2fr_1fr_1.5fr_1fr] gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/5 transition-colors items-center ${
                shortlist.has(candidate.id) ? "bg-yellow-500/5" : ""
              }`}
            >
              <button
                onClick={() => toggleShortlist(candidate.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all"
                title={shortlist.has(candidate.id) ? "Remove from shortlist" : "Add to shortlist"}
              >
                {shortlist.has(candidate.id) ? (
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ) : (
                  <StarOff className="w-4 h-4 text-white/20 hover:text-yellow-400" />
                )}
              </button>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/20 flex items-center justify-center font-bold text-xs">
                  {candidate.name.split(" ").map(n => n[0]).join("")}
                </div>
                <span className="font-bold text-white text-sm">{candidate.name}</span>
              </div>
              <span className="text-sm text-gray-300">{candidate.profession}</span>
              <span className={`font-display font-black text-lg ${candidate.score >= 90 ? "text-green-400" : candidate.score >= 80 ? "text-primary" : "text-yellow-400"}`}>
                {candidate.score}
              </span>
              <div className="flex items-center gap-1.5">
                {candidate.antiCheat === "clean" ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-400 font-bold uppercase tracking-wider">Clean</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs text-yellow-400 font-bold uppercase tracking-wider">{candidate.antiCheat}</span>
                  </>
                )}
              </div>
              <div className="text-right">
                <button
                  onClick={() => setSelectedCandidate(candidate)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider hover:bg-primary/10 transition-all"
                >
                  <Eye className="w-3 h-3" />
                  Review
                </button>
              </div>
            </motion.div>
          ))}

          {sessionsLoading && (
            <div className="p-12 flex items-center justify-center">
              <Activity className="w-8 h-8 text-primary animate-pulse" />
            </div>
          )}

          {!sessionsLoading && filtered.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">
                {candidates.length === 0
                  ? "No completed interviews yet. Candidates will appear here after they finish interviewing."
                  : "No candidates match your filters."}
              </p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedCandidate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => { setSelectedCandidate(null); setShowTranscript(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0a0e1a] border border-white/10 rounded-2xl p-8 max-w-2xl w-full relative max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => { setSelectedCandidate(null); setShowTranscript(false); }} className="absolute top-4 right-4 text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/20 flex items-center justify-center font-bold text-lg">
                  {selectedCandidate.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedCandidate.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedCandidate.profession}</p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <button
                    onClick={() => toggleShortlist(selectedCandidate.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                      shortlist.has(selectedCandidate.id)
                        ? "border-yellow-500 bg-yellow-500/10 text-yellow-400"
                        : "border-white/10 text-white/50 hover:border-yellow-500/50"
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${shortlist.has(selectedCandidate.id) ? "fill-yellow-400" : ""}`} />
                    {shortlist.has(selectedCandidate.id) ? "Shortlisted" : "Shortlist"}
                  </button>
                  <div className="text-right">
                    <div className={`text-3xl font-display font-black ${selectedCandidate.score >= 90 ? "text-green-400" : "text-primary"}`}>
                      {selectedCandidate.score}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">/100</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                {selectedCandidate.verified ? (
                  <div className="bg-green-500/10 border border-green-500 text-green-500 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Verified Clean</span>
                  </div>
                ) : (
                  <div className="bg-yellow-500/10 border border-yellow-500 text-yellow-500 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <ShieldAlert className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{selectedCandidate.antiCheat}</span>
                  </div>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Play className="w-4 h-4 text-secondary fill-current" />
                  <h3 className="text-sm font-bold text-secondary uppercase tracking-widest">Interview Highlight</h3>
                </div>
                <p className="text-gray-300 leading-relaxed italic text-sm">
                  {selectedCandidate.highlight}
                </p>
              </div>

              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 hover:border-primary/30 hover:bg-white/5 transition-all mb-4"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-white uppercase tracking-widest">Full Interview Transcript</span>
                </div>
                {showTranscript ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
              </button>

              <AnimatePresence>
                {showTranscript && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-3 max-h-80 overflow-y-auto">
                      {selectedCandidate.transcript.map((entry, i) => (
                        <div key={i} className={`p-3 rounded-xl border text-sm leading-relaxed ${
                          entry.role === "ai"
                            ? "bg-white/5 border-white/10"
                            : "bg-primary/10 border-primary/30 ml-4"
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-[10px] font-bold tracking-wider ${entry.role === "ai" ? "text-primary" : "text-white"}`}>
                              {entry.role === "ai" ? "ARIA" : selectedCandidate.name.split(" ")[0].toUpperCase()}
                            </p>
                            <span className="text-[9px] text-white/30 font-mono">{Math.floor(entry.ts / 60)}:{(entry.ts % 60).toString().padStart(2, "0")}</span>
                          </div>
                          <p className="text-gray-300">{entry.text}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-[10px] text-white/20 text-center mt-4 uppercase tracking-widest">G Hire · The Universal Hiring Network</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

export default function Recruiter() {
  return (
    <AuthGate role="recruiter">
      <RecruiterContent />
    </AuthGate>
  );
}
