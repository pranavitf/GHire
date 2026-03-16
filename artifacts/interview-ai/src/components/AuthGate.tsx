import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Zap, ArrowRight } from "lucide-react";

const AUTH_KEY_PREFIX = "ghire_auth_";

interface AuthGateProps {
  role: "candidate" | "recruiter";
  children: React.ReactNode;
}

export function AuthGate({ role, children }: AuthGateProps) {
  const storageKey = AUTH_KEY_PREFIX + role;
  const [isAuthed, setIsAuthed] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.name && data.email) {
          setIsAuthed(true);
        }
      } catch {}
    }
  }, [storageKey]);

  const handleLogin = () => {
    if (!name.trim()) { setError("Name is required"); return; }
    if (!email.trim() || !email.includes("@")) { setError("Valid email is required"); return; }
    setError("");
    localStorage.setItem(storageKey, JSON.stringify({ name: name.trim(), email: email.trim(), ts: Date.now() }));
    setIsAuthed(true);
  };

  if (isAuthed) return <>{children}</>;

  const isRecruiter = role === "recruiter";
  const title = isRecruiter ? "RECRUITER ACCESS" : "CANDIDATE LOGIN";
  const subtitle = isRecruiter
    ? "Sign in to discover and shortlist top talent"
    : "Sign in to view your interview portfolio";

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-4">
            {isRecruiter ? <Lock className="w-8 h-8 text-primary" /> : <Zap className="w-8 h-8 text-primary" />}
          </div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-glow-cyan mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-8 space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(""); }}
              placeholder={isRecruiter ? "e.g. Jane Smith" : "e.g. John Doe"}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-all"
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">
              {isRecruiter ? "Work Email" : "Email"}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              placeholder={isRecruiter ? "jane@company.com" : "you@email.com"}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-all"
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 font-medium">{error}</p>
          )}

          <button
            onClick={handleLogin}
            className="w-full py-4 rounded-xl font-bold uppercase tracking-widest bg-gradient-to-r from-primary to-secondary text-white text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <ArrowRight className="w-4 h-4" />
            {isRecruiter ? "Access Dashboard" : "View Portfolio"}
          </button>

          <p className="text-[10px] text-white/20 text-center uppercase tracking-widest">
            GHire · The Universal Hiring Network
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export function getAuthUser(role: "candidate" | "recruiter"): { name: string; email: string } | null {
  try {
    const stored = localStorage.getItem(AUTH_KEY_PREFIX + role);
    if (!stored) return null;
    const data = JSON.parse(stored);
    return data.name && data.email ? { name: data.name, email: data.email } : null;
  } catch {
    return null;
  }
}

export function logout(role: "candidate" | "recruiter") {
  localStorage.removeItem(AUTH_KEY_PREFIX + role);
}
