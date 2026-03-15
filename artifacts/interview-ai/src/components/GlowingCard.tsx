import { ReactNode } from "react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlowingCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: "cyan" | "purple" | "red" | "green";
  delay?: number;
}

export function GlowingCard({ children, className, glowColor = "cyan", delay = 0 }: GlowingCardProps) {
  const colorMap = {
    cyan: "border-primary/30 hover:border-primary/60 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]",
    purple: "border-secondary/30 hover:border-secondary/60 hover:shadow-[0_0_20px_rgba(176,38,255,0.2)]",
    red: "border-destructive/30 hover:border-destructive/60 hover:shadow-[0_0_20px_rgba(255,60,60,0.2)]",
    green: "border-green-500/30 hover:border-green-500/60 hover:shadow-[0_0_20px_rgba(0,255,100,0.2)]"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card/40 backdrop-blur-xl transition-all duration-300",
        colorMap[glowColor],
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
