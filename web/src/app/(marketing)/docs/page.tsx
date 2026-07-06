"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Book, Code, Terminal, ChevronRight, Zap } from "lucide-react";
import Card from "@/components/Card";
import CodeBlock from "@/components/CodeBlock";

const sidebarSections = [
  {
    title: "Getting Started",
    items: [
      { id: "introduction", label: "Introduction", icon: Book, active: true },
      { id: "quickstart", label: "Quickstart", icon: Zap },
    ],
  },
  {
    title: "Core API",
    items: [
      { id: "score", label: "POST /v1/score", icon: Terminal },
      { id: "batch", label: "POST /v1/batch", icon: Terminal },
    ],
  },
  {
    title: "SDKs",
    items: [
      { id: "sdks", label: "Python SDK", icon: Code },
      { id: "sdks", label: "Node.js SDK", icon: Code },
    ],
  },
];

const tocItems = [
  { id: "introduction", label: "Introduction" },
  { id: "quickstart", label: "Quickstart" },
  { id: "score", label: "Score a Transaction" },
  { id: "batch", label: "Batch Scoring" },
  { id: "sdks", label: "Official SDKs" },
];

export default function DocsPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="w-full flex min-h-[calc(100vh-64px)] bg-surface-base">
      {/* Mobile sidebar toggle */}
      <button
        className="md:hidden fixed bottom-6 right-6 z-40 bg-text-primary text-text-inverse p-3 rounded-md shadow-lg"
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        aria-label="Toggle documentation navigation"
      >
        <Book className="w-5 h-5" />
      </button>

      {/* Left Sidebar */}
      <aside
        className={`${
          mobileNavOpen ? "fixed inset-0 z-30 bg-surface-base" : "hidden"
        } md:block md:relative md:w-64 border-r border-border-default bg-surface-muted overflow-y-auto`}
        role="navigation"
        aria-label="Documentation sidebar"
      >
        <div className="p-6">
          {mobileNavOpen && (
            <button
              onClick={() => setMobileNavOpen(false)}
              className="md:hidden mb-4 text-sm text-text-secondary hover:text-text-primary"
            >
              ← Close Menu
            </button>
          )}

          {sidebarSections.map((section) => (
            <div key={section.title} className="mb-8">
              <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-4">
                {section.title}
              </h4>
              <ul className="flex flex-col gap-2">
                {section.items.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <li key={`${item.id}-${i}`}>
                      <a
                        href={`#${item.id}`}
                        onClick={() => setMobileNavOpen(false)}
                        className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors ${
                          item.active
                            ? "bg-surface-overlay text-text-primary font-medium"
                            : "text-text-secondary hover:text-text-primary hover:bg-surface-raised"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl p-6 md:p-12 lg:p-16 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 text-sm text-text-tertiary mb-6">
            <span>Docs</span> <ChevronRight className="w-3 h-3" />{" "}
            <span className="text-text-primary">Introduction</span>
          </div>

          <h1
            id="introduction"
            className="text-3xl font-bold text-text-primary mb-6 tracking-tight"
          >
            Introduction
          </h1>
          <p className="text-base text-text-secondary leading-relaxed mb-12">
            TRACE is an enterprise-ready, graph-aware trust scoring API that
            drops into any A2A routing layer. We use Bayesian statistics and
            continuous graph-anomaly detection to evaluate peer trust in under 50
            milliseconds, blocking Sybil swarms before they steal a single cent.
          </p>

          <hr className="border-border-default my-12" />

          <h2
            id="quickstart"
            className="text-xl font-bold text-text-primary mb-6"
          >
            Quickstart
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-8">
            Get started by integrating the TRACE middleware into your
            agent&apos;s routing logic.
          </p>
          <CodeBlock className="mb-16">
            <span className="text-text-tertiary"># Install the Python SDK</span>
            <br />
            pip install trace-sdk
            <br />
            <br />
            <span className="text-text-tertiary"># Initialize</span>
            <br />
            <span className="text-accent-red">from</span> trace{" "}
            <span className="text-accent-red">import</span> TraceClient
            <br />
            client = TraceClient(api_key=
            <span className="text-accent-green">&quot;trc_live_...&quot;</span>)
          </CodeBlock>

          <hr className="border-border-default my-12" />

          <h2
            id="score"
            className="text-xl font-bold text-text-primary mb-6"
          >
            Score a Transaction
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-8">
            The{" "}
            <code className="bg-surface-raised px-1.5 py-0.5 rounded-sm text-sm font-mono text-text-primary">
              /v1/score
            </code>{" "}
            endpoint evaluates a pending transaction between two agents. It
            returns a probabilistic <code>trust_score</code> and an immediate{" "}
            <code>allow</code> or <code>block</code> decision based on the
            underlying CUSUM cluster anomaly detection.
          </p>

          <CodeBlock title="https://api.trace.ai/v1/score" language="POST" className="mb-16">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-text-tertiary mb-2">
                  {"// Request Payload"}
                </div>
                <pre className="text-text-secondary">
                  {"{"}
                  <br />
                  {"  "}
                  <span className="text-accent-red">&quot;provider_id&quot;</span>
                  :{" "}
                  <span className="text-accent-green">
                    &quot;agent_1x9&quot;
                  </span>
                  ,<br />
                  {"  "}
                  <span className="text-accent-red">&quot;consumer_id&quot;</span>
                  :{" "}
                  <span className="text-accent-green">
                    &quot;agent_2a4&quot;
                  </span>
                  ,<br />
                  {"  "}
                  <span className="text-accent-red">&quot;amount&quot;</span>:{" "}
                  <span className="text-text-primary">5.50</span>
                  <br />
                  {"}"}
                </pre>
              </div>
              <div>
                <div className="text-text-tertiary mb-2">{"// Response"}</div>
                <pre className="text-text-secondary">
                  {"{"}
                  <br />
                  {"  "}
                  <span className="text-accent-red">&quot;action&quot;</span>:{" "}
                  <span className="text-accent-green">&quot;allow&quot;</span>,
                  <br />
                  {"  "}
                  <span className="text-accent-red">
                    &quot;trust_score&quot;
                  </span>
                  : <span className="text-text-primary">92.4</span>,<br />
                  {"  "}
                  <span className="text-accent-red">
                    &quot;graph_metrics&quot;
                  </span>
                  : {"{"}
                  <br />
                  {"    "}
                  <span className="text-accent-red">
                    &quot;sybil_probability&quot;
                  </span>
                  : <span className="text-text-primary">0.001</span>
                  <br />
                  {"  "}
                  {"}"}
                  <br />
                  {"}"}
                </pre>
              </div>
            </div>
          </CodeBlock>

          <hr className="border-border-default my-12" />

          <h2
            id="batch"
            className="text-xl font-bold text-text-primary mb-6"
          >
            Batch Scoring
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-8">
            Use the{" "}
            <code className="bg-surface-raised px-1.5 py-0.5 rounded-sm text-sm font-mono text-text-primary">
              /v1/batch
            </code>{" "}
            endpoint to evaluate up to 500 agents in a single request. Ideal for
            pre-filtering a large pool of providers before executing a matching
            algorithm.
          </p>
          <CodeBlock className="mb-16">
            <span className="text-text-tertiary">{"// Request"}</span>
            <br />
            POST /v1/batch
            <br />
            {"{"}{" "}
            <span className="text-accent-red">&quot;providers&quot;</span>: [
            <span className="text-accent-green">&quot;agent_1&quot;</span>,{" "}
            <span className="text-accent-green">&quot;agent_2&quot;</span>] {"}"}
          </CodeBlock>

          <hr className="border-border-default my-12" />

          <h2
            id="sdks"
            className="text-xl font-bold text-text-primary mb-6"
          >
            Official SDKs
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-8">
            TRACE maintains official typed SDKs for Python and Node.js. These
            libraries handle authentication, request batching, and error retries
            out of the box.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
            <Card
              variant="elevated"
              padding="md"
              className="hover:-translate-y-1 transition-transform duration-200 cursor-pointer"
            >
              <Code className="w-6 h-6 text-accent-red mb-4" />
              <h3 className="text-text-primary font-bold mb-2">Python SDK</h3>
              <p className="text-text-tertiary text-sm">
                Perfect for FastAPI and Flask backends.
              </p>
            </Card>
            <Card
              variant="elevated"
              padding="md"
              className="hover:-translate-y-1 transition-transform duration-200 cursor-pointer"
            >
              <Code className="w-6 h-6 text-accent-green mb-4" />
              <h3 className="text-text-primary font-bold mb-2">Node.js SDK</h3>
              <p className="text-text-tertiary text-sm">
                Built for Next.js, Express, and Edge workers.
              </p>
            </Card>
          </div>
        </motion.div>
      </main>

      {/* Right Sidebar (On This Page) */}
      <aside
        className="w-56 p-8 hidden lg:block sticky top-0 h-screen"
        aria-label="Table of contents"
      >
        <h4 className="text-xs font-bold text-text-primary uppercase tracking-widest mb-4">
          On this page
        </h4>
        <ul className="flex flex-col gap-2 text-sm text-text-tertiary border-l border-border-default">
          {tocItems.map((item, i) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={`pl-4 border-l-2 block py-1 transition-colors -ml-px ${
                  i === 0
                    ? "border-text-primary text-text-primary"
                    : "border-transparent hover:border-text-secondary hover:text-text-secondary"
                }`}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
