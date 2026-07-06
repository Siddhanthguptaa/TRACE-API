"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "@/components/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-surface-base">
      <AlertTriangle className="w-12 h-12 text-accent-red mb-6" />
      <h1 className="text-3xl font-serif font-bold text-text-primary mb-4">
        Something went wrong
      </h1>
      <p className="text-base text-text-secondary mb-8 max-w-md">
        An unexpected error occurred. Please try again, or contact support if
        the issue persists.
      </p>
      <div className="flex gap-4">
        <Button variant="primary" size="md" onClick={() => reset()}>
          Try Again
        </Button>
        <Button variant="secondary" size="md" href="/">
          Back to Homepage
        </Button>
      </div>
    </div>
  );
}
