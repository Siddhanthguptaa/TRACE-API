"use client";

import { motion } from "framer-motion";

interface HeroAnimatedProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export default function HeroAnimated({
  children,
  className = "",
  delay = 0,
}: HeroAnimatedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
