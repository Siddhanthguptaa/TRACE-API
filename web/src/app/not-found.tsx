import { ShieldCheck } from "lucide-react";
import Button from "@/components/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-surface-base">
      <ShieldCheck className="w-12 h-12 text-text-tertiary mb-6" />
      <h1 className="text-4xl font-serif font-bold text-text-primary mb-4">
        404
      </h1>
      <p className="text-base text-text-secondary mb-8 max-w-md">
        This page doesn&apos;t exist. The URL may be incorrect, or the page may
        have been moved.
      </p>
      <Button variant="primary" size="md" href="/">
        Back to Homepage
      </Button>
    </div>
  );
}
