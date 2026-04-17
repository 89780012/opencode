function pick() {
  if (typeof window === "undefined") {
    return
  }

  try {
    return window.localStorage
  } catch {
    return
  }
}

export function load(key: string) {
  const store = pick()
  if (!store) {
    return null
  }

  try {
    return store.getItem(key)
  } catch {
    return null
  }
}

export function save(key: string, value: string) {
  const store = pick()
  if (!store) {
    return false
  }

  try {
    store.setItem(key, value)
    return true
  } catch {
    return false
  }
}
