import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import Button from "@/components/Button";
import MobileNav from "@/components/MobileNav";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Global Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border-default bg-surface-base/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Link
              href="/"
              className="text-base font-medium tracking-tight text-text-primary flex items-center gap-2"
            >
              <ShieldCheck className="w-5 h-5 text-text-primary" />
              TRACE
            </Link>

            <nav
              className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary"
              aria-label="Main navigation"
            >
              <Link
                href="/research"
                className="hover:text-text-primary transition-colors duration-200"
              >
                Research
              </Link>
              <Link
                href="/docs"
                className="hover:text-text-primary transition-colors duration-200"
              >
                Documentation
              </Link>
              <Link
                href="/company"
                className="hover:text-text-primary transition-colors duration-200"
              >
                Company
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/portal?mode=signin"
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                Sign In
              </Link>
              <Button variant="primary" size="sm" href="/portal">
                Get API Keys
              </Button>
            </div>
            <MobileNav />
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 w-full bg-surface-base">{children}</main>

      {/* Footer */}
      <footer className="w-full border-t border-border-default bg-surface-base pt-16 md:pt-24 pb-12 mt-20 md:mt-32">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 md:mb-24">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <ShieldCheck className="w-5 h-5 text-text-primary" />
              <span className="text-sm font-medium text-text-primary">
                TRACE
              </span>
            </div>
            <p className="text-sm text-text-secondary max-w-sm leading-relaxed">
              The Trust Layer for the Agent Economy. Sub-millisecond Bayesian
              network analysis to prevent Sybil attacks and score agent
              reputation.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-text-primary mb-6">
              Product
            </h4>
            <ul className="flex flex-col gap-4 text-sm text-text-secondary">
              <li>
                <Link
                  href="/research"
                  className="hover:text-text-primary transition-colors duration-200"
                >
                  TRACE Paper
                </Link>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="hover:text-text-primary transition-colors duration-200"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/portal"
                  className="hover:text-text-primary transition-colors duration-200"
                >
                  Developer Portal
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-text-primary mb-6">
              Company
            </h4>
            <ul className="flex flex-col gap-4 text-sm text-text-secondary">
              <li>
                <Link
                  href="/company"
                  className="hover:text-text-primary transition-colors duration-200"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-text-primary transition-colors duration-200"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-text-primary transition-colors duration-200"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-xs text-text-secondary pt-8 border-t border-border-default">
          <p>
            © {new Date().getFullYear()} TRACE Infrastructure. All rights
            reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
