import type { Config } from "tailwindcss";

/**
 * Design tokens — LocalBiz AI (SPEC §20).
 * Values here are the single source of truth for color, type, spacing,
 * radius and elevation. Do not hardcode hex values in components.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    // §20.6 Responsive breakpoints — sm 640 · md 768 · lg 1024 · xl 1280
    // (these match Tailwind defaults; restated to lock them against drift)
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
    },
    extend: {
      // §20.2 Color tokens
      colors: {
        primary: {
          50: "#F0FDFA", // tinted backgrounds, selected chips
          600: "#0F766E", // primary actions, active nav, key chart series (deep teal)
          700: "#115E59", // hover
        },
        accent: {
          500: "#D97706", // secondary chart series, highlights (amber)
        },
        bg: {
          app: "#F8FAFC", // page background
          card: "#FFFFFF", // cards, surfaces
        },
        border: "#E2E8F0", // card borders, dividers
        text: {
          900: "#0F172A", // headings, KPI values
          600: "#475569", // body
          400: "#94A3B8", // labels, captions, axes
        },
        success: "#059669", // positive deltas, growing
        warning: "#D97706", // caution, needs attention
        error: "#DC2626", // errors, declining, negative deltas
        // Chart categorical palette (in order) — §20.2
        chart: {
          1: "#0F766E",
          2: "#D97706",
          3: "#7C3AED",
          4: "#0891B2",
          5: "#DB2777",
          6: "#65A30D",
          7: "#E11D48",
          8: "#475569",
        },
      },
      // Default border color → the `border` token (§20.2)
      borderColor: {
        DEFAULT: "#E2E8F0",
      },
      // §20.3 Typography
      fontFamily: {
        sans: [
          "Inter Variable",
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        // role: [size, { lineHeight, letterSpacing, fontWeight }]
        display: ["48px", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-mobile": ["32px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        h1: ["30px", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
        h2: ["20px", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["16px", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["15px", { lineHeight: "1.6", fontWeight: "400" }],
        small: ["13px", { lineHeight: "1.4", fontWeight: "500" }],
        caption: ["12px", { lineHeight: "1.4", fontWeight: "400" }],
        kpi: ["32px", { lineHeight: "1.1", fontWeight: "700" }],
      },
      // §20.4 Spacing — 4px base scale: 4,8,12,16,24,32,48,64,96
      // (Tailwind's default numeric scale already yields these; the named
      //  tokens below cover the section rhythm called out in §9.1.)
      spacing: {
        section: "96px",
        "section-mobile": "56px",
        "card-pad": "24px",
        "card-pad-mobile": "16px",
      },
      // §20.4 Radius — sm 6 (inputs, chips) · md 10 (buttons) · lg 14 (cards) · full
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        full: "9999px",
      },
      // §20.4 Elevation — subtle only
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.06)",
        "card-hover": "0 4px 12px rgba(15,23,42,.08)",
        popover: "0 8px 24px rgba(15,23,42,.12)",
      },
      maxWidth: {
        content: "1200px", // §9.1 landing max content width
        chat: "760px", // §9.7 chat column
      },
    },
  },
  plugins: [],
};

export default config;
