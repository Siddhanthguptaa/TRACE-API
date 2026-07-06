"use client";

import dynamic from "next/dynamic";

const NetworkGraph = dynamic(() => import("@/components/NetworkGraph"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 w-full h-full bg-surface-base" />
  ),
});

export default function NetworkGraphLoader() {
  return <NetworkGraph />;
}
