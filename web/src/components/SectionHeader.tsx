interface SectionHeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  alignment?: "left" | "center";
  className?: string;
}

export default function SectionHeader({
  title,
  subtitle,
  alignment = "left",
  className = "",
}: SectionHeaderProps) {
  const alignClass = alignment === "center" ? "text-center items-center" : "text-left items-start";

  return (
    <div className={`flex flex-col gap-4 mb-12 md:mb-16 ${alignClass} ${className}`}>
      <h2 className="text-2xl md:text-3xl font-serif font-bold text-text-primary tracking-tight leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-base text-text-secondary max-w-lg leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
