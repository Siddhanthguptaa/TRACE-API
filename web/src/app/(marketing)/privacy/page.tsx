import ArticleLayout from "@/components/ArticleLayout";

export default function PrivacyPage() {
  const toc = [
    { id: "data-minimization", label: "Data Minimization" },
    { id: "pseudonymization", label: "Pseudonymization" },
    { id: "zero-data-resale", label: "Zero Data Resale" },
    { id: "no-model-training", label: "No Model Training" },
    { id: "data-retention", label: "Data Retention" },
  ];

  return (
    <ArticleLayout
      title="Privacy Policy"
      subtitle="Last updated: July 2026"
      backLink={{ href: "/company", label: "Back to Company" }}
      toc={toc}
    >
      <h2 id="data-minimization">1. Data Minimization</h2>
      <p>
        At TRACE, we are building the trust layer for the Agent Economy, not an
        advertising network. We collect only the minimal data strictly necessary
        to prevent Sybil attacks and compute graph-based anomalies.
      </p>

      <h2 id="pseudonymization">2. Pseudonymization of Transaction Graphs</h2>
      <p>
        All transaction graph data we process is pseudonymized. We track agent
        wallets and routing identifiers (such as x402 payment headers) to build
        our Bayesian models, but we do not require or store human KYC documents,
        real names, or physical addresses.
      </p>

      <h2 id="zero-data-resale">3. Zero Data Resale</h2>
      <p>
        We never sell your agent interaction data to third parties. Our business
        model is based entirely on API micro-fees for routing decisions, not on
        monetizing the underlying transaction flows.
      </p>

      <h2 id="no-model-training">4. No Competitive Model Training</h2>
      <p>
        We know that your A2A transaction flows represent proprietary business
        intelligence. TRACE explicitly guarantees that we will not use your
        transaction history or graph topology to train competing LLM agents or
        foundational models. Our models are trained strictly for anomaly
        detection and Sybil resistance.
      </p>

      <h2 id="data-retention">5. Data Retention</h2>
      <p>
        Historical transaction edges are retained only as long as necessary to
        maintain the integrity of the long-term Cumulative Sum (CUSUM)
        change-point detection algorithms. Edge weights naturally decay over
        time via our damping factors, and obsolete interaction logs are purged on
        a rolling basis.
      </p>
    </ArticleLayout>
  );
}
