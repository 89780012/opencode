export function slash(path: string) {
  return path.replace(/\\/g, "/")
}

export function relative(root?: string | null, path?: string | null) {
  const file = slash((path ?? "").trim())
  if (!file) return null

  const dir = slash((root ?? "").trim()).replace(/\/+$/, "")
  if (!dir) return file.replace(/^\.\/+/, "")

  const win = /^[a-z]:\//i.test(dir) || /^[a-z]:\//i.test(file)
  const base = win ? dir.toLowerCase() : dir
  const next = win ? file.toLowerCase() : file

  if (next === base) return null
  if (next.startsWith(`${base}/`)) return file.slice(dir.length + 1).replace(/^\.\/+/, "")
  return file.replace(/^\.\/+/, "")
}
