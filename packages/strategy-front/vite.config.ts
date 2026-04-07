import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000"
  const opencodeProxyTarget = env.VITE_OPENCODE_PROXY_TARGET || apiProxyTarget
  const isDevelopMode = mode === "development"
  const root = path.resolve(__dirname, "./node_modules")
  const reactRoot = path.resolve(root, "./react")
  const reactDom = path.resolve(root, "./react-dom")
  const reactRedux = path.resolve(root, "./react-redux")

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        { find: "@", replacement: path.resolve(__dirname, "./src") },
        { find: "react", replacement: reactRoot },
        { find: "react/jsx-runtime", replacement: path.resolve(reactRoot, "./jsx-runtime.js") },
        { find: "react/jsx-dev-runtime", replacement: path.resolve(reactRoot, "./jsx-dev-runtime.js") },
        { find: "react-dom", replacement: reactDom },
        { find: "react-dom/client", replacement: path.resolve(reactDom, "./client.js") },
        { find: "react-redux", replacement: reactRedux },
      ],
      dedupe: ["react", "react-dom", "react-redux"],
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
