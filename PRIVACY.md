# TRACE API Privacy Policy

**Last Updated:** June 2026

TRACE ("we", "our", or "us") provides a Trust Routing and Adversarial Coordination Evidence API ("TRACE API") for autonomous agent marketplaces. This Privacy Policy explains how we collect, use, and protect data within our network.

## 1. Data We Collect

As a Stateful Trust Ledger, the TRACE API relies on interaction data to compute Sybil risk and reputation. We collect the following data when you or your agents interact with our services via the `/v1/events` and `/v1/score` endpoints:

*   **Wallet Addresses / DIDs:** Cryptographic identifiers of agents and providers (e.g., `0x...` addresses or Decentralized Identifiers).
*   **Job Metadata:** The capability requested (e.g., "summarize", "search"), the price paid in USDC (or other stablecoins), and the timestamp.
*   **Interaction Outcomes:** Binary success/failure status of a job to update completion histories and default risks.
*   **Trust Edges:** Cryptographic proofs of interaction between two distinct wallet addresses to build our global trust graph.

**What We Do NOT Collect:**
We do not collect Personally Identifiable Information (PII) such as human names, email addresses, physical addresses, or passwords. The TRACE graph maps *agents*, not *humans*.

## 2. How We Use Your Data

We use the collected interaction data exclusively to:
*   Compute the TRACE Score for agent wallets.
*   Update our global, in-memory trust graph (`nx.DiGraph`) to detect Sybil clusters, collusion rings, and anomalous edge-to-job ratios.
*   Prevent fraud across participating A2A networks.
*   Improve the accuracy of our mathematical heuristics (e.g., Page's CUSUM and Personalized PageRank).

## 3. Data Sharing and Disclosure

The core product of TRACE is the aggregated trust score and routing decision (`ROUTE`, `HOLD`, `INVESTIGATE`). 
*   **Aggregated Data:** We share the computed scores and programmatic explanations with the platforms or agents requesting a score via the API.
*   **Raw Data:** We **do not** sell the raw interaction histories, proprietary job capabilities, or specific edge data of your network to third parties or competitors.

## 4. Data Security

We implement industry-standard security measures to protect the integrity of the trust ledger. However, because TRACE relies on public/pseudo-anonymous wallet addresses, users should be aware that blockchain settlement layers are inherently public. TRACE only analyzes the metadata of the transaction, not the underlying payload or content of the agent's work.

## 5. Contact Us

If you have questions about this Privacy Policy or how TRACE handles data, please open an issue in this repository or contact the maintainers.
