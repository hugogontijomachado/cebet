import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#150f23",
        "ink-deep": "#1f1633",
        ink: "#1f1633",
        canvas: "#1f1633", // surface-canvas-dark
        night: "#150f23", // surface-night
        paper: "#ffffff", // surface-canvas-light
        lime: "#c2ef4e",
        pink: "#fa7faa",
        "violet-link": "#6a5fc1",
        "violet-deep": "#422082",
        "violet-mid": "#79628c",
        "hairline-violet": "#362d59",
        "hairline-cool": "#cfcfdb",
        "hairline-cloud": "#e5e7eb",
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
        xxl: "18px",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        ui: ["var(--font-ui)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
