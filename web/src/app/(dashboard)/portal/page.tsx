/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
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
  AlertCircle,
} from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export const dynamic = "force-dynamic";

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
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // 1. Authenticate with Supabase
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load Razorpay SDK dynamically
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const handleSignIn = async () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      || (typeof window !== "undefined" ? window.location.origin : "");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/portal`,
      },
    });
  };

  // Build auth headers lazily so every request gets the freshest token.
  // Using a function avoids stale-closure issues in React Query callbacks.
  const getAuthHeaders = useCallback(() => {
    if (!session?.access_token) return {};
    return { Authorization: `Bearer ${session.access_token}` };
  }, [session]);

  // 2. Fetch User Data
  const { data: me } = useQuery({
    queryKey: ["me", session?.access_token],
    queryFn: async () => {
      const headers = getAuthHeaders();
      if (!headers.Authorization) return null;
      const res = await axios.get(`${API_BASE}/portal/me`, { headers });
      return res.data;
    },
    enabled: !!session?.access_token,
  });

  // 3. Fetch Transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", session?.access_token],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/portal/transactions?limit=50`, {
        headers: getAuthHeaders(),
      });
      return res.data;
    },
    enabled: !!session?.access_token && (activeTab === "billing" || activeTab === "overview"),
  });

  // 4. Fetch Audit Log
  const { data: auditEvents = [] } = useQuery({
    queryKey: ["audit", session?.access_token],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/portal/audit?limit=50`, {
        headers: getAuthHeaders(),
      });
      return res.data;
    },
    enabled: !!session?.access_token && activeTab === "audit",
  });

  // 5. Fetch Settings
  const { data: devSettings } = useQuery({
    queryKey: ["settings", session?.access_token],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/portal/settings`, {
        headers: getAuthHeaders(),
      });
      return res.data;
    },
    enabled: !!session?.access_token && activeTab === "settings",
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
        { headers: getAuthHeaders() }
      );
      return res.data;
    },
    onSuccess: (data) => {
      setNewKey(data.key);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail || "Failed to create API key");
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: number) => {
      await axios.delete(`${API_BASE}/portal/keys/${keyId}`, {
        headers: getAuthHeaders(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail || "Failed to revoke API key");
    },
  });

  const rotateKeyMutation = useMutation({
    mutationFn: async (keyId: number) => {
      const res = await axios.post(
        `${API_BASE}/portal/keys/${keyId}/rotate`,
        {},
        { headers: getAuthHeaders() }
      );
      return res.data;
    },
    onSuccess: (data) => {
      setNewKey(data.key);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail || "Failed to rotate API key");
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (paymentData: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
      const res = await axios.post(
        `${API_BASE}/portal/verify-payment`,
        paymentData,
        { headers: getAuthHeaders() }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail || "Payment verification failed. Your balance will update shortly.");
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await axios.post(
        `${API_BASE}/portal/checkout`,
        { amount_usdc: amount },
        { headers: getAuthHeaders() }
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
          handler: (response: any) => {
            // Verify payment server-side and credit balance immediately
            verifyPaymentMutation.mutate({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
          },
        });
        rzp.open();
      } else {
        setError("Payment gateway is loading. Please try again in a moment.");
      }
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail || "Failed to initiate checkout");
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: {
      webhook_url?: string;
      notification_email?: string;
    }) => {
      const res = await axios.put(`${API_BASE}/portal/settings`, settings, {
        headers: getAuthHeaders(),
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

  if (!session)
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mx-auto mb-6">
            <Shield className="w-6 h-6 text-text-primary" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-text-primary mb-2">
            Welcome to TRACE
          </h1>
          <p className="text-sm text-text-secondary mb-8">
            Sign in to access your developer portal, manage API keys, and monitor trust scoring.
          </p>
          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-border-default bg-surface-muted hover:bg-surface-raised transition-colors text-sm font-medium text-text-primary"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    );

  const apiKeys =
    me?.active_keys?.map((key: any) => ({
      id: key.id,
      name: key.is_test ? "Test Key" : "Live Key",
      prefix: key.key_prefix,
      scope: key.scope,
      created_at: key.created_at,
    })) || [];

  return (
    <div className="w-full min-h-[calc(100vh-56px)] flex bg-surface-base">

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

          {/* Error notification */}
          {error && (
            <div className="mb-6 p-4 bg-accent-red/10 border border-accent-red/20 rounded-md flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-accent-red mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-text-primary">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-xs text-text-tertiary hover:text-text-primary"
              >
                Dismiss
              </button>
            </div>
          )}

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
