"use client";

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Seeded pseudo-random number generator for deterministic results.
 * Mulberry32 algorithm.
 */
function createRng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateGraphData() {
  const rng = createRng(42); // deterministic seed for consistent visuals

  const particleCount = 220;
  const spread = 12;
  const clusterCount = 6;
  const maxEdgeDistance = 3.0;
  const depthRange = 4; // shallow depth so nodes aren't lost in perspective

  const pos = new Float32Array(particleCount * 3);

  // Generate cluster centers spread evenly across the viewport
  const clusterCenters: [number, number, number][] = [];
  for (let c = 0; c < clusterCount; c++) {
    clusterCenters.push([
      (rng() - 0.5) * spread * 0.8,
      (rng() - 0.5) * spread * 0.7,
      (rng() - 0.5) * depthRange,
    ]);
  }

  // Distribute nodes around cluster centers with gaussian-like falloff
  for (let i = 0; i < particleCount; i++) {
    const cluster = clusterCenters[Math.floor(rng() * clusterCount)];
    // Box-Muller-ish spread: sum of randoms approximates gaussian
    const jitterX = (rng() + rng() + rng() - 1.5) * 2.0;
    const jitterY = (rng() + rng() + rng() - 1.5) * 2.0;
    const jitterZ = (rng() - 0.5) * depthRange * 0.5;

    pos[i * 3] = cluster[0] + jitterX;
    pos[i * 3 + 1] = cluster[1] + jitterY;
    pos[i * 3 + 2] = cluster[2] + jitterZ;
  }

  // Build edges between nearby nodes
  const lines: number[] = [];
  for (let i = 0; i < particleCount; i++) {
    for (let j = i + 1; j < particleCount; j++) {
      const dx = pos[i * 3] - pos[j * 3];
      const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
      const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Connect close nodes with distance-based probability
      // Closer nodes are much more likely to connect
      if (dist < maxEdgeDistance && rng() < (1 - dist / maxEdgeDistance) * 0.6) {
        lines.push(
          pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2],
          pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]
        );
      }
    }
  }

  // Create anomalous path: pick a cluster and trace through NEARBY nodes
  // This simulates a Sybil ring — a dense local subgraph, not random long edges
  const anomalousLines: number[] = [];
  const sybilCluster = clusterCenters[Math.floor(rng() * clusterCount)];

  // Find nodes closest to this cluster center
  const nodeDistances: { idx: number; dist: number }[] = [];
  for (let i = 0; i < particleCount; i++) {
    const dx = pos[i * 3] - sybilCluster[0];
    const dy = pos[i * 3 + 1] - sybilCluster[1];
    const dz = pos[i * 3 + 2] - sybilCluster[2];
    nodeDistances.push({ idx: i, dist: Math.sqrt(dx * dx + dy * dy + dz * dz) });
  }
  nodeDistances.sort((a, b) => a.dist - b.dist);

  // Connect the 8 closest nodes in a ring + hub pattern
  const sybilNodes = nodeDistances.slice(0, 8).map((n) => n.idx);
  const hubNode = sybilNodes[0];

  // Ring connections
  for (let i = 0; i < sybilNodes.length; i++) {
    const a = sybilNodes[i];
    const b = sybilNodes[(i + 1) % sybilNodes.length];
    anomalousLines.push(
      pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2],
      pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]
    );
  }
  // Hub connections (star from center)
  for (let i = 1; i < sybilNodes.length; i++) {
    const n = sybilNodes[i];
    anomalousLines.push(
      pos[hubNode * 3], pos[hubNode * 3 + 1], pos[hubNode * 3 + 2],
      pos[n * 3], pos[n * 3 + 1], pos[n * 3 + 2]
    );
  }

  return {
    positions: pos,
    linePositions: new Float32Array(lines),
    anomalousLinePositions: new Float32Array(anomalousLines),
  };
}

// Pre-generate at module scope (only on client — dynamically imported with ssr:false)
const graphData = typeof window !== "undefined" ? generateGraphData() : null;

interface GraphData {
  positions: Float32Array;
  linePositions: Float32Array;
  anomalousLinePositions: Float32Array;
}

const GraphNodes = ({ data }: { data: GraphData }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const anomalousLinesRef = useRef<THREE.LineSegments>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const rotY = t * 0.03;
    const rotX = Math.sin(t * 0.015) * 0.08;
    // Subtle parallax from mouse
    const px = state.pointer.x * 0.3;
    const py = state.pointer.y * 0.2;

    for (const ref of [pointsRef, linesRef, anomalousLinesRef]) {
      if (ref.current) {
        ref.current.rotation.y = rotY;
        ref.current.rotation.x = rotX;
        ref.current.position.x = px;
        ref.current.position.y = py;
      }
    }
  });

  return (
    <>
      {/* Nodes */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[data.positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          color="#f5f5f0"
          transparent
          opacity={0.5}
          sizeAttenuation
        />
      </points>

      {/* Normal edges */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[data.linePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.08} />
      </lineSegments>

      {/* Anomalous (Sybil ring) edges */}
      <lineSegments ref={anomalousLinesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[data.anomalousLinePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#e8342a" transparent opacity={0.6} />
      </lineSegments>
    </>
  );
};

export default function NetworkGraph() {
  if (!graphData) return null;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none opacity-50 mix-blend-screen">
      <Canvas camera={{ position: [0, 0, 10], fov: 55 }}>
        <GraphNodes data={graphData} />
      </Canvas>
    </div>
  );
}
