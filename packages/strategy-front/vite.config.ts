import path from "path"
import { transformAsync } from "@babel/core"
import preset from "@babel/preset-env"
import legacy from "@vitejs/plugin-legacy"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000"
  const opencodeProxyTarget = env.VITE_OPENCODE_PROXY_TARGET || apiProxyTarget
  const isDevelopMode = mode === "development"
  const compat = "es2019"
  const poly =
    '(function(){var g=typeof globalThis!=="undefined"?globalThis:typeof self!=="undefined"?self:typeof window!=="undefined"?window:typeof global!=="undefined"?global:this;if(typeof globalThis==="undefined"){g.globalThis=g}if(typeof g.queueMicrotask!=="function"){g.queueMicrotask=function(fn){if(typeof Promise==="function"){Promise.resolve().then(fn).catch(function(err){setTimeout(function(){throw err},0)})}else{setTimeout(fn,0)}}}if(typeof g.WeakRef!=="function"){g.WeakRef=function(value){this._value=value};g.WeakRef.prototype.deref=function(){return this._value}}if(typeof g.FinalizationRegistry!=="function"){g.FinalizationRegistry=function(){};g.FinalizationRegistry.prototype.register=function(){};g.FinalizationRegistry.prototype.unregister=function(){return false}}if(typeof Promise==="function"&&typeof Promise.allSettled!=="function"){Promise.allSettled=function(list){return Promise.all(Array.prototype.map.call(list,function(item){return Promise.resolve(item).then(function(value){return{status:"fulfilled",value:value}},function(reason){return{status:"rejected",reason:reason}})}))}}if(typeof Object.fromEntries!=="function"){Object.fromEntries=function(entries){var obj={};for(var it=entries[Symbol.iterator](),step=it.next();!step.done;step=it.next()){var entry=step.value;if(Object(entry)!==entry)throw new TypeError("Iterator value "+entry+" is not an entry object");obj[entry[0]]=entry[1]}return obj}}var at=function(n){var i=Math.trunc(Number(n)||0)||0;var l=this.length>>>0;if(i<0)i+=l;if(i<0||i>=l)return void 0;return this[i]};var def=function(target){if(target&&typeof target.at!==\"function\"){Object.defineProperty(target,\"at\",{value:at,configurable:true,writable:true})}};def(Array.prototype);def(String.prototype);def(typeof Int8Array!==\"undefined\"&&Int8Array.prototype);def(typeof Uint8Array!==\"undefined\"&&Uint8Array.prototype);def(typeof Uint8ClampedArray!==\"undefined\"&&Uint8ClampedArray.prototype);def(typeof Int16Array!==\"undefined\"&&Int16Array.prototype);def(typeof Uint16Array!==\"undefined\"&&Uint16Array.prototype);def(typeof Int32Array!==\"undefined\"&&Int32Array.prototype);def(typeof Uint32Array!==\"undefined\"&&Uint32Array.prototype);def(typeof Float32Array!==\"undefined\"&&Float32Array.prototype);def(typeof Float64Array!==\"undefined\"&&Float64Array.prototype);def(typeof BigInt64Array!==\"undefined\"&&BigInt64Array.prototype);def(typeof BigUint64Array!==\"undefined\"&&BigUint64Array.prototype);if(typeof HTMLFormElement!==\"undefined\"&&HTMLFormElement.prototype&&typeof HTMLFormElement.prototype.requestSubmit!==\"function\"){HTMLFormElement.prototype.requestSubmit=function(submitter){if(submitter){submitter.click();return}var btn=this.querySelector(\"button[type=\\\"submit\\\"],input[type=\\\"submit\\\"]\");if(btn){btn.click();return}this.submit()}}})();'
  const targets = ["chrome >= 64", "edge >= 79", "firefox >= 67", "safari >= 12", "ios >= 12", "not IE 11"]
  const root = path.resolve(__dirname, "./node_modules")
  const reactRoot = path.resolve(root, "./react")
  const reactDom = path.resolve(root, "./react-dom")
  const reactRedux = path.resolve(root, "./react-redux")

  return {
    base: "./",
    plugins: [
      react(),
      legacy({
        modernTargets: ["chrome >= 80", "edge >= 80", "firefox >= 78", "safari >= 14", "ios >= 14"],
        renderLegacyChunks: true,
        targets,
      }),
      {
        name: "strategy-front-monaco-compat",
        apply: "build",
        transform(code, id) {
          if (!/monaco-editor[\\/]+esm[\\/]+vs[\\/]+editor[\\/]+common[\\/]+services[\\/]findSectionHeaders\.js$/.test(id)) return null
          const next = code
            .replace(
              "const markRegex = new RegExp('\\\\bMARK:\\\\s*(.*)$', 'd');",
              () => "const markRegex = new RegExp('\\\\bMARK:\\\\s*(.*)$');",
            )
            .replace(
              /const column = match\.indices\[1\]\[0\] \+ 1;\s+const endColumn = match\.indices\[1\]\[1\] \+ 1;/,
              () =>
                "const column = match.index + match[0].length - match[1].length + 1;\n        const endColumn = match.index + match[0].length + 1;",
            )
          if (next === code) return null
          return {
            code: next,
            map: null,
          }
        },
      },
      {
        name: "strategy-front-modern-build",
        configResolved(cfg) {
          const i = cfg.plugins.findIndex((p) => p.name === "vite:esbuild-transpile")
          if (i >= 0) cfg.plugins.splice(i, 1)
        },
      },
      {
        name: "strategy-front-babel-compat",
        apply: "build",
        async renderChunk(code, chunk) {
          if (!chunk.fileName.endsWith(".js")) return null
          const next = code
            .replace(/`\/\*\$\{label\}\*\/`,/, "`/*${label}*/`,`" + poly + "`,")
            .replace(
              /const ttPolicy = globalThis\.trustedTypes\?\.createPolicy\('defaultWorkerFactory', \{ createScriptURL: value => value \}\);/g,
              "const ttPolicy = globalThis.trustedTypes ? globalThis.trustedTypes.createPolicy('defaultWorkerFactory', { createScriptURL: function(value) { return value; } }) : void 0;",
            )
            .replace(
              /await import\(ttPolicy\?\.createScriptURL\(([^)]+)\) \?\? ([^)]+)\);/g,
              "await import(ttPolicy ? ttPolicy.createScriptURL($1) : $2);",
            )
            .replace(
              /importScripts\(ttPolicy\?\.createScriptURL\(([^)]+)\) \?\? ([^)]+)\);/g,
              "importScripts(ttPolicy ? ttPolicy.createScriptURL($1) : $2);",
            )
          const out = await transformAsync(next, {
            babelrc: false,
            configFile: false,
            presets: [[preset, { bugfixes: true, modules: false, targets }]],
          })
          if (!out?.code) return null
          return {
            code: out.code,
          }
        },
      },
    ],
    build: {
      minify: "terser",
      rollupOptions: {
        output: {
          intro: poly,
        },
      },
      terserOptions: {
        compress: {
          ecma: 2019,
        },
        ecma: 2019,
        format: {
          ecma: 2019,
        },
      },
    },
    esbuild: {
      target: compat,
    },
    optimizeDeps: {
      esbuildOptions: {
        target: compat,
      },
    },
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
                ws: true,
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
