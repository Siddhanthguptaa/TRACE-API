interface CardProps {
  variant?: "surface" | "elevated";
  padding?: "sm" | "md" | "lg" | "none";
  className?: string;
  children: React.ReactNode;
}

const variantStyles = {
  surface: "bg-surface-muted border border-border-default",
  elevated: "bg-surface-raised border border-border-default shadow-md",
};

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8 md:p-10",
};

export default function Card({
  variant = "surface",
  padding = "md",
  className = "",
  children,
}: CardProps) {
  return (
    <div className={`rounded-md ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
}
