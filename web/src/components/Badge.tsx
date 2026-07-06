interface BadgeProps {
  variant?: "default" | "live" | "method";
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  default:
    "border border-border-strong bg-surface-muted text-text-primary text-xs font-mono",
  live:
    "border border-border-strong bg-surface-muted text-text-primary text-xs font-mono",
  method:
    "bg-accent-red/10 text-accent-red text-[10px] font-bold uppercase tracking-wider font-mono",
};

export default function Badge({
  variant = "default",
  className = "",
  children,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-sm ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
