import { opencode } from "@/api/opencode";
import type { Auth, AuthMap, Config, DetectModel, Grant, List } from "@/types/provider";

function modelsUrl(baseURL: string) {
  const url = baseURL.trim().replace(/\/+$/, "");
  return url.endsWith("/models") ? url : `${url}/models`;
}

export const providerApi = {
  list(directory?: string | null) {
    return opencode.get<List>("/provider", {
      params: directory ? { directory } : undefined,
    });
  },

  auth() {
    return opencode.get<AuthMap>("/provider/auth");
  },

  async discover(body: { baseURL: string; apiKey?: string; headers?: Record<string, string> }) {
    const headers = new Headers({
      Accept: "application/json",
    });

    for (const [key, value] of Object.entries(body.headers ?? {})) {
      const k = key.trim();
      const v = value.trim();
      if (!k || !v) continue;
      headers.set(k, v);
    }

    const key = body.apiKey?.trim();
    if (key && !headers.has("authorization")) {
      headers.set("authorization", `Bearer ${key}`);
    }

    const res = await fetch(modelsUrl(body.baseURL), {
      method: "GET",
      headers,
    });

    const data = await res.json().catch(() => undefined);

    if (!res.ok) {
      const msg =
        data &&
        typeof data === "object" &&
        "error" in data &&
        data.error &&
        typeof data.error === "object" &&
        "message" in data.error &&
        typeof data.error.message === "string"
          ? data.error.message
          : `获取模型失败: ${res.status}`;
      throw new Error(msg);
    }

    const rows: unknown[] = Array.isArray(data)
      ? data
      : data && typeof data === "object" && "data" in data && Array.isArray(data.data)
        ? data.data
        : data && typeof data === "object" && "models" in data && Array.isArray(data.models)
          ? data.models
          : [];

    return rows.flatMap<DetectModel>((item) => {
      if (!item || typeof item !== "object" || !("id" in item) || typeof item.id !== "string") return [];
      const id = item.id.trim();
      if (!id) return [];
      const name = "name" in item && typeof item.name === "string" && item.name.trim() ? item.name.trim() : id;
      return [{ id, name }];
    });
  },

  set(providerID: string, auth: Auth) {
    return opencode.put<boolean, Auth>(`/auth/${encodeURIComponent(providerID)}`, auth);
  },

  remove(providerID: string) {
    return opencode.delete<boolean>(`/auth/${encodeURIComponent(providerID)}`);
  },

  authorize(providerID: string, method: number) {
    return opencode.post<Grant, { method: number }>(
      `/provider/${encodeURIComponent(providerID)}/oauth/authorize`,
      { method },
    );
  },

  callback(providerID: string, body: { method?: number; code?: string }) {
    return opencode.post<boolean, { method?: number; code?: string }>(
      `/provider/${encodeURIComponent(providerID)}/oauth/callback`,
      body,
    );
  },

  config(directory?: string | null) {
    const url = directory ? "/config" : "/global/config";
    return opencode.get<Config>(url, {
      params: directory ? { directory } : undefined,
    });
  },

  update(cfg: Partial<Config>) {
    return opencode.patch<Config, Partial<Config>>("/global/config", cfg);
  },

  dispose() {
    return opencode.post<boolean>("/global/dispose");
  },
};
