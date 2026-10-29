import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Avocado greens from the logo (skin #6aa854, ring #aec943), replacing Tailwind's cooler emerald everywhere
        emerald: {
          50: "#f4f9ea",
          100: "#e5f2cf",
          200: "#cde6a3",
          300: "#b0d67a",
          400: "#93c35a",
          500: "#74aa45",
          600: "#5a8c36",
          700: "#466d2c",
          800: "#3a5727",
          900: "#304823",
          950: "#18270f",
        },
      },
    },
  },
  plugins: [],
};
export default config;
