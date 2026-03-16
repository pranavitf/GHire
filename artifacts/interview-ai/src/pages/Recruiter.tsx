import { Layout } from "@/components/Layout";
import { AuthGate, getAuthUser, logout } from "@/components/AuthGate";
import { motion, AnimatePresence } from "framer-motion";
import { GlowingCard } from "@/components/GlowingCard";
import { Shield, ShieldCheck, ShieldAlert, Play, X, Search, Filter, Users, Eye, LogOut, Star, StarOff, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useCallback } from "react";
import { useLocation } from "wouter";

const MOCK_CANDIDATES = [
  { id: "c1", name: "Sarah Mitchell", profession: "B2B Sales Executive", score: 94, verified: true, antiCheat: "clean", highlight: "\"Our team closed $4.2M in Q3 by restructuring the pipeline funnel. I personally managed the top 12 enterprise accounts and implemented a consultative selling framework that reduced our sales cycle by 35%.\"", transcript: [
    { role: "ai" as const, text: "Welcome Sarah! Tell me about yourself and what drew you to B2B sales.", ts: 5 },
    { role: "user" as const, text: "Thank you! I've been in enterprise sales for about 7 years now. What really drew me in was the strategic aspect — understanding complex organizations and figuring out how to create value for them.", ts: 38 },
    { role: "ai" as const, text: "I can see you're very confident — great eye contact. Tell me about your biggest deal.", ts: 72 },
    { role: "user" as const, text: "Our team closed $4.2M in Q3 by restructuring the pipeline funnel. I personally managed the top 12 enterprise accounts and implemented a consultative selling framework that reduced our sales cycle by 35%.", ts: 115 },
    { role: "ai" as const, text: "Impressive metrics. How do you handle objections from C-level stakeholders?", ts: 148 },
    { role: "user" as const, text: "I focus on understanding their pain points first. I never pitch features — I map our solution to their strategic priorities. For C-level, it's always about ROI and risk mitigation.", ts: 190 },
  ]},
  { id: "c2", name: "James Kim", profession: "Emergency Room Nurse", score: 88, verified: true, antiCheat: "clean", highlight: "\"When the patient went into cardiac arrest, I initiated the code blue protocol, started CPR immediately, and prepared the crash cart. We achieved ROSC within 4 minutes — the attending said it was one of the fastest responses she'd seen.\"", transcript: [
    { role: "ai" as const, text: "Hi James, welcome. What made you choose emergency nursing?", ts: 5 },
    { role: "user" as const, text: "I love the intensity and the fact that every shift is different. You never know what's coming through those doors, and I thrive in that environment.", ts: 42 },
    { role: "ai" as const, text: "Tell me about a critical moment where your quick thinking saved a patient.", ts: 78 },
    { role: "user" as const, text: "When the patient went into cardiac arrest, I initiated the code blue protocol, started CPR immediately, and prepared the crash cart. We achieved ROSC within 4 minutes — the attending said it was one of the fastest responses she'd seen.", ts: 125 },
  ]},
  { id: "c3", name: "Priya Raghavan", profession: "Full-Stack Engineer", score: 91, verified: false, antiCheat: "1 flag", highlight: "\"I designed the event-driven microservices architecture using Kafka for async communication. The system handles 50K requests per second with p99 latency under 200ms. I also implemented circuit breakers to handle cascading failures gracefully.\"", transcript: [
    { role: "ai" as const, text: "Welcome Priya. Tell me about a system you've designed that you're proud of.", ts: 5 },
    { role: "user" as const, text: "I designed the event-driven microservices architecture using Kafka for async communication. The system handles 50K requests per second with p99 latency under 200ms. I also implemented circuit breakers to handle cascading failures gracefully.", ts: 50 },
    { role: "ai" as const, text: "I notice you seem to be looking at something off-screen — everything okay?", ts: 95 },
    { role: "user" as const, text: "Oh sorry, I was checking my architecture diagram. Let me focus back.", ts: 112 },
  ]},
  { id: "c4", name: "Marcus Lewis", profession: "M&A Attorney", score: 97, verified: true, antiCheat: "clean", highlight: "\"In the Delaware Chancery case, I identified a material adverse change clause that the opposing counsel had overlooked. This gave us leverage to renegotiate the purchase price by $18M, and ultimately we structured a more favorable earnout provision for our client.\"", transcript: [
    { role: "ai" as const, text: "Marcus, welcome. What's your area of specialization in M&A law?", ts: 5 },
    { role: "user" as const, text: "I specialize in cross-border M&A transactions, particularly in the technology sector. I've handled deals ranging from $50M to over $2B.", ts: 35 },
    { role: "ai" as const, text: "Excellent composure. Walk me through your most complex negotiation.", ts: 68 },
    { role: "user" as const, text: "In the Delaware Chancery case, I identified a material adverse change clause that the opposing counsel had overlooked. This gave us leverage to renegotiate the purchase price by $18M, and ultimately we structured a more favorable earnout provision for our client.", ts: 120 },
  ]},
  { id: "c5", name: "Elena Volkov", profession: "Data Scientist", score: 85, verified: true, antiCheat: "clean", highlight: "\"I built an ensemble model combining gradient boosting and neural collaborative filtering that improved recommendation accuracy by 23%. We A/B tested it against the production model and saw a 15% lift in user engagement within the first two weeks.\"", transcript: [
    { role: "ai" as const, text: "Elena, tell me about yourself and your data science journey.", ts: 5 },
    { role: "user" as const, text: "I started in pure mathematics and transitioned to data science about 5 years ago. I love the intersection of statistical rigor and real-world impact.", ts: 40 },
    { role: "ai" as const, text: "What's the most impactful model you've built?", ts: 75 },
    { role: "user" as const, text: "I built an ensemble model combining gradient boosting and neural collaborative filtering that improved recommendation accuracy by 23%. We A/B tested it against the production model and saw a 15% lift in user engagement within the first two weeks.", ts: 130 },
  ]},
  { id: "c6", name: "David Chen", profession: "ICU Nurse", score: 92, verified: false, antiCheat: "2 flags", highlight: "\"Managing a ventilated patient post-cardiac surgery, I noticed subtle changes in the arterial waveform that suggested early tamponade. I immediately escalated to the surgeon, and the patient was taken back for emergency re-exploration within 30 minutes.\"", transcript: [
    { role: "ai" as const, text: "David, what's your experience in critical care?", ts: 5 },
    { role: "user" as const, text: "I've been in the ICU for 6 years, specializing in post-surgical cardiac patients. I'm CCRN certified and have experience with ECMO and IABP.", ts: 45 },
    { role: "ai" as const, text: "I notice you appear distracted and someone else seems to be in the background. Can you tell me about a critical clinical situation?", ts: 88 },
    { role: "user" as const, text: "Managing a ventilated patient post-cardiac surgery, I noticed subtle changes in the arterial waveform that suggested early tamponade. I immediately escalated to the surgeon, and the patient was taken back for emergency re-exploration within 30 minutes.", ts: 145 },
  ]},
  { id: "c7", name: "Aisha Tanaka", profession: "Product Manager", score: 89, verified: true, antiCheat: "clean", highlight: "\"I led the launch of our AI-powered search feature from concept to GA in 4 months. We used rapid prototyping with weekly user testing — the feature drove a 40% increase in search conversion and became the #1 feature request fulfilled that quarter.\"", transcript: [
    { role: "ai" as const, text: "Aisha, welcome! What got you into product management?", ts: 5 },
    { role: "user" as const, text: "I was originally an engineer but found I was most energized when talking to users and shaping product strategy. The transition felt natural.", ts: 35 },
    { role: "ai" as const, text: "Tell me about a product you launched that you're proud of.", ts: 70 },
    { role: "user" as const, text: "I led the launch of our AI-powered search feature from concept to GA in 4 months. We used rapid prototyping with weekly user testing — the feature drove a 40% increase in search conversion and became the #1 feature request fulfilled that quarter.", ts: 118 },
  ]},
  { id: "c8", name: "Ryan Park", profession: "Quantitative Analyst", score: 96, verified: true, antiCheat: "clean", highlight: "\"I developed a volatility surface model using stochastic local vol that reduced our options pricing error by 60 basis points. The model was adopted across the derivatives desk and contributed to $12M in additional P&L from improved hedging efficiency.\"", transcript: [
    { role: "ai" as const, text: "Ryan, tell me about your quantitative background.", ts: 5 },
    { role: "user" as const, text: "I have a PhD in computational mathematics from MIT. I've been working in quantitative finance for 4 years, focusing on derivatives pricing and risk models.", ts: 42 },
    { role: "ai" as const, text: "Walk me through your most significant model contribution.", ts: 80 },
    { role: "user" as const, text: "I developed a volatility surface model using stochastic local vol that reduced our options pricing error by 60 basis points. The model was adopted across the derivatives desk and contributed to $12M in additional P&L from improved hedging efficiency.", ts: 135 },
  ]},
];

function RecruiterContent() {
  const [, setLocation] = useLocation();
  const [selectedCandidate, setSelectedCandidate] = useState<typeof MOCK_CANDIDATES[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVerified, setFilterVerified] = useState(false);
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const [showTranscript, setShowTranscript] = useState(false);
  const [showShortlistOnly, setShowShortlistOnly] = useState(false);
  const user = getAuthUser("recruiter");

  const toggleShortlist = useCallback((id: string) => {
    setShortlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filtered = MOCK_CANDIDATES.filter(c => {
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
                <div className="text-3xl font-display font-black text-white">{MOCK_CANDIDATES.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Candidates</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-right">
                <div className="text-3xl font-display font-black text-yellow-400">{shortlist.size}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Shortlisted</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-right">
                <div className="text-3xl font-display font-black text-green-400">{MOCK_CANDIDATES.filter(c => c.verified).length}</div>
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

          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No candidates match your filters.</p>
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

              <p className="text-[10px] text-white/20 text-center mt-4 uppercase tracking-widest">GHire · The Universal Hiring Network</p>
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
