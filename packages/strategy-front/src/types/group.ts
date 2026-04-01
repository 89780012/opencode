import type { LocalWorkspace } from "@/types/workspace"

export interface StrategyGroupItem {
  id: string
  name: string
  path: string
  order: number
  workspace: LocalWorkspace
}

export interface StrategyGroup {
  id: string
  name: string
  count: number
  created_at: number
  updated_at: number
  items: StrategyGroupItem[]
}

export interface GroupListResponse {
  groups: StrategyGroup[]
}

export interface GroupDetailResponse {
  group: StrategyGroup
}

export interface CreateGroupRequest {
  name: string
  count: number
  git?: boolean
  paths?: string[]
}

export interface CreateGroupResponse {
  group: StrategyGroup
}
