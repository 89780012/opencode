import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

function children() {
  const list = [Element, Document, DocumentFragment]
    .filter((item) => typeof item !== "undefined")
    .map((item) => item.prototype)

  list.forEach((item) => {
    if ("replaceChildren" in item) {
      return
    }

    Object.defineProperty(item, "replaceChildren", {
      configurable: true,
      writable: true,
      value(...nodes: (string | Node)[]) {
        while (this.firstChild) {
          this.removeChild(this.firstChild)
        }
        if (nodes.length > 0) {
          this.append(...nodes)
        }
      },
    })
  })
}

function gap() {
  if (typeof document === "undefined") {
    return true
  }

  const node = document.createElement("div")
  node.style.display = "flex"
  node.style.flexDirection = "column"
  node.style.rowGap = "1px"
  node.append(document.createElement("div"), document.createElement("div"))
  document.body.append(node)
  const ok = node.scrollHeight === 1
  node.remove()
  return ok
}

function frame() {
  if (typeof window === "undefined") {
    return false
  }
  return window.self !== window.top
}

if (!gap()) {
  document.documentElement.classList.add("no-flex-gap")
}

if (frame()) {
  document.documentElement.classList.add("in-iframe")
  document.body.classList.add("in-iframe")
}

children()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
