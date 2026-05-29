import { popular } from "../../provider/utils"
import type { Row } from "./types"

export function match(row: Row, q: string) {
  if (!q) return true
  return `${row.provider.name} ${row.name} ${row.id}`.toLowerCase().includes(q)
}

export function sortProvider(a: string, b: string, map: Map<string, string>) {
  const ai = popular.indexOf(a)
  const bi = popular.indexOf(b)
  const ap = ai >= 0
  const bp = bi >= 0

  if (ap && !bp) return -1
  if (!ap && bp) return 1
  if (ap && bp) return ai - bi

  return (map.get(a) ?? a).localeCompare(map.get(b) ?? b)
}
