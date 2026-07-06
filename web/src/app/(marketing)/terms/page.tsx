import ArticleLayout from "@/components/ArticleLayout";

export default function TermsPage() {
  const toc = [
    { id: "acceptance", label: "Acceptance of Terms" },
    { id: "acceptable-use", label: "Acceptable Use" },
    { id: "rate-limits", label: "Rate Limits & Billing" },
    { id: "sybil-mitigation", label: "Sybil Mitigation" },
    { id: "disclaimer", label: "Disclaimer" },
  ];

  return (
    <ArticleLayout
      title="Terms of Service"
      subtitle="Last updated: July 2026"
      backLink={{ href: "/company", label: "Back to Company" }}
      toc={toc}
    >
      <h2 id="acceptance">1. Acceptance of Terms</h2>
      <p>
        By accessing or using the TRACE API and associated infrastructure, you
        agree to be bound by these Terms of Service. TRACE provides an
        enterprise-grade trust routing and Sybil resistance layer for
        Agent-to-Agent (A2A) economies.
      </p>

      <h2 id="acceptable-use">2. Acceptable Use and Restrictions</h2>
      <p>
        You agree to use TRACE strictly for evaluating the trust and reliability
        of agents in your network. You shall not:
      </p>
      <ul>
        <li>
          Intentionally inject malicious cycles or artificially manufacture
          trust graphs to manipulate the scoring engine.
        </li>
        <li>
          Attempt to overflow, DoS, or otherwise disrupt the asynchronous
          PageRank calculation workers.
        </li>
        <li>
          Reverse-engineer the Bayesian lower confidence bound or CUSUM
          change-point detection algorithms to bypass detection.
        </li>
      </ul>

      <h2 id="rate-limits">3. Rate Limits and Billing</h2>
      <p>
        Usage of the TRACE API is subject to rate limiting. Strict rate limits
        apply to the free tier (including the 10,000 free API calls provided for
        staging environments). Paid tiers are billed based on API call volume as
        micro-fees. Failure to pay outstanding micro-fees will result in
        immediate suspension of API access.
      </p>

      <h2 id="sybil-mitigation">4. Sybil Swarm Mitigation</h2>
      <p>
        TRACE reserves the right to automatically block, throttle, or sinkhole
        traffic originating from what our models classify as coordinated Sybil
        swarms or collusion rings with a probability exceeding 0.99. We are not
        liable for any lost transaction volume resulting from accurate or
        false-positive anomaly detection.
      </p>

      <h2 id="disclaimer">5. Disclaimer of Warranties</h2>
      <p>
        The TRACE API is provided &quot;as is&quot; and &quot;as
        available&quot;. While our simulations demonstrate an 86% reduction in
        collusion fraud, we do not guarantee absolute protection against all
        forms of adversarial coordination. You remain responsible for the
        ultimate financial settlement and risk management within your
        marketplace.
      </p>
    </ArticleLayout>
  );
}
