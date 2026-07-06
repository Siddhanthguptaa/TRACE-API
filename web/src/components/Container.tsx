interface ContainerProps {
  size?: "md" | "lg" | "full";
  className?: string;
  children: React.ReactNode;
}

const sizeStyles = {
  md: "max-w-4xl",
  lg: "max-w-7xl",
  full: "w-full",
};

export default function Container({
  size = "lg",
  className = "",
  children,
}: ContainerProps) {
  return (
    <div className={`${sizeStyles[size]} mx-auto px-6 ${className}`}>
      {children}
    </div>
  );
}
