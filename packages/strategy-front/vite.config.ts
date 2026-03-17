import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000"
  const opencodeProxyTarget = env.VITE_OPENCODE_PROXY_TARGET || apiProxyTarget
  const isDevelopMode = mode === "development"

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server:
      command === "serve" && isDevelopMode
        ? {
            proxy: {
              "/api": {
                target: apiProxyTarget,
                changeOrigin: true,
              },
              "/opencode": {
                target: opencodeProxyTarget,
                changeOrigin: true,
                rewrite: (p) => p.replace(/^\/opencode/, ""),
              },
            },
          }
        : undefined,
  }
})
