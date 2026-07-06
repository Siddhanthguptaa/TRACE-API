import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface TOCItem {
  id: string;
  label: string;
}

interface ArticleLayoutProps {
  title: string;
  subtitle?: string;
  backLink?: { href: string; label: string };
  toc?: TOCItem[];
  children: React.ReactNode;
}

export default function ArticleLayout({
  title,
  subtitle,
  backLink,
  toc,
  children,
}: ArticleLayoutProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-16 md:py-24 flex gap-12">
      {/* Main content */}
      <article className="flex-1 max-w-3xl">
        {backLink && (
          <Link
            href={backLink.href}
            className="inline-flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors text-sm mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLink.label}
          </Link>
        )}

        <header className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary leading-tight mb-4">
            {title}
          </h1>
          {subtitle && (
            <p className="text-text-tertiary text-sm">{subtitle}</p>
          )}
        </header>

        <div className="prose prose-invert prose-p:text-text-secondary prose-p:leading-relaxed prose-h2:text-xl prose-h2:text-text-primary prose-h2:mt-12 prose-h2:mb-4 prose-h2:font-bold prose-strong:text-text-primary prose-code:text-text-primary prose-code:bg-surface-raised prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm prose-code:text-sm prose-code:font-mono prose-li:text-text-secondary prose-a:text-text-primary prose-a:underline prose-a:underline-offset-4 max-w-none">
          {children}
        </div>
      </article>

      {/* Sticky sidebar TOC */}
      {toc && toc.length > 0 && (
        <aside className="w-56 hidden lg:block sticky top-24 self-start">
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-widest mb-4">
            On this page
          </h4>
          <ul className="flex flex-col gap-2 text-sm text-text-tertiary border-l border-border-default">
            {toc.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="pl-4 border-l-2 border-transparent hover:border-text-secondary hover:text-text-secondary block transition-colors -ml-px py-1"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
