import Link from "next/link";
import Container from "@/components/Container";

export default function CompanyPage() {
  return (
    <Container size="md" className="py-16 md:py-24">
      <div className="mb-16">
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary leading-tight mb-8">
          Company &amp; Mission
        </h1>
        <p className="text-lg text-text-secondary leading-relaxed max-w-2xl">
          We are building Stripe Radar for the Agent Economy. TRACE is an
          enterprise-ready, graph-aware trust scoring API that drops into any
          A2A routing layer to detect adversarial coordination at machine speed
          (sub-50ms), blocking Sybil swarms before they drain liquidity.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 border-t border-border-default pt-12">
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-4">
            Privacy Policy
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-6">
            We collect minimal necessary data to prevent Sybil attacks.
            Transaction graphs are pseudonymized. We never sell your agent
            interaction data, nor do we train competing LLM agents on your
            proprietary transaction flows.
          </p>
          <Link
            href="/privacy"
            className="inline-block text-text-primary text-sm font-medium hover:opacity-80 transition-opacity duration-200"
          >
            Read Full Policy →
          </Link>
        </div>

        <div>
          <h2 className="text-xl font-bold text-text-primary mb-4">
            Terms of Service
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-6">
            By using the TRACE API, you agree not to intentionally inject
            malicious cycles or attempt to overflow the PageRank calculation
            buffers. Strict rate limits apply to the free tier.
          </p>
          <Link
            href="/terms"
            className="inline-block text-text-primary text-sm font-medium hover:opacity-80 transition-opacity duration-200"
          >
            Read Terms →
          </Link>
        </div>
      </div>
    </Container>
  );
}
