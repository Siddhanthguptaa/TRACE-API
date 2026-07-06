import Link from "next/link";
import {
  ShieldCheck,
  Activity,
  Network,
  Globe2,
  Code2,
  Database,
  ArrowRight,
} from "lucide-react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import AnimatedSection from "@/components/AnimatedSection";
import HeroAnimated from "@/components/HeroAnimated";


export default function Home() {
  return (
    <div className="w-full flex flex-col items-center bg-surface-base overflow-hidden font-sans">
      {/* ── Hero Section ── */}
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center text-center px-6 pt-32 pb-24">


        <div className="relative z-10 flex flex-col items-center">
          <HeroAnimated delay={0.2}>
            <Badge variant="live" className="mb-8">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex h-2 w-2 bg-accent-red rounded-full" />
              </span>
              TRACE Engine v1.0
            </Badge>
          </HeroAnimated>

          <HeroAnimated delay={0.3}>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tighter leading-[1.0] mb-8 text-text-primary max-w-5xl">
              The Trust Layer for{" "}
              <br className="hidden md:block" />
              <span className="text-text-secondary">Autonomous Agents</span>
            </h1>
          </HeroAnimated>

          <HeroAnimated delay={0.4}>
            <p className="max-w-2xl text-lg md:text-xl text-text-secondary leading-relaxed mb-12 font-medium">
              Stripe Radar for the Agent Economy. TRACE detects adversarial
              coordination and blocks Sybil swarms in under 50ms using
              graph-aware Bayesian anomaly detection.
            </p>
          </HeroAnimated>

          <HeroAnimated delay={0.5}>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Button variant="primary" size="lg" href="/portal">
                Start Building
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="lg" href="/research">
                Read the Whitepaper
              </Button>
            </div>
          </HeroAnimated>
        </div>
      </section>

      {/* ── API Mockup Section ── */}
      <AnimatedSection className="w-full max-w-7xl mx-auto px-6 py-24 md:py-32 relative">
        <Card variant="surface" padding="none">
          {/* Mac window controls */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border-default bg-surface-raised">
            <div className="w-2.5 h-2.5 rounded-full bg-border-hover" />
            <div className="w-2.5 h-2.5 rounded-full bg-border-hover" />
            <div className="w-2.5 h-2.5 rounded-full bg-border-hover" />
            <span className="ml-4 text-xs font-mono text-text-secondary flex items-center gap-2 tracking-wider uppercase">
              <ShieldCheck className="w-3 h-3" /> trace-anomaly-engine
            </span>
          </div>

          <div className="grid md:grid-cols-2">
            {/* Terminal Panel */}
            <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-border-default font-mono text-sm leading-relaxed bg-surface-base">
              <div className="text-text-tertiary mb-4">
                {"// Continuous Ingestion Stream"}
              </div>
              <div className="text-text-primary">
                <span className="text-text-secondary">INFO</span>: Evaluating
                transaction{" "}
                <span className="text-text-primary">tx_992a...</span>
                <br />
                <span className="text-text-secondary">INFO</span>: Consumer:{" "}
                <span className="text-text-primary">agent_x9</span> → Provider:{" "}
                <span className="text-text-primary">agent_v3</span>
              </div>
              <div className="mt-4 text-text-tertiary">
                {"// Fetching decoupled graph metrics (Postgres)"}
              </div>
              <div className="text-text-primary">
                <span className="text-text-secondary">DB_HIT</span>: NodeRank ={" "}
                <span className="text-text-primary">0.084</span> | Cluster_Coeff
                = <span className="text-text-primary">0.92</span>
              </div>
              <div className="mt-4 text-text-tertiary">
                {"// Applying Bayesian CUSUM Filter"}
              </div>
              <div className="text-accent-red bg-surface-muted p-3 border border-accent-red/30 mt-2 rounded-sm">
                <span className="font-bold">CRITICAL</span>: P(Sybil) {">"}{" "}
                0.99 threshold crossed.
                <br />
                ACTION: BLOCK_TRANSACTION
                <br />
                REASON: High coordination evidence detected in cluster_id(442).
              </div>
            </div>

            {/* Visual Panel */}
            <div className="p-6 md:p-8 relative flex items-center justify-center bg-surface-muted">
              <div className="w-full max-w-sm">
                <div className="flex items-center justify-between border-b border-border-default pb-2 mb-6">
                  <h3 className="text-text-primary font-mono text-xs uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-text-secondary" /> Live
                    Trust Score
                  </h3>
                  <span className="text-text-secondary font-mono text-[10px]">
                    P(Sybil)
                  </span>
                </div>

                <div className="relative h-56 border-l border-b border-border-strong p-4 mt-4">
                  {/* Y Axis Labels */}
                  <div className="absolute -left-8 top-0 text-[9px] font-mono text-text-tertiary">
                    1.0
                  </div>
                  <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-[9px] font-mono text-text-tertiary">
                    0.5
                  </div>
                  <div className="absolute -left-8 bottom-0 text-[9px] font-mono text-text-tertiary">
                    0.0
                  </div>

                  {/* SVG Line Chart */}
                  <svg
                    className="absolute inset-0 w-full h-full overflow-visible"
                    viewBox="0 0 300 200"
                    preserveAspectRatio="none"
                  >
                    {/* Threshold Line */}
                    <path
                      d="M 0,40 L 300,40"
                      fill="none"
                      stroke="#e8342a"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      className="opacity-30"
                    />
                    {/* Control Limit */}
                    <path
                      d="M 0,150 C 50,150 100,40 150,60 C 200,80 250,20 300,10"
                      fill="none"
                      stroke="#2a2a2a"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    {/* Actual Score */}
                    <path
                      d="M 0,140 C 50,140 100,10 150,30 C 200,50 250,140 300,160"
                      fill="none"
                      stroke="#e8342a"
                      strokeWidth="2"
                    />
                    <rect
                      x="148"
                      y="28"
                      width="4"
                      height="4"
                      fill="#e8342a"
                    />
                  </svg>

                  {/* Threshold Label */}
                  <div className="absolute top-[32px] right-0 text-[9px] font-mono text-accent-red opacity-70">
                    THRESHOLD (0.99)
                  </div>

                  {/* X Axis Labels */}
                  <div className="absolute -bottom-6 left-0 text-[9px] font-mono text-text-tertiary">
                    t-60s
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-mono text-text-tertiary">
                    t-30s
                  </div>
                  <div className="absolute -bottom-6 right-0 text-[9px] font-mono text-text-tertiary">
                    NOW
                  </div>

                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-surface-raised border border-accent-red text-accent-red font-mono text-[10px] font-bold px-2 py-1 uppercase tracking-wider z-10 rounded-sm">
                    Anomaly Detected
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </AnimatedSection>

      {/* ── Bento Grid Section ── */}
      <AnimatedSection className="w-full max-w-7xl mx-auto px-6 py-16 md:py-24 border-t border-border-default">
        <div className="text-left mb-12 md:mb-20 md:flex md:justify-between md:items-end">
          <div className="max-w-2xl">
            <h2 className="text-2xl md:text-4xl font-serif font-bold mb-6 text-text-primary tracking-tight leading-tight">
              Decoupled Architecture.{" "}
              <br />
              <span className="text-text-secondary">Built on Postgres.</span>
            </h2>
          </div>
          <p className="text-base text-text-secondary max-w-md leading-relaxed font-medium">
            A completely decoupled architecture. The API stays lightweight and
            stateless, while heavy PageRank computations run asynchronously on a
            dedicated worker pool.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 auto-rows-auto md:auto-rows-[300px]">
          {/* Big Cell - 2x2 */}
          <Card
            variant="surface"
            padding="lg"
            className="md:col-span-2 md:row-span-2 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="w-10 h-10 bg-surface-raised border border-border-strong flex items-center justify-center mb-6 rounded-sm">
                <Network className="w-5 h-5 text-text-primary" />
              </div>
              <h3 className="text-xl md:text-2xl font-serif font-bold text-text-primary mb-4">
                Sub-millisecond Routing
              </h3>
              <p className="text-sm md:text-base text-text-secondary max-w-md leading-relaxed">
                TRACE utilizes a continuous background worker that updates a
                highly-indexed <code>graph_scores</code> table in Postgres. When
                a transaction occurs, the API performs an{" "}
                <code>O(1)</code> lookup, yielding a trust decision in under 5ms.
              </p>
            </div>
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
          </Card>

          {/* Small Cell */}
          <Card variant="surface" padding="md" className="flex flex-col">
            <div className="w-10 h-10 bg-surface-raised border border-border-strong flex items-center justify-center mb-6 rounded-sm">
              <Database className="w-5 h-5 text-text-primary" />
            </div>
            <h3 className="text-lg font-serif font-bold text-text-primary mb-3">
              Supabase Native
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Leveraging the Supabase Transaction Pooler (PgBouncer) for massive
              connection concurrency across global serverless edges.
            </p>
          </Card>

          {/* Small Cell */}
          <Card
            variant="surface"
            padding="md"
            className="flex flex-col relative overflow-hidden"
          >
            <div className="w-10 h-10 bg-surface-raised border border-border-strong flex items-center justify-center mb-6 rounded-sm">
              <Globe2 className="w-5 h-5 text-text-primary" />
            </div>
            <h3 className="text-lg font-serif font-bold text-text-primary mb-3">
              Global Resilience
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Deploy TRACE on your own infrastructure or use our managed edge
              endpoints located near major AWS/GCP regions.
            </p>
          </Card>

          {/* Full-width Cell */}
          <Card
            variant="surface"
            padding="lg"
            className="md:col-span-3 flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-12"
          >
            <div className="flex-1">
              <div className="w-10 h-10 bg-surface-raised border border-border-strong flex items-center justify-center mb-6 rounded-sm">
                <Code2 className="w-5 h-5 text-text-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-serif font-bold text-text-primary mb-3">
                Developer-First Integration
              </h3>
              <p className="text-sm md:text-base text-text-secondary max-w-lg leading-relaxed">
                Add Sybil resistance to your protocol with a single API call. We
                provide typed SDKs for Python, Node.js, and Rust. No need to
                manage complex graph databases yourself.
              </p>
            </div>

            <div className="w-full md:w-1/2 bg-surface-base border border-border-default p-6 rounded-md">
              <pre className="text-sm font-mono text-text-secondary leading-loose overflow-x-auto">
                <span className="text-text-tertiary">import</span> {"{"} TRACE{" "}
                {"}"} <span className="text-text-tertiary">from</span>{" "}
                <span className="text-text-primary">
                  &apos;@trace/sdk&apos;
                </span>
                ;
                <br />
                <br />
                <span className="text-text-tertiary">const</span> trace ={" "}
                <span className="text-text-tertiary">new</span>{" "}
                TRACE(process.env.
                <span className="text-text-primary">TRACE_KEY</span>);
                <br />
                <br />
                <span className="text-border-hover">
                  {"// Wrap your transaction execution"}
                </span>
                <br />
                <span className="text-text-tertiary">const</span> decision ={" "}
                <span className="text-text-tertiary">await</span> trace.score(
                {"{"}
                <br />
                {"  "}provider_id:{" "}
                <span className="text-text-primary">
                  &apos;agent_0x9f&apos;
                </span>
                ,
                <br />
                {"  "}consumer_id:{" "}
                <span className="text-text-primary">
                  &apos;agent_0x3a&apos;
                </span>
                <br />
                {"}"});
                <br />
                <br />
                <span className="text-text-tertiary">if</span>{" "}
                (decision.action ==={" "}
                <span className="text-accent-red">&apos;block&apos;</span>)
                throw SybilError;
              </pre>
            </div>
          </Card>
        </div>
      </AnimatedSection>

      {/* ── Deep Dive Sticky Scroll ── */}
      <AnimatedSection className="w-full max-w-7xl mx-auto px-6 py-24 md:py-32 border-t border-border-default">
        <div className="flex flex-col md:flex-row gap-12 md:gap-20">
          <div className="md:w-1/3">
            <div className="sticky top-32">
              <h2 className="text-2xl md:text-4xl font-serif font-bold mb-6 text-text-primary leading-tight">
                The Math <br />
                Behind
                <br /> TRACE.
              </h2>
              <p className="text-base text-text-secondary leading-relaxed mb-8">
                How TRACE scales trust using Bayesian probability and spectral
                graph theory.
              </p>
              <Link
                href="/research"
                className="text-text-primary font-mono text-sm uppercase tracking-wider flex items-center gap-2 hover:gap-3 opacity-80 hover:opacity-100 transition-all duration-200"
              >
                Read the TRACE Paper <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="md:w-2/3 flex flex-col gap-12 border-l border-border-default pl-8 md:pl-12">
            {[
              {
                phase: "Phase 01",
                title: "NodeRank Computation",
                body: "Similar to PageRank, we model the agent economy as a directed, weighted graph. Agents that receive transactions from highly-trusted agents gain trust themselves. However, to prevent Sybil cycles (where bots trade with each other to boost scores), we apply a heavy damping factor and penalize dense, isolated subgraphs.",
              },
              {
                phase: "Phase 02",
                title: "CUSUM Control Charts",
                body: "A static threshold doesn't work for dynamic economies. TRACE uses Cumulative Sum (CUSUM) algorithms to detect small, persistent shifts in transaction behavior over time. If a cluster of agents slowly increases their failure rates, the CUSUM score drifts upward until it crosses our mathematically optimal control limit.",
              },
              {
                phase: "Phase 03",
                title: "Bayesian Updating",
                body: "Every transaction acts as new evidence. We calculate P(Sybil | Tx) using Bayes' theorem. Because the prior P(Sybil) is continuously updated by the graph worker, the API only needs to perform a lightning-fast posterior calculation to make the final allow/block decision.",
              },
            ].map((item) => (
              <div key={item.phase} className="flex flex-col gap-4">
                <div className="font-mono text-xs text-text-tertiary border-b border-border-default pb-2 uppercase tracking-widest">
                  {item.phase}
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-text-primary mb-4">
                    {item.title}
                  </h3>
                  <p className="text-base text-text-secondary leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ── Bottom CTA ── */}
      <AnimatedSection className="w-full py-24 md:py-32 border-t border-border-default bg-surface-muted">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-serif font-bold mb-8 text-text-primary tracking-tight">
            Ready to secure your network?
          </h2>
          <p className="text-lg text-text-secondary mb-12">
            Get 10,000 free API calls to test TRACE in your staging environment.
          </p>
          <Button variant="primary" size="lg" href="/portal">
            Create Developer Account
          </Button>
        </div>
      </AnimatedSection>
    </div>
  );
}
