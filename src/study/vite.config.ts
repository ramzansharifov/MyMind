import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      ignored: [
        "**/data/**",
        "**/.backup/**",
        "**/server/**"
      ],
    },
    proxy: {
      "/api": {
        target: "http://localhost:5174",
        changeOrigin: true,
      },
    },
  },
});
