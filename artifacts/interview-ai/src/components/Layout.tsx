import { Link, useLocation } from "wouter";
import { Zap, Home, Briefcase, Trophy, UserCheck, Shield } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Career Hub", href: "/hub", icon: Briefcase },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { name: "Portfolio", href: "/portfolio", icon: UserCheck },
    { name: "Recruiter", href: "/recruiter", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/50 group-hover:box-glow-cyan transition-all">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-bold text-xl tracking-widest text-glow-cyan">G<span className="text-white">HIRE</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={`font-sans font-semibold tracking-wide uppercase text-sm transition-colors hover:text-primary ${
                  location === item.href ? "text-primary text-glow-cyan" : "text-muted-foreground"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
          
          <div>
            <div className="w-10 h-10 rounded-full border border-white/20 bg-muted flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
              <span className="font-display font-bold text-xs text-primary">US</span>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col relative">
        {children}
      </main>
    </div>
  );
}
