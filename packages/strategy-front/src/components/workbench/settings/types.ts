import type { ComposerModel } from "@/types/composer"

export type Tab = "providers" | "models"
export type Vis = "show" | "hide"
export type Row = ComposerModel & {
  def: boolean
  free: boolean
}
