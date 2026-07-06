/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  KeyRound,
  CreditCard,
  Activity,
  Settings,
  LogOut,
  Plus,
  Copy,
  CheckCircle2,
  Trash2,
  RotateCw,
  Shield,
  FileText,
} from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const tabs = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "keys", label: "API Keys", icon: KeyRound },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "audit", label: "Audit Log", icon: Shield },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type TabId = (typeof tabs)[number]["id"];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PortalPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [copied, setCopied] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // 1. Authenticate with Supabase
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (!session && process.env.NODE_ENV !== "development") {
        window.location.href = "/";
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const authHeaders = session
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};

  // 2. Fetch User Data
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      if (!session) return null;
      const res = await axios.get(`${API_BASE}/portal/me`, {
        headers: authHeaders,
      });
      return res.data;
    },
    enabled: !!session,
  });

  // 3. Fetch Transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/portal/transactions?limit=50`, {
        headers: authHeaders,
      });
      return res.data;
    },
    enabled: !!session && (activeTab === "billing" || activeTab === "overview"),
  });

  // 4. Fetch Audit Log
  const { data: auditEvents = [] } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/portal/audit?limit=50`, {
        headers: authHeaders,
      });
      return res.data;
    },
    enabled: !!session && activeTab === "audit",
  });

  // 5. Fetch Settings
  const { data: devSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/portal/settings`, {
        headers: authHeaders,
      });
      return res.data;
    },
    enabled: !!session && activeTab === "settings",
  });

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(text);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  // Mutations
  const createKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post(
        `${API_BASE}/portal/keys`,
        { is_test: false, scope: "full_access" },
        { headers: authHeaders }
      );
      return res.data;
    },
    onSuccess: (data) => {
      setNewKey(data.key);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: number) => {
      await axios.delete(`${API_BASE}/portal/keys/${keyId}`, {
        headers: authHeaders,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });

  const rotateKeyMutation = useMutation({
    mutationFn: async (keyId: number) => {
      const res = await axios.post(
        `${API_BASE}/portal/keys/${keyId}/rotate`,
        {},
        { headers: authHeaders }
      );
      return res.data;
    },
    onSuccess: (data) => {
      setNewKey(data.key);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await axios.post(
        `${API_BASE}/portal/checkout`,
        { amount_usdc: amount },
        { headers: authHeaders }
      );
      return res.data;
    },
    onSuccess: (data) => {
      // Open Razorpay checkout
      if (typeof window !== "undefined" && (window as any).Razorpay) {
        const rzp = new (window as any).Razorpay({
          key: data.key_id,
          order_id: data.order_id,
          amount: data.amount_inr,
          currency: "INR",
          name: "TRACE",
          description: "API Credits Top-up",
          handler: () => {
            queryClient.invalidateQueries({ queryKey: ["me"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
          },
        });
        rzp.open();
      }
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: {
      webhook_url?: string;
      notification_email?: string;
    }) => {
      const res = await axios.put(`${API_BASE}/portal/settings`, settings, {
        headers: authHeaders,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (authLoading)
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-border-default border-t-text-primary rounded-full animate-spin" />
      </div>
    );

  const apiKeys =
    me?.active_keys?.map((prefix: string, i: number) => ({
      id: i,
      name: "API Key",
      prefix,
      lastUsed: "Recently",
    })) || [];

  return (
    <div className="w-full min-h-[calc(100vh-56px)] flex bg-surface-base">
      {/* Razorpay SDK Script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />

      <aside
        className="w-64 border-r border-border-default bg-surface-muted p-6 hidden md:flex flex-col"
        role="navigation"
      >
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-2 h-2 rounded-full bg-accent-green" />
          <span className="text-xs font-mono text-text-tertiary">
            LIVE_MODE
          </span>
        </div>

        <nav className="flex flex-col gap-2 flex-1" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-surface-overlay text-text-primary"
                    : "text-text-tertiary hover:text-text-primary hover:bg-surface-raised"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <Button
          variant="danger"
          size="sm"
          onClick={handleSignOut}
          className="mt-auto"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </aside>

      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-base border-t border-border-default flex"
        role="tablist"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-text-primary"
                  : "text-text-tertiary"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto pb-20 md:pb-12">
        <div className="max-w-5xl mx-auto">
          <header className="mb-12">
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">
              Developer Portal
            </h1>
            <p className="text-text-secondary text-sm">
              Manage your API keys, monitor usage, and configure billing.
            </p>
          </header>

          {/* New key banner */}
          {newKey && (
            <div className="mb-8 p-4 bg-accent-green/10 border border-accent-green/20 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-accent-green" />
                <span className="text-sm font-medium text-text-primary">
                  New API Key Created
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-2">
                Copy this key now — it won&apos;t be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-surface-raised px-3 py-2 rounded flex-1 text-text-primary break-all">
                  {newKey}
                </code>
                <button
                  onClick={() => handleCopy(newKey)}
                  className="p-2 text-text-tertiary hover:text-text-primary"
                >
                  {copied === newKey ? (
                    <CheckCircle2 className="w-4 h-4 text-accent-green" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <button
                onClick={() => setNewKey(null)}
                className="text-xs text-text-tertiary mt-2 hover:text-text-primary"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              role="tabpanel"
            >
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card variant="elevated" padding="md">
                  <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-widest mb-4">
                    Available Balance
                  </h3>
                  <p className="text-3xl font-bold text-text-primary flex items-baseline gap-2">
                    ${me?.balance_usdc?.toFixed(2) || "0.00"}{" "}
                    <span className="text-sm text-text-tertiary font-normal">
                      USDC
                    </span>
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab("billing")}
                    className="mt-6 w-full justify-center"
                  >
                    Top Up Balance
                  </Button>
                </Card>

                <Card
                  variant="elevated"
                  padding="md"
                  className="md:col-span-2"
                >
                  <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-widest mb-4">
                    Recent Transactions
                  </h3>
                  {transactions.length === 0 ? (
                    <div className="text-sm text-text-tertiary py-4 text-center">
                      No transactions yet
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {transactions.slice(0, 5).map((t: any) => (
                        <div
                          key={t.id}
                          className="flex justify-between text-sm py-1"
                        >
                          <span className="text-text-secondary">
                            {t.transaction_type === "top_up"
                              ? "Top Up"
                              : t.endpoint || "API Call"}
                          </span>
                          <span
                            className={
                              t.amount_usdc >= 0
                                ? "text-accent-green"
                                : "text-text-primary"
                            }
                          >
                            {t.amount_usdc >= 0 ? "+" : ""}$
                            {Math.abs(t.amount_usdc).toFixed(4)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              <Card variant="elevated" padding="none">
                <div className="px-6 py-5 border-b border-border-default flex items-center justify-between bg-surface-muted rounded-t-md">
                  <h3 className="text-sm font-bold text-text-primary">
                    Active API Keys
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => createKeyMutation.mutate()}
                  >
                    <Plus className="w-4 h-4" /> Create Secret Key
                  </Button>
                </div>
                {apiKeys.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <KeyRound className="w-8 h-8 text-text-tertiary mx-auto mb-4" />
                    <p className="text-sm text-text-secondary mb-2">
                      No API keys yet
                    </p>
                    <p className="text-xs text-text-tertiary mb-6">
                      Create your first API key to start integrating TRACE.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => createKeyMutation.mutate()}
                    >
                      <Plus className="w-4 h-4" /> Create Secret Key
                    </Button>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-muted text-text-tertiary">
                      <tr>
                        <th className="px-6 py-3 font-medium">Name</th>
                        <th className="px-6 py-3 font-medium">Token Prefix</th>
                        <th className="px-6 py-3 font-medium text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {apiKeys.map((key: any) => (
                        <tr
                          key={key.id}
                          className="hover:bg-surface-raised transition-colors"
                        >
                          <td className="px-6 py-4 text-text-primary font-medium">
                            {key.name}
                          </td>
                          <td className="px-6 py-4 font-mono text-text-secondary">
                            {key.prefix}
                          </td>
                          <td className="px-6 py-4 text-right flex gap-1 justify-end">
                            <button
                              onClick={() => handleCopy(key.prefix)}
                              className="text-text-tertiary hover:text-text-primary transition-colors p-1"
                              title="Copy prefix"
                            >
                              {copied === key.prefix ? (
                                <CheckCircle2 className="w-4 h-4 text-accent-green" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => rotateKeyMutation.mutate(key.id)}
                              className="text-text-tertiary hover:text-text-primary transition-colors p-1"
                              title="Rotate key"
                            >
                              <RotateCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => revokeKeyMutation.mutate(key.id)}
                              className="text-text-tertiary hover:text-accent-red transition-colors p-1"
                              title="Revoke key"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </motion.div>
          )}

          {/* KEYS TAB */}
          {activeTab === "keys" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              role="tabpanel"
            >
              <Card variant="elevated" padding="none">
                <div className="px-6 py-5 border-b border-border-default flex items-center justify-between bg-surface-muted rounded-t-md">
                  <h3 className="text-sm font-bold text-text-primary">
                    All API Keys
                  </h3>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => createKeyMutation.mutate()}
                  >
                    <Plus className="w-4 h-4" /> Create Secret Key
                  </Button>
                </div>
                {apiKeys.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <KeyRound className="w-8 h-8 text-text-tertiary mx-auto mb-4" />
                    <p className="text-sm text-text-secondary">
                      No API keys yet. Create one to get started.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-muted text-text-tertiary">
                      <tr>
                        <th className="px-6 py-3 font-medium">Name</th>
                        <th className="px-6 py-3 font-medium">Token Prefix</th>
                        <th className="px-6 py-3 font-medium text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {apiKeys.map((key: any) => (
                        <tr
                          key={key.id}
                          className="hover:bg-surface-raised transition-colors"
                        >
                          <td className="px-6 py-4 text-text-primary font-medium">
                            {key.name}
                          </td>
                          <td className="px-6 py-4 font-mono text-text-secondary">
                            {key.prefix}
                          </td>
                          <td className="px-6 py-4 text-right flex gap-1 justify-end">
                            <button
                              onClick={() => handleCopy(key.prefix)}
                              className="text-text-tertiary hover:text-text-primary transition-colors p-1"
                              title="Copy prefix"
                            >
                              {copied === key.prefix ? (
                                <CheckCircle2 className="w-4 h-4 text-accent-green" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => rotateKeyMutation.mutate(key.id)}
                              className="text-text-tertiary hover:text-text-primary transition-colors p-1"
                              title="Rotate key"
                            >
                              <RotateCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => revokeKeyMutation.mutate(key.id)}
                              className="text-text-tertiary hover:text-accent-red transition-colors p-1"
                              title="Revoke key"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </motion.div>
          )}

          {/* BILLING TAB */}
          {activeTab === "billing" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              role="tabpanel"
              className="space-y-6"
            >
              <div className="grid md:grid-cols-2 gap-6">
                <Card variant="elevated" padding="md">
                  <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-widest mb-4">
                    Current Balance
                  </h3>
                  <p className="text-3xl font-bold text-text-primary mb-6">
                    ${me?.balance_usdc?.toFixed(2) || "0.00"}{" "}
                    <span className="text-sm text-text-tertiary font-normal">
                      USDC
                    </span>
                  </p>
                  <div className="flex gap-3">
                    {[10, 25, 50, 100].map((amount) => (
                      <Button
                        key={amount}
                        variant="secondary"
                        size="sm"
                        onClick={() => checkoutMutation.mutate(amount)}
                        disabled={checkoutMutation.isPending}
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>
                </Card>

                <Card variant="elevated" padding="md">
                  <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-widest mb-4">
                    Pricing
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">
                        Score API Call
                      </span>
                      <span className="text-text-primary font-mono">
                        $0.005
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">
                        Batch (per provider)
                      </span>
                      <span className="text-text-primary font-mono">
                        $0.005
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Event Report</span>
                      <span className="text-text-primary font-mono">
                        $0.005
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              <Card variant="elevated" padding="none">
                <div className="px-6 py-5 border-b border-border-default bg-surface-muted rounded-t-md">
                  <h3 className="text-sm font-bold text-text-primary">
                    Transaction History
                  </h3>
                </div>
                {transactions.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <FileText className="w-8 h-8 text-text-tertiary mx-auto mb-4" />
                    <p className="text-sm text-text-secondary">
                      No transactions yet
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-muted text-text-tertiary">
                      <tr>
                        <th className="px-6 py-3 font-medium">Type</th>
                        <th className="px-6 py-3 font-medium">Endpoint</th>
                        <th className="px-6 py-3 font-medium text-right">
                          Amount
                        </th>
                        <th className="px-6 py-3 font-medium text-right">
                          Balance After
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {transactions.map((t: any) => (
                        <tr
                          key={t.id}
                          className="hover:bg-surface-raised transition-colors"
                        >
                          <td className="px-6 py-3 text-text-secondary capitalize">
                            {t.transaction_type.replace("_", " ")}
                          </td>
                          <td className="px-6 py-3 font-mono text-xs text-text-tertiary">
                            {t.endpoint || "—"}
                          </td>
                          <td
                            className={`px-6 py-3 text-right font-mono ${
                              t.amount_usdc >= 0
                                ? "text-accent-green"
                                : "text-text-primary"
                            }`}
                          >
                            {t.amount_usdc >= 0 ? "+" : ""}$
                            {Math.abs(t.amount_usdc).toFixed(4)}
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-text-secondary">
                            ${t.balance_after.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </motion.div>
          )}

          {/* AUDIT LOG TAB */}
          {activeTab === "audit" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              role="tabpanel"
            >
              <Card variant="elevated" padding="none">
                <div className="px-6 py-5 border-b border-border-default bg-surface-muted rounded-t-md">
                  <h3 className="text-sm font-bold text-text-primary">
                    Audit Log
                  </h3>
                </div>
                {auditEvents.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <Shield className="w-8 h-8 text-text-tertiary mx-auto mb-4" />
                    <p className="text-sm text-text-secondary">
                      No audit events yet
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-muted text-text-tertiary">
                      <tr>
                        <th className="px-6 py-3 font-medium">Event</th>
                        <th className="px-6 py-3 font-medium">Description</th>
                        <th className="px-6 py-3 font-medium">IP</th>
                        <th className="px-6 py-3 font-medium text-right">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {auditEvents.map((e: any) => (
                        <tr
                          key={e.id}
                          className="hover:bg-surface-raised transition-colors"
                        >
                          <td className="px-6 py-3 text-text-primary font-medium capitalize">
                            {e.event_type.replace(/_/g, " ")}
                          </td>
                          <td className="px-6 py-3 text-text-secondary text-xs">
                            {e.description || "—"}
                          </td>
                          <td className="px-6 py-3 font-mono text-xs text-text-tertiary">
                            {e.ip_address || "—"}
                          </td>
                          <td className="px-6 py-3 text-right text-xs text-text-tertiary">
                            {new Date(e.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </motion.div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              role="tabpanel"
              className="space-y-6"
            >
              <Card variant="elevated" padding="lg">
                <h3 className="text-sm font-bold text-text-primary mb-6">
                  Webhook Configuration
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-text-tertiary mb-1">
                      Webhook URL
                    </label>
                    <input
                      type="url"
                      defaultValue={devSettings?.webhook_url || ""}
                      placeholder="https://your-app.com/webhook"
                      className="w-full px-3 py-2 bg-surface-raised border border-border-default rounded-md text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-text-secondary"
                      onBlur={(e) =>
                        updateSettingsMutation.mutate({
                          webhook_url: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-tertiary mb-1">
                      Notification Email
                    </label>
                    <input
                      type="email"
                      defaultValue={devSettings?.notification_email || ""}
                      placeholder="alerts@your-company.com"
                      className="w-full px-3 py-2 bg-surface-raised border border-border-default rounded-md text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-text-secondary"
                      onBlur={(e) =>
                        updateSettingsMutation.mutate({
                          notification_email: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </Card>

              <Card variant="elevated" padding="lg">
                <h3 className="text-sm font-bold text-text-primary mb-2">
                  Account
                </h3>
                <p className="text-xs text-text-tertiary mb-4">
                  Signed in as{" "}
                  <strong className="text-text-secondary">
                    {me?.email || "—"}
                  </strong>
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </Card>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
