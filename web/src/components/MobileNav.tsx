"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/Button";

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 text-text-secondary hover:text-text-primary transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-surface-base border-l border-border-default z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-border-default">
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="text-base font-medium text-text-primary flex items-center gap-2"
                >
                  <ShieldCheck className="w-5 h-5" />
                  TRACE
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 text-text-secondary hover:text-text-primary transition-colors"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav
                className="flex flex-col gap-1 p-4 flex-1"
                aria-label="Mobile navigation"
              >
                {[
                  { href: "/research", label: "Research" },
                  { href: "/docs", label: "Documentation" },
                  { href: "/company", label: "Company" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="px-4 py-3 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-raised rounded-md transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="p-4 border-t border-border-default flex flex-col gap-3">
                <Button
                  variant="ghost"
                  size="md"
                  href="/portal?mode=signin"
                  className="w-full justify-center"
                >
                  Sign In
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  href="/portal"
                  className="w-full justify-center"
                >
                  Get API Keys
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
