import ArticleLayout from "@/components/ArticleLayout";

export default function ResearchPage() {
  const toc = [
    { id: "abstract", label: "Abstract" },
    { id: "sybil-resistance", label: "The Sybil Problem" },
    { id: "bayesian-updating", label: "Bayesian Reputation" },
    { id: "architecture", label: "Architecture" },
  ];

  return (
    <ArticleLayout
      title="Trust Routing with Adversarial Coordination Evidence (TRACE)"
      subtitle="TRACE Research Paper — Version 1.2 — July 2026"
      toc={toc}
    >
      <h2 id="abstract">1. Abstract</h2>
      <div className="bg-surface-muted border-l-4 border-border-strong p-6 my-6 text-sm italic text-text-secondary not-prose">
        <p className="mb-4">
          Decentralized agent marketplaces route paid work to pseudonymous
          providers. Any trust mechanism balances three pressures: bound fraud
          exposure, stay open to newcomers, and survive coordinated graph
          manipulation. We compare four routing policies (reputation-only,
          price-only, EigenTrust, and Trust Routing with Adversarial
          Coordination Evidence (TRACE), which combines uncertainty-aware
          evidence weighting with structural coordination detection in place of
          trust propagation) across four attack regimes at N=1,000 agents with
          30% adversaries, ten seeds per cell. Two results drive the story.
          Trust propagation amplifies coordinated attacks: EigenTrust routes
          81.7% of jobs to malicious agents under Sybil attack, while
          reputation-only contains it to 29.0%.
        </p>
        <p className="mb-4">
          Exploration is also costly under score-based adversaries. A component
          ablation shows that disabling Thompson sampling in TRACE reduces mean
          fraud from 10.7, 46.5, 19.0, and 83.7 sats to 4.7, 6.4, 7.1, and
          31.7 sats on strategic-default, collusion-ring, sybil-cluster, and
          game-theoretic-adversary. The greedy variant has the lowest fraud on
          the first three regimes; EigenTrust attains lower game-theoretic
          fraud (4.4) but at 41.2% malicious routing rate. A single-seed run at
          N=5,000 confirms EigenTrust&apos;s pathology persists at scale, and the
          propagating versus non-propagating ordering replicates on real-world
          signed-trust graphs (Bitcoin Over-The-Counter, Bitcoin Alpha). The
          findings caution against trust propagation in adversarial settings and
          motivate risk-conditioned exploration as a principled extension.
        </p>
        <p className="text-xs not-italic text-text-tertiary mt-4">
          — Abstract from &quot;TRACE: Graph-Aware Anomaly Detection for Trust
          Routing in Adversarial Decentralized Marketplaces&quot; (Nikunj
          Kaushik, Siddhanth Gupta, Sarthak Vashisht, Ruchi Bhatt), CIKM 2026
          Submission.
        </p>
      </div>

      <h2 id="sybil-resistance">2. The Sybil Problem in A2A Networks</h2>
      <p>
        A standard Sybil attack in our context involves an attacker spinning up
        hundreds of thousands of low-cost autonomous agents. These agents
        coordinate to artificially inflate the reputation of a central
        &quot;sink&quot; node by engaging in micro-transactions (or zero-value
        calls). Once the sink node achieves a high network reputation, it
        executes a devastating payload (e.g., a massive flash loan or liquidity
        drain).
      </p>

      <h2 id="bayesian-updating">3. Bayesian Reputation and NodeRank</h2>
      <p>
        TRACE approaches this not through static rate limiting, but through
        continuous probabilistic evaluation. For every transaction T between
        Consumer C and Provider P:
      </p>

      <div className="bg-surface-raised border border-border-default p-6 rounded-md font-mono text-sm text-text-primary my-8 text-center not-prose">
        P(Sybil | T) = [ P(T | Sybil) × P(Sybil) ] / P(T)
      </div>

      <p>
        The likelihood P(T | Sybil) is calculated using our proprietary{" "}
        <strong>NodeRank</strong> algorithm, heavily inspired by Google&apos;s
        PageRank but optimized for directed, weighted transaction graphs in
        PostgreSQL.
      </p>

      <h2 id="architecture">4. Decoupled Postgres Architecture</h2>
      <p>
        To achieve sub-millisecond API latency during the critical path of an
        agent transaction, the graph computation is completely decoupled. The
        TRACE API immediately writes the transaction state to a highly available
        Supabase PostgreSQL database.
      </p>
      <p>
        Asynchronously, a dedicated Python graph worker continuously polls the
        database, reconstructs the NetworkX subgraph, computes the updated
        NodeRank and clustering coefficients, and upserts the probabilistic
        anomalies back into the <code>graph_scores</code> table. The API simply
        performs an <code>O(1)</code> indexed lookup against this table, enabling
        it to block transactions in under 5ms.
      </p>
    </ArticleLayout>
  );
}
