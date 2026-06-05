import { request } from "@/api/client"

export type Hit = {
  source_text: string
  normalized_text: string
  confidence: number
}

export type Analyze = {
  title: string
  summary: string
  requirement_items: string[]
  dimensions: Record<string, Hit[]>
  model: string
}

export const workbenchApi = {
  identify(message: string) {
    return request.post<Analyze, { message: string }>("/workbench/requirements/identify", { message }, { timeout: 60000 })
  },
}
