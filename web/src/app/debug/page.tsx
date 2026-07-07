"use client";

export default function DebugPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  return (
    <div style={{ padding: 40, fontFamily: "monospace", color: "#fff", background: "#000", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Environment Debug</h1>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
{JSON.stringify({
  NEXT_PUBLIC_SUPABASE_URL: url ? `SET (${url.length} chars): ${url.substring(0, 20)}...` : "EMPTY/UNDEFINED",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: key ? `SET (${key.length} chars): ${key.substring(0, 20)}...` : "EMPTY/UNDEFINED",
  NEXT_PUBLIC_API_URL: apiUrl ? `SET: ${apiUrl}` : "EMPTY/UNDEFINED",
}, null, 2)}
      </pre>
      <p style={{ marginTop: 20, color: "#888" }}>
        If values show as EMPTY/UNDEFINED, the env vars were not available at build time.
        Next.js replaces NEXT_PUBLIC_* at build time — they must be set BEFORE npm run build.
      </p>
    </div>
  );
}
