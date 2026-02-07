# VDC Vault Readiness — Design System Proposal

**Version:** 1.0 (Draft)  
**Status:** Proposal for Review  
**Author:** Design Review Session  
**Date:** 2026-02-07

---

## 1. Design Philosophy

### The Problem

The current UI is **functional but forgettable**. It uses unmodified shadcn/ui defaults, resulting in a generic "template" appearance indistinguishable from thousands of other React applications.

### The Opportunity

This is a **validation tool for infrastructure professionals**. These users:

- Make critical decisions based on the output
- Value clarity and trust over decoration
- Appreciate precision and technical competence
- Have limited patience for friction

### Design Principles

| Principle             | Meaning                                                                                   | Anti-Pattern                                   |
| --------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Clarity First**     | Every element serves communication. Decorative elements must enhance, not distract.       | Gradients for gradient's sake.                 |
| **Earned Confidence** | The UI should feel like it knows what it's doing. Precise typography, deliberate spacing. | Wobbly animations, casual copy.                |
| **Dramatic Results**  | Pass/fail outcomes deserve emphasis. Don't undersell success or hide failures.            | Identical treatment for all states.            |
| **Technical Respect** | The audience is technical. Design for engineers, not consumers.                           | Dumbed-down metaphors, excessive hand-holding. |

### Aesthetic Direction: **Precision Engineering**

Think: Stripe's dashboard meets a flight systems checklist. Clean, confident, and unmistakably competent.

**Mood Board Keywords:**

- Monochrome with strategic color
- Geometric precision
- Data-forward
- Subtle depth
- Deliberate motion

---

## 2. Typography System

### The Problem

Currently falls back to system fonts with no custom choices. This is the single highest-impact improvement available.

### Font Selection

| Role               | Font       | Weight  | Rationale                                                                                             |
| ------------------ | ---------- | ------- | ----------------------------------------------------------------------------------------------------- |
| **Headings**       | Geist Sans | 600-700 | Vercel's typeface. Modern geometric sans with excellent readability. Professional without being cold. |
| **Body**           | Geist Sans | 400-500 | Same family for cohesion. Clean at small sizes.                                                       |
| **Data/Monospace** | Geist Mono | 400     | For version numbers, job names, technical values. Adds precision feel.                                |

**Alternative if Geist unavailable:** Inter Variable (but less distinctive).

### Type Scale

```css
/* Proposed scale (rem-based, 16px root) */
--text-xs: 0.75rem; /* 12px - Captions, metadata */
--text-sm: 0.875rem; /* 14px - Secondary text, table cells */
--text-base: 1rem; /* 16px - Body text */
--text-lg: 1.125rem; /* 18px - Emphasized body */
--text-xl: 1.25rem; /* 20px - Card titles */
--text-2xl: 1.5rem; /* 24px - Section headers */
--text-3xl: 1.875rem; /* 30px - Page titles */
--text-4xl: 2.25rem; /* 36px - Hero (if needed) */
```

### Letter Spacing

| Context          | Tracking      | Reason                       |
| ---------------- | ------------- | ---------------------------- |
| Headings (24px+) | `-0.025em`    | Tighten for visual weight    |
| Body text        | `0` (default) | Optimal readability          |
| ALL CAPS labels  | `+0.05em`     | Improve legibility           |
| Monospace data   | `0`           | Already spaced for alignment |

### Implementation

```css
@import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap");

:root {
  --font-sans: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, monospace;
}

body {
  font-family: var(--font-sans);
  font-feature-settings:
    "ss01" 1,
    "ss02" 1; /* Stylistic sets for Geist */
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
```

---

## 3. Color System

### Official Veeam 2025 Visual Identity (v1.7)

This tool uses the **official Veeam brand palette** to ensure it feels native to the ecosystem. All colors are derived from Veeam's 2025 Visual Identity guidelines.

### Brand Color Tokens

| Role                  | Brand Name     | Hex       | OKLCH                  | Usage                                                    |
| --------------------- | -------------- | --------- | ---------------------- | -------------------------------------------------------- |
| **Primary / Success** | Viridis        | `#00d15f` | `oklch(0.75 0.22 155)` | Primary buttons, "Pass" badges, Success states           |
| **Background**        | Fog            | `#efefef` | `oklch(0.95 0 0)`      | Page backgrounds, subtle panels                          |
| **Primary Text**      | Dark Mineral   | `#505861` | `oklch(0.42 0.01 250)` | All body text and table data (not pure black)            |
| **Secondary Text**    | French Grey    | `#adacaf` | `oklch(0.73 0.01 280)` | Borders, dividers, secondary labels                      |
| **Error / Blocker**   | Ignis          | `#ed2b3d` | `oklch(0.58 0.22 25)`  | Critical failures, "Blocker" alerts, Destructive actions |
| **Warning**           | Suma           | `#fe8a25` | `oklch(0.72 0.19 55)`  | Warning alerts, non-critical issues                      |
| **Info / Active**     | Electric Azure | `#3700ff` | `oklch(0.42 0.31 265)` | Active states, focus rings, "Info" alerts                |

### CSS Variable Mapping

```css
:root {
  /* Veeam 2025 Brand Palette */
  --viridis: oklch(0.75 0.22 155); /* #00d15f - Primary green */
  --fog: oklch(0.95 0 0); /* #efefef - Background */
  --dark-mineral: oklch(0.42 0.01 250); /* #505861 - Primary text */
  --french-grey: oklch(0.73 0.01 280); /* #adacaf - Secondary text */
  --ignis: oklch(0.58 0.22 25); /* #ed2b3d - Error red */
  --suma: oklch(0.72 0.19 55); /* #fe8a25 - Warning orange */
  --electric-azure: oklch(0.42 0.31 265); /* #3700ff - Info blue */

  /* Semantic mappings */
  --primary: var(--viridis);
  --primary-foreground: oklch(0.98 0 0);
  --success: var(--viridis);
  --success-foreground: oklch(0.98 0 0);
  --success-muted: oklch(0.95 0.05 155);
  --destructive: var(--ignis);
  --destructive-foreground: oklch(0.98 0 0);
  --warning: var(--suma);
  --warning-foreground: oklch(0.2 0.02 55);
  --warning-muted: oklch(0.95 0.05 55);
  --info: var(--electric-azure);
  --info-foreground: oklch(0.98 0 0);
  --background: oklch(1 0 0); /* White for main content */
  --foreground: var(--dark-mineral);
  --muted: var(--fog);
  --muted-foreground: var(--french-grey);
  --border: var(--french-grey);
  --ring: var(--electric-azure);
}
```

### Color Usage Rules

| State            | Primary Color      | Background            | Border                | Icon           |
| ---------------- | ------------------ | --------------------- | --------------------- | -------------- |
| **Pass/Ready**   | `--viridis`        | `--success-muted`     | `--viridis/30`        | Viridis        |
| **Fail/Blocker** | `--ignis`          | `--ignis/10`          | `--ignis/40`          | Ignis          |
| **Warning**      | `--suma`           | `--warning-muted`     | `--suma/40`           | Suma           |
| **Info/Active**  | `--electric-azure` | `--electric-azure/10` | `--electric-azure/40` | Electric Azure |
| **Neutral**      | `--dark-mineral`   | `--fog`               | `--french-grey`       | Dark Mineral   |

### Dark Mode Transformations

For dark mode, increase lightness and slightly boost chroma for vibrancy:

| Token              | Light Mode             | Dark Mode              |
| ------------------ | ---------------------- | ---------------------- |
| `--viridis`        | `oklch(0.75 0.22 155)` | `oklch(0.80 0.24 155)` |
| `--ignis`          | `oklch(0.58 0.22 25)`  | `oklch(0.68 0.24 25)`  |
| `--suma`           | `oklch(0.72 0.19 55)`  | `oklch(0.78 0.21 55)`  |
| `--electric-azure` | `oklch(0.42 0.31 265)` | `oklch(0.60 0.28 265)` |
| `--background`     | `oklch(1 0 0)`         | `oklch(0.15 0 0)`      |
| `--foreground`     | `oklch(0.42 0.01 250)` | `oklch(0.92 0 0)`      |
| `--fog`            | `oklch(0.95 0 0)`      | `oklch(0.20 0 0)`      |

---

## 4. Motion & Animation

### Philosophy

Motion should feel **deliberate and swift**. This is a professional tool—animations acknowledge user actions without wasting time.

### Timing Tokens

```css
:root {
  --duration-instant: 100ms; /* Micro-feedback (hover states) */
  --duration-fast: 150ms; /* Standard transitions */
  --duration-normal: 250ms; /* State changes */
  --duration-slow: 400ms; /* Entrance animations */
  --duration-emphasis: 600ms; /* Celebration moments */

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1); /* Smooth deceleration */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1); /* Symmetric */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Slight overshoot */
}
```

### Animation Catalog

| Trigger                | Animation                                       | Duration  | Easing      |
| ---------------------- | ----------------------------------------------- | --------- | ----------- |
| **Page load**          | Fade in + subtle rise (8px)                     | 400ms     | ease-out    |
| **State transition**   | Cross-fade                                      | 250ms     | ease-in-out |
| **Card entrance**      | Stagger fade-in (50ms delay each)               | 300ms     | ease-out    |
| **Success result**     | Scale pulse (1.0 → 1.02 → 1.0) + checkmark draw | 600ms     | spring      |
| **Failure result**     | Shake (subtle, 2px horizontal)                  | 300ms     | ease-out    |
| **Button hover**       | Background color shift                          | 150ms     | ease-out    |
| **Button press**       | Scale down to 0.98                              | 100ms     | ease-out    |
| **Focus ring**         | Ring expansion                                  | 150ms     | ease-out    |
| **Dropdown/Modal**     | Fade + scale from 0.95                          | 200ms     | ease-out    |
| **Loading spinner**    | Continuous rotation                             | 1000ms    | linear      |
| **Progress indicator** | Width transition (chunky steps)                 | Per chunk | ease-out    |

### Loading State Redesign

**Current:** Single spinning icon with "Analyzing..." text.

**Proposed:** Multi-step progress with context.

```
┌────────────────────────────────────────────┐
│                                            │
│         ┌──────────────────────┐           │
│         │ ████████████░░░░░░░░ │  65%      │
│         └──────────────────────┘           │
│                                            │
│        Validating encryption rules...      │
│                                            │
│    ✓ Parsed healthcheck data               │
│    ✓ Validated VBR version                 │
│    ● Checking job encryption               │
│    ○ Scanning for AWS workloads            │
│    ○ Verifying agent configuration         │
│    ○ Checking license type                 │
│                                            │
└────────────────────────────────────────────┘
```

Each step completes with a checkmark animation. Current step pulses subtly.

---

## 5. Component Specifications

### 5.1 FileUpload Zone

**Current:** Generic dashed border with upload cloud icon.

**Proposed:** Distinguished drop zone with state-aware feedback.

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
╎                                            ╎
╎              ┌─────────────┐               ╎
╎              │    ┌───┐    │               ╎
╎              │    │ ↑ │    │               ╎
╎              │    └───┘    │               ╎
╎              │   .JSON     │               ╎
╎              └─────────────┘               ╎
╎                                            ╎
╎     Drop Veeam Healthcheck JSON here       ╎
╎        or click to select file             ╎
╎                                            ╎
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
```

**States:**

| State         | Visual Treatment                                                 |
| ------------- | ---------------------------------------------------------------- |
| **Idle**      | Dashed border (muted), icon at 60% opacity                       |
| **Hover**     | Border solidifies, icon rises 4px, slight background tint        |
| **Drag Over** | Border becomes accent color, background pulses, icon animates    |
| **Uploading** | Progress ring around icon, "Processing..." text                  |
| **Error**     | Border becomes destructive, shake animation, error message below |

**Icon Treatment:**

- Replace generic `UploadCloud` with custom illustration
- Show file type indicator (JSON badge)
- Animate on interaction (arrow rises on hover)

### 5.2 Summary Cards

**Current:** Flat white cards with text-only content.

**Proposed:** Status-aware cards with visual indicators.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │ VBR VERSION     │  │ TOTAL JOBS      │  │ READINESS       │   │
│  │                 │  │                 │  │                 │   │
│  │    13.0.1       │  │      30         │  │   ✓ Ready       │   │
│  │    ───────      │  │    ─────        │  │   ────────      │   │
│  │ ✓ Meets 12.1.2+ │  │ 28 enc · 2 not  │  │ 6/6 checks pass │   │
│  │                 │  │                 │  │                 │   │
│  │  ▔▔▔▔▔▔▔▔▔▔▔▔▔  │  │  ▔▔▔▔▔▔▔▔▔▔▔▔▔  │  │  ▔▔▔▔▔▔▔▔▔▔▔▔▔  │   │
│  │  success accent │  │  neutral accent │  │  success accent │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Design Details:**

| Element            | Specification                                                   |
| ------------------ | --------------------------------------------------------------- |
| **Card container** | `shadow-sm` → `shadow-md` on hover. Subtle gradient background. |
| **Label**          | ALL CAPS, `text-xs`, `tracking-wide`, `text-muted-foreground`   |
| **Value**          | `text-2xl`, `font-semibold`, color varies by state              |
| **Subtext**        | `text-xs`, `text-muted-foreground`                              |
| **Bottom accent**  | 2px colored bar at card bottom indicating status                |
| **Animation**      | Stagger entrance (100ms delay between cards)                    |

**Status Colors:**

- **Version OK:** Success green accent bar
- **Version Fail:** Destructive red accent bar
- **Jobs (mixed):** Neutral accent bar
- **Ready:** Success green accent bar + checkmark icon
- **Action Required:** Destructive red accent bar + X icon, subtle pulse

### 5.3 Blockers List

**Current:** Standard Alert components with icon + text.

**Proposed:** High-impact alert cards with severity hierarchy.

```
BLOCKERS

┌──────────────────────────────────────────────────────────────────┐
│ ⊘                                                                │
│   UNENCRYPTED JOBS DETECTED                           BLOCKER   │
│                                                                  │
│   2 jobs are configured without encryption. VDC Vault requires   │
│   all backup data to be encrypted.                               │
│                                                                  │
│   • Daily Backup - SQL Servers                                   │
│   • Weekly Backup - File Shares                                  │
│                                                                  │
│   ────────────────────────────────────────────────────────────   │
│   Enable encryption in job settings or reconfigure with new key  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ ⚠                                                                │
│   AGENT JOBS REQUIRE GATEWAY                          WARNING   │
│                                                                  │
│   3 agent backup jobs are configured. Ensure Gateway Server is   │
│   deployed for Vault connectivity.                               │
│                                                                  │
│   • Server Agent - DC01                                          │
│   • Server Agent - APP01                                         │
│   • Workstation Agent Pool                                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Design Details:**

| Severity           | Background        | Border                      | Icon              | Badge           |
| ------------------ | ----------------- | --------------------------- | ----------------- | --------------- |
| **Blocker (fail)** | `--destructive/5` | `--destructive/30` left-4px | Filled circle-X   | Red "BLOCKER"   |
| **Warning**        | `--warning/5`     | `--warning/30` left-4px     | Outlined triangle | Amber "WARNING" |
| **Info**           | `--muted`         | `--border` left-2px         | Info circle       | Gray "INFO"     |

**Animation:**

- Blockers stagger in with 100ms delay each
- Fail items have subtle left-border pulse on initial load (draws attention)
- Expanding affected items list animates height

### 5.4 Job Table

**Current:** Standard TanStack Table with basic styling.

**Proposed:** Refined data table with clear status indication.

```
┌──────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────┐                      │
│ │ 🔍 Search jobs...                        │      Filter ▾       │
│ └─────────────────────────────────────────┘                      │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │   │ JOB NAME              │ TYPE    │ REPOSITORY   │ ENC   │   │
│ ├───┼───────────────────────┼─────────┼──────────────┼───────┤   │
│ │ 🔒│ Daily SQL Backup      │ Backup  │ LinuxHarden  │  Yes  │   │
│ │ 🔒│ Weekly File Backup    │ Backup  │ VeeamVault   │  Yes  │   │
│ │ 🔓│ Legacy VM Backup      │ Backup  │ WinLocal     │   No  │   │
│ │ 🔒│ DC Replication        │ Replica │ S3 Target    │  Yes  │   │
│ │ 🔓│ Dev Environment       │ Backup  │ DDBoost      │   No  │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│                        ← 1 of 3 →                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Design Details:**

| Element              | Specification                                              |
| -------------------- | ---------------------------------------------------------- |
| **Header row**       | Sticky, subtle background (`--muted/50`), uppercase labels |
| **Row hover**        | Background tint, slight left-translate (2px)               |
| **Unencrypted rows** | Subtle destructive background tint across entire row       |
| **Status icon**      | Larger (20px), left-aligned in dedicated column            |
| **Encryption badge** | Pill badge (current), but with icon inside                 |
| **Pagination**       | Minimal: ← Page N of M → (hide when single page)           |
| **Empty state**      | Illustration + "No jobs found" + suggestion text           |

**Row Animation:**

- Rows fade in on initial load (staggered 30ms)
- Search filtering animates height collapse

### 5.5 Success State (All Checks Pass)

**Current:** Simple card with checkmark and text.

**Proposed:** Celebration moment.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                          ╭──────────╮                            │
│                         ╱            ╲                           │
│                        │      ✓       │                          │
│                         ╲            ╱                           │
│                          ╰──────────╯                            │
│                                                                  │
│                    All Systems Ready                             │
│                                                                  │
│     Your Veeam environment is fully compatible with VDC Vault.   │
│           All 6 validation checks passed successfully.           │
│                                                                  │
│                      ┌──────────────────┐                        │
│                      │  View Job Details │                       │
│                      └──────────────────┘                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Animation Sequence:**

1. Card fades in (200ms)
2. Checkmark draws/animates in (400ms, spring easing)
3. Success ring pulses once outward (300ms)
4. Text fades in (200ms, staggered)
5. Button slides up (200ms)

Total sequence: ~800ms, feels celebratory without being excessive.

---

## 6. Spacing & Layout

### Spacing Scale

```css
:root {
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem; /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem; /* 16px */
  --space-5: 1.25rem; /* 20px */
  --space-6: 1.5rem; /* 24px */
  --space-8: 2rem; /* 32px */
  --space-10: 2.5rem; /* 40px */
  --space-12: 3rem; /* 48px */
  --space-16: 4rem; /* 64px */
}
```

### Layout Guidelines

| Context                   | Specification                                   |
| ------------------------- | ----------------------------------------------- |
| **Page max-width**        | `max-w-5xl` (960px) — maintain current          |
| **Page padding**          | `p-6` (24px) on desktop, `p-4` (16px) on mobile |
| **Section spacing**       | `space-y-8` (32px) between major sections       |
| **Card internal padding** | `p-6` (24px)                                    |
| **Card grid gap**         | `gap-4` (16px) — current is good                |
| **Component spacing**     | `space-y-4` (16px) between related elements     |
| **Inline spacing**        | `gap-2` to `gap-3` (8-12px)                     |

### Responsive Breakpoints

| Breakpoint  | Width      | Behavior                                      |
| ----------- | ---------- | --------------------------------------------- |
| **Mobile**  | <640px     | Single column, reduced padding, stacked cards |
| **Tablet**  | 640-1024px | 3-column summary cards, full table            |
| **Desktop** | >1024px    | Comfortable spacing, max-width container      |

---

## 7. Iconography

### Current State

Using Lucide icons throughout — this is good. Lucide provides consistent stroke widths and a cohesive set.

### Icon Guidelines

| Context               | Size            | Stroke        | Color                    |
| --------------------- | --------------- | ------------- | ------------------------ |
| **Inline with text**  | 16px (`size-4`) | 2px (default) | Inherit text color       |
| **Button icons**      | 16px (`size-4`) | 2px           | Inherit button color     |
| **Status indicators** | 20px (`size-5`) | 2px           | Status-specific color    |
| **Empty states**      | 48-64px         | 1.5px         | `text-muted-foreground`  |
| **Hero/Feature**      | 64-96px         | 1.5px         | Accent color or gradient |

### Key Icon Mapping

| Concept     | Current Icon      | Proposed Change                                 |
| ----------- | ----------------- | ----------------------------------------------- |
| Upload      | `UploadCloud`     | Keep (or custom illustration for drop zone)     |
| Success     | `CheckCircle2`    | Keep                                            |
| Failure     | `XCircle`         | Keep                                            |
| Warning     | `AlertTriangle`   | Keep                                            |
| Encrypted   | `LockKeyhole`     | Keep (increase to 20px in table)                |
| Unencrypted | `LockKeyholeOpen` | Keep (add subtle animation on hover)            |
| Loading     | `Loader2`         | Keep for inline, custom animation for full-page |
| Sort        | `ArrowUpDown`     | Consider `ChevronsUpDown` for more visibility   |

---

## 8. Shadows & Depth

### Shadow Scale

```css
:root {
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.03);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05);
  --shadow-md:
    0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-lg:
    0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05);
  --shadow-xl:
    0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.05);

  /* Colored shadows for emphasis */
  --shadow-success: 0 4px 14px -3px oklch(0.65 0.18 145 / 0.25);
  --shadow-destructive: 0 4px 14px -3px oklch(0.55 0.25 27 / 0.25);
}
```

### Usage Guidelines

| Component        | Default              | Hover       | Active      |
| ---------------- | -------------------- | ----------- | ----------- |
| **Cards**        | `shadow-sm`          | `shadow-md` | —           |
| **Buttons**      | none                 | none        | scale(0.98) |
| **Dropdowns**    | `shadow-lg`          | —           | —           |
| **Modals**       | `shadow-xl`          | —           | —           |
| **Success card** | `shadow-success`     | —           | —           |
| **Fail alert**   | `shadow-destructive` | —           | —           |

---

## 9. Dark Mode Considerations

Dark mode is **Phase 1 priority** — IT professionals expect it. The OKLCH color system enables simple lightness/chroma transformations.

### Dark Mode Token Values (Veeam 2025 Palette)

| Token              | Light Mode             | Dark Mode              | Notes                         |
| ------------------ | ---------------------- | ---------------------- | ----------------------------- |
| `--viridis`        | `oklch(0.75 0.22 155)` | `oklch(0.80 0.24 155)` | Brighter for dark backgrounds |
| `--ignis`          | `oklch(0.58 0.22 25)`  | `oklch(0.68 0.24 25)`  | Increased lightness           |
| `--suma`           | `oklch(0.72 0.19 55)`  | `oklch(0.78 0.21 55)`  | Increased lightness           |
| `--electric-azure` | `oklch(0.42 0.31 265)` | `oklch(0.60 0.28 265)` | Much brighter for visibility  |
| `--background`     | `oklch(1 0 0)`         | `oklch(0.15 0 0)`      | Near-black                    |
| `--foreground`     | `oklch(0.42 0.01 250)` | `oklch(0.92 0 0)`      | Near-white                    |
| `--fog`            | `oklch(0.95 0 0)`      | `oklch(0.20 0 0)`      | Dark panels                   |
| `--success-muted`  | `oklch(0.95 0.05 155)` | `oklch(0.22 0.08 155)` | Dark success bg               |
| `--warning-muted`  | `oklch(0.95 0.05 55)`  | `oklch(0.22 0.08 55)`  | Dark warning bg               |

### Implementation

Use system preference detection or manual toggle:

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* Dark mode overrides */
  }
}

/* Or manual class on <html> */
.dark {
  /* Dark mode overrides */
}
```

---

## 10. Implementation Sprints

Compressed from 5 phases into 3 focused sprints for faster production delivery.

### Sprint 1: The Foundation (Typography & Color)

**Goal:** Establish visual identity and semantic color system.

| Task                                                           | File(s)                               | Priority |
| -------------------------------------------------------------- | ------------------------------------- | -------- |
| Install Geist font via Google Fonts import                     | `src/index.css`                       | P0       |
| Add `--font-sans` and `--font-mono` variables                  | `src/index.css`                       | P0       |
| Add semantic color tokens (`--safe`, `--success`, `--warning`) | `src/index.css`                       | P0       |
| Add dark mode variants for new tokens                          | `src/index.css`                       | P0       |
| Apply `font-mono` to version numbers                           | `dashboard-view.tsx`                  | P1       |
| Update success states to use `--success`                       | `dashboard-view.tsx`, `job-table.tsx` | P1       |
| Update warning states to use `--warning`                       | `blockers-list.tsx`                   | P1       |

**Estimated effort:** 3-4 hours

**Acceptance Criteria:**

- [ ] Geist fonts render correctly in browser
- [ ] Version numbers display in monospace
- [ ] Success/warning/destructive states are visually distinct
- [ ] Dark mode works with new tokens

---

### Sprint 2: The Components (Cards & Table)

**Goal:** Apply visual polish to core dashboard components.

| Task                                                      | File(s)                      | Priority |
| --------------------------------------------------------- | ---------------------------- | -------- |
| Refactor summary cards with status-aware styling          | `dashboard-view.tsx`         | P0       |
| Add bottom accent bars to status cards                    | `dashboard-view.tsx`         | P0       |
| Update `JobTable` with sticky header, larger status icons | `job-table.tsx`              | P1       |
| Refine blocker alerts with severity hierarchy             | `blockers-list.tsx`          | P1       |
| Implement "Checklist Loader" with real pipeline steps     | `App.tsx`, `use-analysis.ts` | P0       |
| Add card hover states (`shadow-sm` → `shadow-md`)         | `card.tsx` or components     | P2       |

**Estimated effort:** 5-6 hours

**Acceptance Criteria:**

- [ ] Summary cards show colored accent bars based on status
- [ ] Loading state displays real validation steps as checklist
- [ ] Blockers are immediately distinguishable by severity
- [ ] Table rows clearly indicate encryption status

---

### Sprint 3: Polish (Motion & File Upload)

**Goal:** Add micro-interactions and refine the upload experience.

| Task                                                    | File(s)                                   | Priority |
| ------------------------------------------------------- | ----------------------------------------- | -------- |
| Add entrance animations (fade + rise) on page load      | Components                                | P1       |
| Implement stagger effects on card grid and blocker list | `dashboard-view.tsx`, `blockers-list.tsx` | P2       |
| Refine drag-and-drop zone with enhanced states          | `file-upload.tsx`                         | P1       |
| Add success celebration animation (checkmark draw)      | `dashboard-view.tsx`                      | P2       |
| Add button press feedback (scale)                       | `button.tsx`                              | P3       |
| Final dark mode QA and adjustments                      | All                                       | P1       |

**Estimated effort:** 5-7 hours

**Acceptance Criteria:**

- [ ] Page elements animate on entrance (not jarring)
- [ ] File upload zone responds to drag/hover with visual feedback
- [ ] Success state feels like an achievement
- [ ] All animations respect user's motion preferences
- [ ] Dark mode is polished and usable

---

### Total Estimated Effort

| Sprint   | Hours | Cumulative |
| -------- | ----- | ---------- |
| Sprint 1 | 3-4   | 3-4        |
| Sprint 2 | 5-6   | 8-10       |
| Sprint 3 | 5-7   | 13-17      |

**Total: 13-17 hours** (down from 20-30 in original 5-phase plan)

---

## 11. Acceptance Criteria

The design system is successfully implemented when:

1. **Typography:** Geist fonts render correctly; version numbers use `--font-mono`
2. **Color:** All UI elements use Veeam 2025 brand palette (Viridis, Ignis, Suma, Electric Azure)
3. **Motion:** Page elements animate on entrance; interactive elements have feedback
4. **Cards:** Summary cards show status-aware styling with Viridis/Ignis accent bars
5. **Blockers:** Alert severity is immediately distinguishable (Ignis for blockers, Suma for warnings)
6. **Loading:** Multi-step progress visible showing real validation pipeline steps
7. **Success:** Passing validation feels like an achievement (Viridis celebration)
8. **Accessibility:** All existing a11y features preserved; motion respects `prefers-reduced-motion`
9. **Performance:** No layout shift; animations don't block interaction
10. **Dark Mode:** All brand colors transform correctly; text remains readable

---

## 12. Design Decisions (Resolved)

1. **Brand Color:** ✅ **Viridis (`#00d15f`)** — Official Veeam 2025 Visual Identity primary green. Used for success states, primary buttons, and "Ready" indicators.

2. **Dark Mode Priority:** ✅ **Phase 1** — IT professionals overwhelmingly prefer dark mode. Implemented using OKLCH lightness/chroma transformations of the brand palette.

3. **Typography:** ✅ **Geist Sans + Geist Mono** — Modern engineering-grade typography (Vercel) rather than Veeam's marketing font (Source Sans Pro). Provides better readability for data-dense UI.

4. **Loading Fidelity:** ✅ **Real Pipeline Steps** — The `useAnalysis` hook emits step events. Display actual validation progress, not fake progress bars.

5. **Illustration Style:** ✅ **Lucide Icons (Scaled & Colored)** — Combine Lucide icons inside colored circular containers using brand palette. No custom SVGs needed.

6. **Animation Tech Stack:** ✅ **tailwindcss-animate only** — Already bundled with shadcn. No Framer Motion. CSS transitions handle 90% of animation needs.

7. **Motion Preference:** ✅ **Add Later** — Default to snappy transitions. CSS handles `prefers-reduced-motion` automatically in most cases.

---

## Appendix A: Quick Reference

### Veeam 2025 Color Palette

| Brand Name     | Hex       | OKLCH (Light)          | OKLCH (Dark)           | Usage            |
| -------------- | --------- | ---------------------- | ---------------------- | ---------------- |
| Viridis        | `#00d15f` | `oklch(0.75 0.22 155)` | `oklch(0.80 0.24 155)` | Primary, Success |
| Ignis          | `#ed2b3d` | `oklch(0.58 0.22 25)`  | `oklch(0.68 0.24 25)`  | Error, Blocker   |
| Suma           | `#fe8a25` | `oklch(0.72 0.19 55)`  | `oklch(0.78 0.21 55)`  | Warning          |
| Electric Azure | `#3700ff` | `oklch(0.42 0.31 265)` | `oklch(0.60 0.28 265)` | Info, Focus      |
| Dark Mineral   | `#505861` | `oklch(0.42 0.01 250)` | `oklch(0.92 0 0)`      | Primary Text     |
| French Grey    | `#adacaf` | `oklch(0.73 0.01 280)` | `oklch(0.35 0.01 280)` | Secondary Text   |
| Fog            | `#efefef` | `oklch(0.95 0 0)`      | `oklch(0.20 0 0)`      | Background       |

### Font Stack

```css
--font-sans: "Geist", ui-sans-serif, system-ui, sans-serif;
--font-mono: "Geist Mono", ui-monospace, monospace;
```

### Animation Defaults

```css
--duration-fast: 150ms;
--duration-normal: 250ms;
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
```

### CSS Variable Quick Copy

```css
/* Veeam 2025 Brand - Light Mode */
--viridis: oklch(0.75 0.22 155);
--ignis: oklch(0.58 0.22 25);
--suma: oklch(0.72 0.19 55);
--electric-azure: oklch(0.42 0.31 265);
--dark-mineral: oklch(0.42 0.01 250);
--french-grey: oklch(0.73 0.01 280);
--fog: oklch(0.95 0 0);
```

### Files Modified Per Sprint

| Sprint   | Files                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------- |
| Sprint 1 | `src/index.css`, `dashboard-view.tsx`, `blockers-list.tsx`, `job-table.tsx`                          |
| Sprint 2 | `App.tsx`, `use-analysis.ts`, `dashboard-view.tsx`, `job-table.tsx`, `blockers-list.tsx`, `card.tsx` |
| Sprint 3 | `file-upload.tsx`, `button.tsx`, all dashboard components                                            |

---

_Updated with Veeam 2025 Visual Identity v1.7. Proceed to Sprint 1 implementation upon final sign-off._
