interface CodeBlockProps {
  title?: string;
  language?: string;
  children: React.ReactNode;
  className?: string;
}

export default function CodeBlock({
  title,
  language,
  children,
  className = "",
}: CodeBlockProps) {
  return (
    <div className={`bg-surface-base border border-border-default rounded-md overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-surface-muted">
          <div className="flex items-center gap-3">
            {language && (
              <span className="bg-accent-red/10 text-accent-red text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider font-mono">
                {language}
              </span>
            )}
            <span className="text-xs font-mono text-text-secondary">{title}</span>
          </div>
        </div>
      )}
      <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
