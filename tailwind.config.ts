import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        gov: {
          primary: "#063055",
          secondary: "#0F4578",
          header: "#041e38",
          accent: "#1a6bb5",
          success: "#15803D",
          warning: "#D97706",
          danger: "#DC2626",
          background: "#EEF2F7",
          surface: "#F8FAFC",
        },
        compliance: {
          green: "#16A34A",
          yellow: "#F59E0B",
          red: "#DC2626",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      boxShadow: {
        portal: "0 1px 2px rgba(4, 30, 56, 0.06), 0 4px 16px rgba(4, 30, 56, 0.08)",
        "portal-lg": "0 4px 6px rgba(4, 30, 56, 0.05), 0 12px 32px rgba(4, 30, 56, 0.12)",
        "portal-nav": "inset 3px 0 0 0 #063055",
      },
      backgroundImage: {
        "portal-mesh":
          "radial-gradient(at 40% 20%, rgba(26, 107, 181, 0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(6, 48, 85, 0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(15, 69, 120, 0.05) 0px, transparent 50%)",
        "header-shine": "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
