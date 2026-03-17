import type { Model, Provider } from "@/types/provider";

export type Vis = "show" | "hide";
export type ModelKey = {
  providerID: string;
  modelID: string;
};
export type ModelRow = Model & {
  provider: Provider;
};

export const modelStoreKey = "strategy-front.provider-models.v1";
const win = 1000 * 60 * 60 * 24 * 30 * 6;

export function modelKey(input: ModelKey) {
  return `${input.providerID}:${input.modelID}`;
}

export function readModelVisibility() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(modelStoreKey);
    if (!raw) return {};
    const data = JSON.parse(raw) as { user?: Record<string, Vis> };
    return data.user ?? {};
  } catch {
    return {};
  }
}

export function stamp(value: string) {
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : Number.NaN;
}

export function latestModels(rows: ModelRow[]) {
  const now = Date.now();
  const grp = new Map<string, Map<string, ModelRow[]>>();

  rows.forEach((row) => {
    const ts = stamp(row.release_date);
    if (!Number.isFinite(ts) || Math.abs(now - ts) >= win) return;

    const map = grp.get(row.provider.id) ?? new Map<string, ModelRow[]>();
    const fam = row.family ?? "";
    const list = map.get(fam) ?? [];
    list.push(row);
    map.set(fam, list);
    grp.set(row.provider.id, map);
  });

  const set = new Set<string>();
  grp.forEach((map) => {
    map.forEach((items) => {
      const row = items.slice().sort((a, b) => stamp(b.release_date) - stamp(a.release_date))[0];
      if (!row) return;
      set.add(modelKey({ providerID: row.provider.id, modelID: row.id }));
    });
  });
  return set;
}

export function modelVisible(input: {
  row?: ModelRow;
  user: Record<string, Vis>;
  latest: Set<string>;
  model: ModelKey;
}) {
  const id = modelKey(input.model);
  const cur = input.user[id];
  if (cur === "hide") return false;
  if (cur === "show") return true;
  if (input.latest.has(id)) return true;
  return !Number.isFinite(stamp(input.row?.release_date ?? ""));
}
