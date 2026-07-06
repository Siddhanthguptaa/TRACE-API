# TRACE Frontend Audit

> Audited: July 5, 2026  
> Scope: Every file in `web/src/`, `web/public/`, and all config files.  
> Total files reviewed: 14 source files, 7 public assets, 6 config files.

---

## 1. Codebase Overview

### Stack Detected

| Layer              | Technology                                                                 |
|--------------------|---------------------------------------------------------------------------|
| Framework          | Next.js 16.2.10 (App Router) with React 19.2.4                           |
| Language           | TypeScript 5.x                                                            |
| Styling            | Tailwind CSS v4 (via `@tailwindcss/postcss`), plus CSS custom properties in `globals.css` |
| Animation          | GSAP 3.15 + ScrollTrigger (homepage), Framer Motion 12.x (docs, portal)  |
| 3D                 | Three.js 0.185 + React Three Fiber 9.x + Drei 10.x (hero background)    |
| Smooth Scroll      | Lenis 1.3.25 (imported but **never used** in any layout or page)         |
| Icons              | Lucide React 1.23                                                         |
| Fonts              | Geist Sans, Geist Mono, Fraunces (via `next/font/google`)               |
| State Management   | None — local `useState` only (portal page)                                |
| Build Tooling      | Next.js built-in bundler, ESLint 9 with next/core-web-vitals + typescript |

### High-Level Architecture Summary

```
web/src/
├── app/
│   ├── layout.tsx          ← Root layout (nav + footer, server component wrapping "use client" children)
│   ├── page.tsx            ← Homepage ("use client", 360 lines, monolithic)
│   ├── globals.css         ← Design tokens + Tailwind config
│   ├── company/page.tsx    ← Static company info page
│   ├── docs/page.tsx       ← API documentation ("use client")
│   ├── portal/page.tsx     ← Developer portal / dashboard ("use client")
│   ├── privacy/page.tsx    ← Privacy policy (server component)
│   ├── research/page.tsx   ← Research whitepaper (server component)
│   └── terms/page.tsx      ← Terms of service (server component)
├── components/
│   ├── NetworkGraph.tsx    ← Three.js network visualization ("use client")
│   └── SmoothScroll.tsx    ← Lenis wrapper ("use client", UNUSED)
```

**Routing**: Flat Next.js App Router — no nested layouts, no route groups, no middleware, no API routes.  
**Component hierarchy**: Essentially none. There are only 2 shared components, one of which is dead code. Every page is a single monolithic file with all markup inline.

---

## 2. Frontend Weaknesses

### 2.1 Visual Design & Polish

#### W-1: Absurdly compressed typography scale — effectively useless
**Files**: [globals.css](file:///d:/Trace-API/web/src/app/globals.css#L5-L12)  
The entire type scale spans from 11px to 17px (a 6px total range). `--font-size-lg` is 13.5px, `--font-size-xl` is 14px — a **0.5px difference** that is literally imperceptible on any display. This defeats the purpose of having a scale. Compare Linear's scale which uses a ~1.25 ratio (12 → 14 → 16 → 20 → 24 → 32 → 48).  
**Fix**: Adopt a proper modular scale (e.g., 1.25 ratio starting from 14px base: 14, 16, 18, 20, 24, 30, 36, 48).

#### W-2: Design tokens defined but widely bypassed with hardcoded hex values
**Files**: Every page — e.g., [layout.tsx L34](file:///d:/Trace-API/web/src/app/layout.tsx#L34) (`text-[#f5f5f0]`), [layout.tsx L45](file:///d:/Trace-API/web/src/app/layout.tsx#L45) (`text-[#8a8a85]`), [page.tsx L86](file:///d:/Trace-API/web/src/app/page.tsx#L86) (`border-[#1a1a1a]`), [research/page.tsx L10](file:///d:/Trace-API/web/src/app/research/page.tsx#L10) (`border-[#2d3139]`) — this last one isn't even defined in the token set.  
Despite `globals.css` defining `--color-text-primary`, `--color-border-default`, etc., every file uses raw hex values instead. The tokens are dead code. Additionally, research and company pages introduce rogue colors like `#2d3139`, `#0f1115`, and `white/50` that don't exist in the design system.  
**Fix**: Replace every hardcoded hex with the corresponding Tailwind theme utility (e.g., `text-text-primary`, `border-border-default`). Remove rogue colors. Enforce via ESLint rule.

#### W-3: All border-radius forced to 0px — then docs/portal use rounded corners anyway
**Files**: [globals.css L40-L42](file:///d:/Trace-API/web/src/app/globals.css#L40-L42) sets all radii to 0px. But [docs/page.tsx L17](file:///d:/Trace-API/web/src/app/docs/page.tsx#L17) uses `rounded-lg`, [portal/page.tsx L98](file:///d:/Trace-API/web/src/app/portal/page.tsx#L98) uses `rounded-2xl` extensively.  
The design system says "sharp edges" but two major pages openly violate it with large radii. This creates a jarring visual split — the homepage and legal pages have sharp rectangles; the docs and portal have pillowy rounded corners.  
**Fix**: Pick one direction. If rounded, update tokens. If sharp, strip `rounded-*` from docs and portal.

#### W-4: Zero visual hierarchy on legal and company pages
**Files**: [company/page.tsx](file:///d:/Trace-API/web/src/app/company/page.tsx), [privacy/page.tsx](file:///d:/Trace-API/web/src/app/privacy/page.tsx), [terms/page.tsx](file:///d:/Trace-API/web/src/app/terms/page.tsx)  
These are plain text dumps with no visual anchoring — no sidebar navigation, no section markers, no table of contents, no cards, no visual breaks between sections. Compare Stripe's terms page which has sticky section nav, clear content hierarchy, and polished formatting.  
**Fix**: Add a sticky sidebar TOC (like the docs page already has), visual section dividers, and consistent heading typography.

#### W-5: Homepage is visually dense but lacks breathing room
**Files**: [page.tsx L222](file:///d:/Trace-API/web/src/app/page.tsx#L222) — bento grid uses `gap-1` (4px) between cells, making the grid feel claustrophobic and unlike the airy feel of best-in-class bento grids (e.g., Apple's feature grids use 16-24px gaps).  
**Fix**: Increase gap to `gap-3` or `gap-4`.

#### W-6: No OpenGraph/social card metadata
**Files**: [layout.tsx L22-L25](file:///d:/Trace-API/web/src/app/layout.tsx#L22-L25) — only `title` and `description` are set. No `openGraph`, `twitter`, `icons`, or `metadataBase` properties. The `favicon.ico` exists in `app/` but no structured metadata references it, and there are no OG images.  
**Fix**: Add complete `metadata` object with `openGraph`, `twitter`, `icons`, and generate an OG image.

---

### 2.2 UX Flows

#### W-7: Portal page has zero authentication — "Sign In" and "Get API Keys" both link to a static mock dashboard
**Files**: [layout.tsx L53-L64](file:///d:/Trace-API/web/src/app/layout.tsx#L53-L64) — both "Sign In" and "Get API Keys" buttons link to `/portal`. [portal/page.tsx](file:///d:/Trace-API/web/src/app/portal/page.tsx) — the portal immediately renders a fake dashboard with hardcoded mock data (API keys, $142.50 balance, bar chart). There is no login gate, no registration flow, no auth state.  
**Why it matters**: An investor clicking "Get API Keys" lands on a fake dashboard with no affordance indicating it's a demo. The "Copy" button on API keys doesn't actually copy anything to the clipboard — `handleCopy` at L24 only sets state, never calls `navigator.clipboard`.  
**Fix**: Add a sign-in/sign-up gate page, or at minimum a prominent banner stating "DEMO MODE". Fix the copy handler to actually use `navigator.clipboard.writeText()`.

#### W-8: Portal tab navigation doesn't render different content
**Files**: [portal/page.tsx L17](file:///d:/Trace-API/web/src/app/portal/page.tsx#L17) — `activeTab` state exists with values "overview", "keys", "billing", "settings", but the main content area always renders the same overview content regardless of which tab is selected. Clicking "Billing" or "Settings" does nothing visible.  
**Fix**: Implement tab-specific content panels, or disable unimplemented tabs with a "Coming Soon" state.

#### W-9: No loading states anywhere in the application
**Files**: All pages — there are no skeleton screens, spinners, or loading indicators. The 3D `NetworkGraph` renders synchronously with no Suspense boundary, meaning the entire homepage blocks until Three.js initializes.  
**Fix**: Wrap `NetworkGraph` in `<Suspense>` with a fallback. Add loading skeletons for portal data.

#### W-10: No error states or empty states
**Files**: [portal/page.tsx](file:///d:/Trace-API/web/src/app/portal/page.tsx) — if `apiKeys` were empty, the table would render headers with an empty `tbody` and no helpful message. No 404 page exists (Next.js `not-found.tsx`). No error boundary (`error.tsx`).  
**Fix**: Add `not-found.tsx`, `error.tsx`, `loading.tsx` at the app root. Add empty state messaging.

#### W-11: No mobile navigation
**Files**: [layout.tsx L45](file:///d:/Trace-API/web/src/app/layout.tsx#L45) — `hidden md:flex` hides the nav links on mobile with no hamburger menu replacement. Mobile users have no way to navigate to Research, Docs, or Company.  
**Fix**: Add a mobile hamburger menu with a slide-out drawer.

---

### 2.3 Responsiveness

#### W-12: Docs and Portal sidebars completely vanish on mobile with no replacement
**Files**: [docs/page.tsx L11](file:///d:/Trace-API/web/src/app/docs/page.tsx#L11) (`hidden md:block`), [portal/page.tsx L47](file:///d:/Trace-API/web/src/app/portal/page.tsx#L47) (`hidden md:flex`). On mobile, the left sidebar disappears entirely. There is no mobile tab bar, dropdown, or drawer to access the sidebar navigation.  
**Fix**: Add a mobile-first navigation pattern — collapsible drawer or bottom tab bar.

#### W-13: Bento grid doesn't degrade gracefully on small screens
**Files**: [page.tsx L222](file:///d:/Trace-API/web/src/app/page.tsx#L222) — the bento grid uses `auto-rows-[300px]`, so on mobile (single column), every cell is forced to 300px height regardless of content. Short cells have massive dead space; long text cells may overflow.  
**Fix**: Use `auto-rows-auto` on mobile, or set min-height instead of fixed height.

#### W-14: SVG chart in the API mockup is unresponsive — uses hardcoded pixel coordinates
**Files**: [page.tsx L178-L188](file:///d:/Trace-API/web/src/app/page.tsx#L178-L188) — SVG paths use absolute pixel values (`M 0,140 C 50,140 100,10...`, `L 300,40`). The SVG `preserveAspectRatio="none"` stretches these non-uniformly. On narrow viewports, the chart distorts badly.  
**Fix**: Use viewBox-relative coordinates or a proper charting library.

#### W-15: SDK cards on docs page use `grid-cols-2` without responsive fallback
**Files**: [docs/page.tsx L153](file:///d:/Trace-API/web/src/app/docs/page.tsx#L153) — `grid-cols-2` has no `grid-cols-1` for mobile, meaning SDK cards get squeezed to ~50% viewport width on small screens.  
**Fix**: Change to `grid-cols-1 md:grid-cols-2`.

---

### 2.4 Accessibility

#### W-16: Zero ARIA labels across the entire application
**Files**: All files — no `aria-label`, `aria-labelledby`, `aria-describedby`, `role`, or `aria-current` attributes exist anywhere. The portal sidebar buttons have no `aria-selected`. The nav links have no `aria-current="page"`.  
**Fix**: Add ARIA attributes to all interactive elements, nav items, and tabs.

#### W-17: Contrast ratios likely failing WCAG AA on secondary text
**Files**: [globals.css L17](file:///d:/Trace-API/web/src/app/globals.css#L17) — `--color-text-secondary: #8a8a85` on `--color-surface-base: #000000` yields a contrast ratio of approximately 4.1:1. This barely passes AA for normal text (4.5:1 required) and fails for the many places it's used at 13px or smaller (which counts as "small text"). The tertiary color `#6b6b66` at ~3.0:1 outright fails AA.  
**Fix**: Lighten `--color-text-secondary` to at least `#9a9a95` (≥4.5:1) and `--color-text-tertiary` to at least `#8a8a85`.

#### W-18: No keyboard focus indicators
**Files**: All pages — there are no `focus:` or `focus-visible:` styles on any interactive element. Pressing Tab produces no visible focus ring, making the site completely unusable for keyboard-only users.  
**Fix**: Add `focus-visible:ring-2 focus-visible:ring-offset-2` (or equivalent) to all buttons and links.

#### W-19: Interactive chart bars in portal lack keyboard access and screen reader text
**Files**: [portal/page.tsx L122-L128](file:///d:/Trace-API/web/src/app/portal/page.tsx#L122-L128) — the usage chart bars are `<div>` elements with no `role`, `tabIndex`, or `aria-label`. They show tooltips on hover but are unreachable via keyboard.  
**Fix**: Use `role="img"` with `aria-label` on the chart container, or make individual bars focusable with labels.

#### W-20: Document heading hierarchy is broken
**Files**: [page.tsx](file:///d:/Trace-API/web/src/app/page.tsx) — jumps from `<h1>` to `<h3>` (L230, L245, L256) skipping `<h2>` entirely inside the bento grid. [company/page.tsx L18](file:///d:/Trace-API/web/src/app/company/page.tsx#L18) uses `<h2>` for "Privacy Policy" which is semantically incorrect since the page is about the company.  
**Fix**: Ensure proper h1 → h2 → h3 nesting on every page.

---

### 2.5 Performance

#### W-21: Three.js + React Three Fiber loaded synchronously on homepage — massive bundle impact
**Files**: [page.tsx L17](file:///d:/Trace-API/web/src/app/page.tsx#L17), [NetworkGraph.tsx](file:///d:/Trace-API/web/src/components/NetworkGraph.tsx), [package.json L14-L15](file:///d:/Trace-API/web/package.json#L14-L15)  
`three` (≈600KB gzipped), `@react-three/fiber` (≈80KB), and `@react-three/drei` (≈200KB+) are all direct dependencies imported without `dynamic()` or lazy loading. This means every first-time visitor downloads ~800KB+ of JavaScript just for a decorative background animation. `drei` is imported in package.json but never actually used in any component.  
**Fix**: `next/dynamic` with `{ ssr: false }` for `NetworkGraph`. Remove `@react-three/drei` from dependencies entirely.

#### W-22: GSAP and ScrollTrigger imported on the entire homepage without code-splitting
**Files**: [page.tsx L15-L16](file:///d:/Trace-API/web/src/app/page.tsx#L15-L16) — `gsap` (~70KB) and `ScrollTrigger` are imported at the top level. Combined with Three.js, the homepage ships >900KB of JS before any content is interactive.  
**Fix**: Dynamic import GSAP inside a `useEffect`, or use CSS animations for simpler reveals.

#### W-23: SmoothScroll component is dead code — Lenis dependency is unused weight
**Files**: [SmoothScroll.tsx](file:///d:/Trace-API/web/src/components/SmoothScroll.tsx), [package.json L18](file:///d:/Trace-API/web/package.json#L18)  
`SmoothScroll` component exists but is never imported or rendered anywhere. Lenis (~12KB) is installed for nothing.  
**Fix**: Either integrate it into the root layout or remove the component and uninstall `lenis`.

#### W-24: Images in `public/` are unoptimized PNGs
**Files**: `public/hero_graph.png` (775KB), `public/section_infrastructure.png` (880KB)  
Two large PNG images (combined 1.6MB) sit in public but are **never actually referenced in any component** — yet they still ship in the public directory. If they were used, they'd need WebP/AVIF conversion and Next.js `<Image>` optimization.  
**Fix**: Delete unused images or, if needed, convert to WebP and serve via `<Image>`.

#### W-25: Homepage is entirely `"use client"` — eliminates all SSR/RSC benefits
**Files**: [page.tsx L1](file:///d:/Trace-API/web/src/app/page.tsx#L1) — the entire homepage is a client component because of GSAP. The static text content (which is the majority of the page) could be server-rendered with only the interactive parts being client components.  
**Fix**: Extract static sections into server components. Only wrap the animated parts in client component boundaries.

---

### 2.6 Component Architecture

#### W-26: Zero shared/reusable components — everything is monolithic inline markup
**Files**: All pages — there are only 2 files in `components/`, one of which is unused. There is no `Button`, `Card`, `Section`, `CodeBlock`, `Badge`, `Input`, or `Table` component. Every page duplicates the same patterns:
- Button styles are copy-pasted across 6+ locations with slight variations (compare [page.tsx L113](file:///d:/Trace-API/web/src/app/page.tsx#L113) vs [page.tsx L120](file:///d:/Trace-API/web/src/app/page.tsx#L120) vs [layout.tsx L61](file:///d:/Trace-API/web/src/app/layout.tsx#L61) vs [portal/page.tsx L105](file:///d:/Trace-API/web/src/app/portal/page.tsx#L105))
- Code blocks are hand-assembled from `<pre>` + `<span>` with inline color classes in both page.tsx and docs/page.tsx
- Card patterns are duplicated across bento grid and portal stats  
**Fix**: Create a shared component library: `Button`, `Card`, `CodeBlock`, `Badge`, `Container`, `SectionHeader`.

#### W-27: No layout nesting — every page gets the same nav+footer even when inappropriate
**Files**: [layout.tsx](file:///d:/Trace-API/web/src/app/layout.tsx) — the root layout wraps every route with the marketing nav and mega footer. The portal/dashboard page gets the same marketing nav (with "Get API Keys" button that links back to itself) and the massive marketing footer, which is wrong for an app-like dashboard context.  
**Fix**: Create a `(marketing)` route group with the current layout for public pages, and a `(dashboard)` route group with a minimal app layout for the portal.

#### W-28: Inconsistent animation libraries — GSAP on homepage, Framer Motion on docs/portal
**Files**: [page.tsx L15](file:///d:/Trace-API/web/src/app/page.tsx#L15) (GSAP), [docs/page.tsx L3](file:///d:/Trace-API/web/src/app/docs/page.tsx#L3) (Framer Motion), [portal/page.tsx L4](file:///d:/Trace-API/web/src/app/portal/page.tsx#L4) (Framer Motion)  
Two different animation libraries serve the same purpose, doubling JS cost. GSAP requires `"use client"` and manual cleanup; Framer Motion integrates more naturally with React.  
**Fix**: Standardize on one. Framer Motion is the better fit for a React/Next.js project. Replace GSAP scroll animations with Framer Motion's `whileInView`.

---

### 2.7 Consistency

#### W-29: Color palette diverges across pages — at least 4 color systems coexist
**Files**:
- `globals.css` defines `#f5f5f0`, `#8a8a85`, `#6b6b66`, `#050505`, `#0a0a0a`, `#1a1a1a`, `#333333`, `#e8342a`
- [research/page.tsx L10](file:///d:/Trace-API/web/src/app/research/page.tsx#L10): uses `#2d3139` (not in tokens)
- [research/page.tsx L42](file:///d:/Trace-API/web/src/app/research/page.tsx#L42): uses `#0f1115` (not in tokens)
- [docs/page.tsx](file:///d:/Trace-API/web/src/app/docs/page.tsx): uses Tailwind's `zinc-*` scale (`zinc-400`, `zinc-500`, `zinc-300`) which is a completely different gray palette than the custom tokens
- [portal/page.tsx](file:///d:/Trace-API/web/src/app/portal/page.tsx): also uses `zinc-*` and `white/*` opacity patterns
- [company/page.tsx L11](file:///d:/Trace-API/web/src/app/company/page.tsx#L11): uses `#f4f1ec` which is *different* from the token `#f5f5f0`  
**Fix**: Audit every color usage. Replace all with token references. Delete rogue values.

#### W-30: Button styles are inconsistent across pages
- Homepage primary: `bg-[#f5f5f0] text-black px-8 py-4 font-semibold text-[15px]` ([page.tsx L113](file:///d:/Trace-API/web/src/app/page.tsx#L113))
- Header primary: `bg-[#f5f5f0] text-black px-4 py-2 font-medium text-[13px]` ([layout.tsx L61](file:///d:/Trace-API/web/src/app/layout.tsx#L61))
- Portal button: `bg-white text-black text-[13px] font-bold py-2 rounded-lg` ([portal/page.tsx L105](file:///d:/Trace-API/web/src/app/portal/page.tsx#L105))
- CTA button: `bg-[#f5f5f0] text-black px-8 py-4 font-bold text-[16px] shadow-xl` ([page.tsx L350](file:///d:/Trace-API/web/src/app/page.tsx#L350))

Four "primary buttons" with four different font sizes, font weights, paddings, and radius treatments. This screams "no design system."  
**Fix**: Create a `Button` component with `variant` and `size` props.

#### W-31: Prose styling inconsistent between research, privacy, and terms pages
**Files**: [research/page.tsx L17](file:///d:/Trace-API/web/src/app/research/page.tsx#L17) uses `prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6`. [privacy/page.tsx L16](file:///d:/Trace-API/web/src/app/privacy/page.tsx#L16) uses `prose-h2:mt-12 prose-h2:mb-4` (different bottom margin). Research uses `max-w-4xl`, privacy uses `max-w-3xl`.  
**Fix**: Extract a shared `<ArticleLayout>` component with consistent prose config.

---

### 2.8 Copy & Microcopy Quality

#### W-32: "Sign In" and "Get API Keys" both go to the same URL with no differentiation
**Files**: [layout.tsx L53-L64](file:///d:/Trace-API/web/src/app/layout.tsx#L53-L64) — two adjacent CTAs in the header both link to `/portal`. A user doesn't know which to click, and there's no semantic difference.  
**Fix**: Make "Sign In" go to a `/login` page (or use a modal). Keep "Get API Keys" as the primary CTA that leads to registration.

#### W-33: `$O(1)` renders as literal text — LaTeX syntax in HTML
**Files**: [page.tsx L233](file:///d:/Trace-API/web/src/app/page.tsx#L233) — the string `$O(1)$` and other LaTeX-like expressions (`$P(Sybil | Tx)$` in research page) render as literal dollar-sign-wrapped text. There is no KaTeX/MathJax integration.  
**Fix**: Either integrate KaTeX for proper math rendering, or rewrite as plain English ("constant-time lookup").

#### W-34: Footer claims "All systems operational" — hardcoded lie
**Files**: [layout.tsx L109-L110](file:///d:/Trace-API/web/src/app/layout.tsx#L109-L110) — a green dot + "All systems operational" is permanently displayed with no connection to any monitoring system. This will undermine trust during an actual outage.  
**Fix**: Either connect to a real status API or remove the indicator entirely.

#### W-35: "TRACE Engine v1.0 LIVE" badge with pulsing animation suggests real-time data — it's static
**Files**: [page.tsx L93-L98](file:///d:/Trace-API/web/src/app/page.tsx#L93-L98) — the red pulsing dot + "LIVE" implies a running system. An investor will immediately ask "what am I looking at?" and discover it's a static page.  
**Fix**: Either connect to real telemetry or change copy to "TRACE Engine v1.0" without the LIVE indicator.

---

## 3. Severity-Ranked Punch List

| # | Issue | Severity | Effort | File(s) |
|---|-------|----------|--------|---------|
| W-21 | Three.js/Drei ~800KB loaded synchronously, Drei unused | **Critical** | Low | `page.tsx`, `NetworkGraph.tsx`, `package.json` |
| W-11 | No mobile navigation — nav links hidden with no replacement | **Critical** | Medium | `layout.tsx` |
| W-7 | Portal has no auth; Copy button doesn't copy; fake dashboard | **Critical** | High | `layout.tsx`, `portal/page.tsx` |
| W-18 | Zero keyboard focus indicators site-wide | **Critical** | Low | All files |
| W-17 | Secondary/tertiary text fails WCAG AA contrast | **Critical** | Low | `globals.css` |
| W-26 | No shared components — everything duplicated inline | **High** | High | All files |
| W-29 | 4 different color systems coexist across pages | **High** | Medium | All files |
| W-25 | Entire homepage is `"use client"` — kills SSR | **High** | Medium | `page.tsx` |
| W-12 | Docs/Portal sidebars vanish on mobile with no replacement | **High** | Medium | `docs/page.tsx`, `portal/page.tsx` |
| W-16 | Zero ARIA attributes in entire application | **High** | Medium | All files |
| W-30 | Button styles inconsistent across 4+ variations | **High** | Medium | Multiple files |
| W-1 | Typography scale spans 6px total — functionally useless | **High** | Low | `globals.css` |
| W-28 | Two animation libraries (GSAP + Framer Motion) doubling JS | **High** | High | `page.tsx`, `docs/page.tsx`, `portal/page.tsx` |
| W-27 | Portal page gets marketing layout (nav + mega footer) | **High** | Medium | `layout.tsx` |
| W-10 | No error/404/empty states | **Medium** | Medium | App root |
| W-8 | Portal tabs don't switch content | **Medium** | Medium | `portal/page.tsx` |
| W-3 | Radius tokens say 0px but docs/portal use rounded-2xl | **Medium** | Low | `globals.css`, `docs/page.tsx`, `portal/page.tsx` |
| W-2 | Design tokens exist but are never used (all hardcoded hex) | **Medium** | Medium | All files |
| W-9 | No loading states — Three.js blocks rendering | **Medium** | Low | `page.tsx` |
| W-6 | No OpenGraph/social metadata | **Medium** | Low | `layout.tsx` |
| W-13 | Bento grid 300px fixed rows overflow/waste space on mobile | **Medium** | Low | `page.tsx` |
| W-20 | Heading hierarchy broken (h1 → h3 skip) | **Medium** | Low | `page.tsx` |
| W-23 | SmoothScroll + Lenis installed but never used | **Low** | Low | `SmoothScroll.tsx`, `package.json` |
| W-24 | 1.6MB of unused PNG images in public/ | **Low** | Low | `public/` |
| W-14 | SVG chart uses hardcoded pixel coordinates | **Low** | Medium | `page.tsx` |
| W-15 | SDK cards grid-cols-2 without mobile fallback | **Low** | Low | `docs/page.tsx` |
| W-5 | Bento grid uses gap-1 (4px) — too tight | **Low** | Low | `page.tsx` |
| W-34 | "All systems operational" is hardcoded | **Low** | Low | `layout.tsx` |
| W-33 | LaTeX syntax renders as plain text | **Low** | Medium | `page.tsx`, `research/page.tsx` |
| W-35 | "LIVE" badge with pulse on a static page | **Low** | Low | `page.tsx` |
| W-32 | "Sign In" and "Get API Keys" go to same URL | **Low** | Low | `layout.tsx` |
| W-31 | Prose styling inconsistent across long-form pages | **Low** | Low | `research/`, `privacy/`, `terms/` |
| W-4 | Legal/company pages have zero visual hierarchy | **Low** | Medium | `company/`, `privacy/`, `terms/` |

---

## 4. Benchmark Score vs. Top-Tier B2B SaaS

Benchmark targets: **OpenAI** (dashboard + docs), **Linear** (marketing + app), **Stripe** (docs + dashboard), **Vercel** (marketing + dashboard), **Anthropic** (console + marketing).

| Dimension | Score (0–100) | Justification |
|-----------|:---:|---|
| **Visual Design Maturity** | **42/100** | The homepage hero section with 3D graph + terminal mockup + bento grid shows ambition and the right *direction* — this is clearly inspired by Linear/Vercel's dark aesthetic. However, execution falls apart: the typography scale is non-functional (W-1), the bento grid is too cramped (W-5), and the visual language breaks completely once you leave the homepage. Docs/portal look like a different product with rounded corners, Tailwind default zinc grays, and blue/green accent colors that don't exist in the homepage palette (W-29, W-3). Linear maintains pixel-perfect consistency across every page. Stripe's docs and dashboard share the exact same visual DNA. TRACE has two competing identities. |
| **UX Polish** | **28/100** | Best-in-class B2B SaaS products obsess over micro-interactions and completeness. Vercel's dashboard has shimmer loading states for every data fetch. OpenAI's playground handles every error with inline, contextual feedback. TRACE has: no mobile nav (W-11), a fake portal with non-functional tabs (W-8), a copy button that doesn't copy (W-7), no loading states (W-9), no error states (W-10), no empty states, and "Sign In" and "Get API Keys" going to the same place (W-32). The UX doesn't feel like an unfinished product — it feels like a static prototype being presented as an interactive product. |
| **Performance** | **30/100** | Vercel's marketing site loads in <1s with aggressive ISR and edge caching. TRACE ships ~900KB+ of client JS on the homepage alone (Three.js + GSAP + Framer Motion imported elsewhere), with no code splitting, no dynamic imports, and the entire page marked `"use client"` which defeats Next.js's primary value proposition (W-21, W-22, W-25). The `@react-three/drei` package (~200KB) is installed but never imported (W-21). Lenis is installed but never used (W-23). 1.6MB of PNGs sit unused in public (W-24). For comparison, Linear's homepage is ~200KB of JS total. |
| **Accessibility** | **12/100** | Anthropic's marketing site and console pass WCAG AA. Stripe's docs are a reference implementation of accessible documentation. TRACE has: zero ARIA attributes (W-16), no focus indicators (W-18), contrast ratios failing AA on all secondary text (W-17), broken heading hierarchy (W-20), no skip links, no landmark roles, no screen reader considerations for charts (W-19), and no keyboard-navigable mobile menu because there is no mobile menu (W-11). This would fail any basic accessibility audit. |
| **Consistency / Design System Maturity** | **18/100** | Linear, Stripe, and Vercel all have mature, internal design systems where every button, card, and text style is tokenized and reusable. TRACE defines tokens in CSS but never uses them (W-2). It has 4 competing color palettes across pages (W-29). Button styles vary across 4+ locations (W-30). Border radius is declared as 0px then ignored on 2 pages (W-3). There are exactly 2 components in the entire codebase, one dead (W-26). The "design system" is effectively a set of CSS variables that nobody reads. |

### Composite Score: 26/100

For context, an investor-demo-ready B2B SaaS frontend should score **≥70** across all dimensions. Products like Linear and Vercel score 85-95. TRACE's homepage hero section and 3D visualization punch above its weight visually, but the moment you click *any* link, the illusion collapses.

---

## 5. Top 5 Highest-Leverage Fixes

| Rank | Fix | Impact/Effort | Rationale |
|:---:|------|:---:|---|
| **1** | **Dynamic-import Three.js + remove `@react-three/drei` + remove unused Lenis** | ★★★★★ | Drops ~1MB from the initial bundle with 3 lines of code changes. Single biggest perf + Lighthouse win possible. |
| **2** | **Add mobile hamburger menu to the header** | ★★★★★ | The site is literally un-navigable on mobile right now. ~50 lines of code to fix a Critical-severity UX + accessibility gap for >50% of visitors. |
| **3** | **Unify color palette: replace all hardcoded hex and zinc-\* with design tokens** | ★★★★☆ | Eliminates the "two different products" feel. Tedious find-and-replace but no complexity — pure consistency win across every page. |
| **4** | **Create `Button` and `Card` shared components with variant props** | ★★★★☆ | Fixes 4+ inconsistent button styles and card patterns in one shot. Foundation for all future UI work. Makes every subsequent fix cheaper. |
| **5** | **Add `focus-visible` styles globally + fix contrast ratios on secondary text** | ★★★★★ | Two CSS-level changes that immediately upgrade the accessibility score from ~12 to ~40. Zero risk, 15 minutes of work, massive compliance improvement. |
