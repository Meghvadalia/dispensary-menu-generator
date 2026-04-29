import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const proxyTarget = process.env.VITE_PROXY_TARGET || "http://localhost:3001";

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
