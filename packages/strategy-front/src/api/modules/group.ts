import { request } from "@/api/client"
import type {
  CreateGroupRequest,
  CreateGroupResponse,
  GroupDetailResponse,
  GroupListResponse,
} from "@/types/group"

export const groupApi = {
  list() {
    return request.get<GroupListResponse>("/group/list")
  },

  detail(id: string) {
    return request.get<GroupDetailResponse>("/group/detail", {
      params: {
        id,
      },
    })
  },

  create(name: string, count: number) {
    return request.post<CreateGroupResponse, CreateGroupRequest>("/group/create", {
      name,
      count,
      git: true,
    })
  },
}
