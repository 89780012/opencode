import { request } from "@/api/client";
import { opencode } from "@/api/opencode";
import type {
  GlobalSkillCatalog,
  RuntimeSkill,
  SkillBody,
  SkillChange,
} from "@/types/skill";

export const skillApi = {
  listRuntime() {
    return opencode.get<RuntimeSkill[]>("/skill");
  },

  listGlobal() {
    return request.get<GlobalSkillCatalog>("/opencode/skills");
  },

  createGlobal(body: SkillBody) {
    return request.post<SkillChange, SkillBody>("/opencode/skills", body);
  },

  updateGlobal(name: string, body: Pick<SkillBody, "content">) {
    return request.put<SkillChange, Pick<SkillBody, "content">>(
      `/opencode/skills/${encodeURIComponent(name)}`,
      body,
    );
  },

  removeGlobal(name: string) {
    return request.delete<SkillChange>(`/opencode/skills/${encodeURIComponent(name)}`);
  },
};
