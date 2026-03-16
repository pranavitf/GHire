import { Layout } from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { GlowingCard } from "@/components/GlowingCard";
import { Shield, ShieldCheck, ShieldAlert, Play, X, Search, Filter, Users, Eye } from "lucide-react";
import { useState } from "react";

const MOCK_CANDIDATES = [
  { id: "c1", name: "Sarah Mitchell", profession: "B2B Sales Executive", score: 94, verified: true, antiCheat: "clean", highlight: "\"Our team closed $4.2M in Q3 by restructuring the pipeline funnel. I personally managed the top 12 enterprise accounts and implemented a consultative selling framework that reduced our sales cycle by 35%.\"" },
  { id: "c2", name: "James Kim", profession: "Emergency Room Nurse", score: 88, verified: true, antiCheat: "clean", highlight: "\"When the patient went into cardiac arrest, I initiated the code blue protocol, started CPR immediately, and prepared the crash cart. We achieved ROSC within 4 minutes — the attending said it was one of the fastest responses she'd seen.\"" },
  { id: "c3", name: "Priya Raghavan", profession: "Full-Stack Engineer", score: 91, verified: false, antiCheat: "1 flag", highlight: "\"I designed the event-driven microservices architecture using Kafka for async communication. The system handles 50K requests per second with p99 latency under 200ms. I also implemented circuit breakers to handle cascading failures gracefully.\"" },
  { id: "c4", name: "Marcus Lewis", profession: "M&A Attorney", score: 97, verified: true, antiCheat: "clean", highlight: "\"In the Delaware Chancery case, I identified a material adverse change clause that the opposing counsel had overlooked. This gave us leverage to renegotiate the purchase price by $18M, and ultimately we structured a more favorable earnout provision for our client.\"" },
  { id: "c5", name: "Elena Volkov", profession: "Data Scientist", score: 85, verified: true, antiCheat: "clean", highlight: "\"I built an ensemble model combining gradient boosting and neural collaborative filtering that improved recommendation accuracy by 23%. We A/B tested it against the production model and saw a 15% lift in user engagement within the first two weeks.\"" },
  { id: "c6", name: "David Chen", profession: "ICU Nurse", score: 92, verified: false, antiCheat: "2 flags", highlight: "\"Managing a ventilated patient post-cardiac surgery, I noticed subtle changes in the arterial waveform that suggested early tamponade. I immediately escalated to the surgeon, and the patient was taken back for emergency re-exploration within 30 minutes.\"" },
  { id: "c7", name: "Aisha Tanaka", profession: "Product Manager", score: 89, verified: true, antiCheat: "clean", highlight: "\"I led the launch of our AI-powered search feature from concept to GA in 4 months. We used rapid prototyping with weekly user testing — the feature drove a 40% increase in search conversion and became the #1 feature request fulfilled that quarter.\"" },
  { id: "c8", name: "Ryan Park", profession: "Quantitative Analyst", score: 96, verified: true, antiCheat: "clean", highlight: "\"I developed a volatility surface model using stochastic local vol that reduced our options pricing error by 60 basis points. The model was adopted across the derivatives desk and contributed to $12M in additional P&L from improved hedging efficiency.\"" },
];

export default function Recruiter() {
  const [selectedCandidate, setSelectedCandidate] = useState<typeof MOCK_CANDIDATES[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVerified, setFilterVerified] = useState(false);

  const filtered = MOCK_CANDIDATES.filter(c => {
    if (filterVerified && !c.verified) return false;
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !c.profession.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

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
              Discover verified talent across all industries
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-3xl font-display font-black text-white">{MOCK_CANDIDATES.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Candidates</div>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-right">
              <div className="text-3xl font-display font-black text-green-400">{MOCK_CANDIDATES.filter(c => c.verified).length}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Verified</div>
            </div>
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
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
          <div className="grid grid-cols-[2fr_2fr_1fr_1.5fr_1fr] gap-4 px-6 py-3 border-b border-white/10 bg-white/5">
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
              className="grid grid-cols-[2fr_2fr_1fr_1.5fr_1fr] gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/5 transition-colors items-center"
            >
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
                  <Play className="w-3 h-3 fill-current" />
                  Highlight
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
            onClick={() => setSelectedCandidate(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0a0e1a] border border-white/10 rounded-2xl p-8 max-w-lg w-full relative"
            >
              <button onClick={() => setSelectedCandidate(null)} className="absolute top-4 right-4 text-white/40 hover:text-white">
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
                <div className="ml-auto text-right">
                  <div className={`text-3xl font-display font-black ${selectedCandidate.score >= 90 ? "text-green-400" : "text-primary"}`}>
                    {selectedCandidate.score}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest">/100</div>
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

              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-secondary" />
                  <h3 className="text-sm font-bold text-secondary uppercase tracking-widest">Interview Highlight</h3>
                </div>
                <p className="text-gray-300 leading-relaxed italic text-sm">
                  {selectedCandidate.highlight}
                </p>
              </div>

              <p className="text-[10px] text-white/20 text-center mt-4 uppercase tracking-widest">GHire · The Universal Hiring Network</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
