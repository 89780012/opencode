const color = (name) => `rgb(var(${name}) / <alpha-value>)`

module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/streamdown/dist/index.js",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Segoe UI"',
          '"Microsoft YaHei"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Noto Sans CJK SC"',
          '"Source Han Sans SC"',
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        xs: "0.125rem",
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(15 23 42 / 0.05)",
      },
      colors: {
        border: color("--border"),
        input: color("--input"),
        ring: color("--ring"),
        background: color("--background"),
        foreground: color("--foreground"),
        primary: {
          DEFAULT: color("--primary"),
          foreground: color("--primary-foreground"),
        },
        secondary: {
          DEFAULT: color("--secondary"),
          foreground: color("--secondary-foreground"),
        },
        destructive: {
          DEFAULT: color("--destructive"),
          foreground: "rgb(255 255 255 / <alpha-value>)",
        },
        muted: {
          DEFAULT: color("--muted"),
          foreground: color("--muted-foreground"),
        },
        accent: {
          DEFAULT: color("--accent"),
          foreground: color("--accent-foreground"),
        },
        popover: {
          DEFAULT: color("--popover"),
          foreground: color("--popover-foreground"),
        },
        card: {
          DEFAULT: color("--card"),
          foreground: color("--card-foreground"),
        },
        chart: {
          1: color("--chart-1"),
          2: color("--chart-2"),
          3: color("--chart-3"),
          4: color("--chart-4"),
          5: color("--chart-5"),
        },
        sidebar: {
          DEFAULT: color("--sidebar"),
          foreground: color("--sidebar-foreground"),
          primary: color("--sidebar-primary"),
          "primary-foreground": color("--sidebar-primary-foreground"),
          accent: color("--sidebar-accent"),
          "accent-foreground": color("--sidebar-accent-foreground"),
          border: color("--sidebar-border"),
          ring: color("--sidebar-ring"),
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
