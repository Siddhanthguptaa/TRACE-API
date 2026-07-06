import Link from "next/link";
import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-text-primary text-text-inverse hover:bg-white active:scale-[0.98] transition-all duration-200",
  secondary:
    "bg-transparent text-text-primary border border-border-strong hover:bg-surface-raised hover:border-border-hover active:scale-[0.98] transition-all duration-200",
  ghost:
    "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-raised active:scale-[0.98] transition-all duration-200",
  danger:
    "bg-transparent text-accent-red/80 hover:text-accent-red hover:bg-accent-red/10 active:scale-[0.98] transition-all duration-200",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs font-medium gap-1.5",
  md: "px-4 py-2 text-sm font-medium gap-2",
  lg: "px-8 py-4 text-base font-semibold gap-2",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", href, className = "", children, ...props },
  ref
) {
  const classes = `inline-flex items-center justify-center rounded-sm ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button ref={ref} className={classes} {...props}>
      {children}
    </button>
  );
});

export default Button;
