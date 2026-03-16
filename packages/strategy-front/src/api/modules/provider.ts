import { opencode } from "@/api/opencode";
import type { Auth, AuthMap, Config, Grant, List } from "@/types/provider";

export const providerApi = {
  list() {
    return opencode.get<List>("/provider");
  },

  auth() {
    return opencode.get<AuthMap>("/provider/auth");
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

  config() {
    return opencode.get<Config>("/global/config");
  },

  update(cfg: Partial<Config>) {
    return opencode.patch<Config, Partial<Config>>("/global/config", cfg);
  },

  dispose() {
    return opencode.post<boolean>("/global/dispose");
  },
};
