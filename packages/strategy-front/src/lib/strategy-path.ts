export function encodeStrategyPath(path: string) {
  return encodeURIComponent(path)
}

export function decodeStrategyPath(path: string) {
  return decodeURIComponent(path)
}

export function encodeStrategyQuery(paths: string[]) {
  const query = new URLSearchParams()
  paths.forEach((path) => {
    query.append("path", encodeStrategyPath(path))
  })
  return query.toString()
}
