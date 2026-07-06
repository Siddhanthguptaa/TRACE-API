import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Compact Dashboard Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border-default bg-surface-base/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-medium tracking-tight text-text-primary flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-text-primary" />
            TRACE
          </Link>

          <nav className="flex items-center gap-6 text-sm" aria-label="Dashboard navigation">
            <Link
              href="/docs"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              Back to Site
            </Link>
          </nav>
        </div>
      </header>

      {/* Dashboard Content — no mega footer */}
      <main className="flex-1 w-full bg-surface-base">{children}</main>
    </>
  );
}
