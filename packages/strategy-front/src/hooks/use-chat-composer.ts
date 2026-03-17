import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { agentApi, providerApi } from "@/api/modules";
import type { Agent, ComposerState } from "@/types/agent";
import type { ChatModelRef } from "@/types/chat";
import type { Config, List, Model, Provider } from "@/types/provider";
import { latestModels, modelVisible, readModelVisibility } from "@/lib/model-catalog";

export type ComposerModel = Model & {
  provider: Provider;
};

type Item = {
  draft?: ComposerState;
  session?: Record<string, ComposerState | undefined>;
  recent?: ChatModelRef[];
  accept?: boolean;
};

const key = "strategy-front.chat-composer.v2";
const old = "strategy-front.chat-composer.v1";
const max = 5;

function parse<T>(key: string) {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    return JSON.parse(raw) as T;
  } catch {
    return;
  }
}

function read(): Record<string, Item> {
  const cur = parse<Record<string, Item>>(key);
  if (cur) return cur;

  const oldState = parse<Record<string, ComposerState>>(old);
  if (!oldState) return {};

  return Object.fromEntries(
    Object.entries(oldState).map(([id, item]) => [
      id,
      {
        draft: item,
        session: {},
        recent: item.model ? [item.model] : [],
      } satisfies Item,
    ]),
  );
}

function write(all: Record<string, Item>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(all));
}

function same(a?: ChatModelRef, b?: ChatModelRef) {
  if (!a || !b) return false;
  return a.providerID === b.providerID && a.modelID === b.modelID;
}

function hasPermissionPromptRules(permission: Config["permission"]) {
  if (!permission) return false;
  if (typeof permission === "string") return permission !== "allow";
  return Object.values(permission).some((item) => {
    if (typeof item === "string") return item !== "allow";
    if (!item || typeof item !== "object") return false;
    return Object.values(item).some((value) => value !== "allow");
  });
}

function rank(name: string) {
  if (name === "build") return 0;
  if (name === "plan") return 1;
  return 2;
}

export function useChatComposer(workspacePath?: string | null, sessionID?: string | null) {
  const [ags, setAgs] = useState<Agent[]>([]);
  const [prv, setPrv] = useState<List>({
    all: [],
    connected: [],
    default: {},
  });
  const [allRows, setAllRows] = useState<ComposerModel[]>([]);
  const [rows, setRows] = useState<ComposerModel[]>([]);
  const [cfg, setCfg] = useState<Config>({});
  const [all, setAll] = useState<Record<string, Item>>(() => read());
  const [load, setLoad] = useState(false);
  const prev = useRef<string | null>(null);
  const user = useMemo(() => readModelVisibility(), []);
  const cur: Item = workspacePath ? (all[workspacePath] ?? {}) : {};

  useEffect(() => {
    write(all);
  }, [all]);

  useEffect(() => {
    if (!workspacePath) {
      setAgs([]);
      setPrv({ all: [], connected: [], default: {} });
      setAllRows([]);
      setRows([]);
      setCfg({});
      return;
    }

    let dead = false;
    const run = async () => {
      setLoad(true);
      try {
        const [agent, provider, config] = await Promise.all([
          agentApi.list(workspacePath),
          providerApi.list(workspacePath),
          providerApi.config(workspacePath),
        ]);
        if (dead) return;

        const list = agent.filter((item) => item.mode === "primary" && !item.hidden);
        const ags = [...list].sort((a, b) => {
          const diff = rank(a.name) - rank(b.name);
          if (diff !== 0) return diff;
          return a.name.localeCompare(b.name);
        });
        const ids = new Set(provider.connected);
        const allRows = provider.all
          .filter((item) => ids.has(item.id))
          .flatMap((provider) =>
            Object.values(provider.models).map((model) => ({
              ...model,
              provider,
            })),
          );
        const latest = latestModels(allRows);
        const next = allRows.filter((item) =>
          modelVisible({
            row: item,
            user,
            latest,
            model: { providerID: item.provider.id, modelID: item.id },
          }),
        );

        setAgs(ags);
        setPrv(provider);
        setAllRows(allRows);
        setRows(next);
        setCfg(config);
      } finally {
        if (!dead) setLoad(false);
      }
    };

    void run();

    return () => {
      dead = true;
    };
  }, [user, workspacePath]);

  useEffect(() => {
    if (!workspacePath) return;
    if (cur.accept !== undefined) return;
    if (cfg.permission !== "allow") return;
    setAll((prev) => ({
      ...prev,
      [workspacePath]: {
        ...prev[workspacePath],
        accept: true,
      },
    }));
  }, [cfg.permission, cur.accept, workspacePath]);

  useEffect(() => {
    const last = prev.current;
    prev.current = sessionID ?? null;
    if (!workspacePath || !sessionID || last !== null) return;
    if (!cur.draft || cur.session?.[sessionID]) return;
    setAll((prev) => ({
      ...prev,
      [workspacePath]: {
        ...prev[workspacePath],
        draft: undefined,
        session: {
          ...(prev[workspacePath]?.session ?? {}),
          [sessionID]: prev[workspacePath]?.draft,
        },
      },
    }));
  }, [cur.draft, cur.session, sessionID, workspacePath]);

  const save = useCallback((fn: (item: Item) => Item) => {
    if (!workspacePath) return;
    setAll((prev) => ({
      ...prev,
      [workspacePath]: fn(prev[workspacePath] ?? {}),
    }));
  }, [workspacePath]);

  const push = useCallback((model: ChatModelRef) => {
    save((item) => {
      const recent = [model, ...(item.recent ?? []).filter((x) => !same(x, model))].slice(0, max);
      return {
        ...item,
        recent,
      };
    });
  }, [save]);

  const writePick = useCallback((next: Partial<ComposerState>) => {
    save((item) => {
      const prev = sessionID ? item.session?.[sessionID] : item.draft;
      const value = {
        ...prev,
        ...next,
      } satisfies ComposerState;
      if (sessionID) {
        return {
          ...item,
          session: {
            ...(item.session ?? {}),
            [sessionID]: value,
          },
        };
      }
      return {
        ...item,
        draft: value,
      };
    });
  }, [save, sessionID]);

  const list = useMemo(() => ags.map((item) => item.name), [ags]);
  const pick = useMemo(() => {
    if (sessionID && cur.session?.[sessionID]) return cur.session[sessionID];
    return cur.draft;
  }, [cur.draft, cur.session, sessionID]);

  const valid = useCallback((model?: ChatModelRef) => {
    if (!model) return false;
    return allRows.some((item) => same(model, { providerID: item.provider.id, modelID: item.id }));
  }, [allRows]);

  const agent = useMemo(() => {
    if (ags.length === 0) return undefined;
    return ags.find((item) => item.name === pick?.agent) ?? ags[0];
  }, [ags, pick?.agent]);

  const cfgModel = useMemo(() => {
    if (!cfg.model) return undefined;
    const [providerID, modelID] = cfg.model.split("/");
    const item = { providerID, modelID };
    if (!valid(item)) return undefined;
    return item;
  }, [cfg.model, valid]);

  const recent = useMemo(() => (cur.recent ?? []).find(valid), [cur.recent, valid]);

  const model = useMemo(() => {
    const by = prv.all
      .filter((item) => prv.connected.includes(item.id))
      .flatMap((item) => {
        const modelID = prv.default[item.id];
        if (modelID) return [{ providerID: item.id, modelID }];
        const first = Object.values(item.models)[0];
        if (!first) return [];
        return [{ providerID: item.id, modelID: first.id }];
      })
    const first = allRows[0] ? { providerID: allRows[0].provider.id, modelID: allRows[0].id } : undefined;
    const list = [
      pick?.model,
      agent?.model,
      cfgModel,
      recent,
      ...by,
      first,
    ].filter((item): item is ChatModelRef => !!item);
    return list.find(valid);
  }, [agent?.model, allRows, cfgModel, pick?.model, prv.all, prv.connected, prv.default, recent, valid]);

  const row = useMemo(
    () => allRows.find((item) => same(model, { providerID: item.provider.id, modelID: item.id })),
    [allRows, model],
  );

  const vars = useMemo(
    () => (row?.variants ? Object.keys(row.variants) : []),
    [row],
  );

  const cfgVar = useMemo(() => {
    if (!agent?.variant || !agent.model || !row?.variants) return undefined;
    if (!same(agent.model, model)) return undefined;
    return agent.variant in row.variants ? agent.variant : undefined;
  }, [agent?.model, agent?.variant, model, row?.variants]);

  const variant = useMemo(() => {
    if (pick?.variant === null) return undefined;
    if (pick?.variant && vars.includes(pick.variant)) return pick.variant;
    if (cfgVar && vars.includes(cfgVar)) return cfgVar;
    return undefined;
  }, [cfgVar, pick?.variant, vars]);

  const state = useMemo(
    () => ({
      agent: agent?.name,
      model,
      variant,
    }),
    [agent?.name, model, variant],
  );

  const setAgent = useCallback((name: string) => {
    const item = ags.find((item) => item.name === name);
    if (!item) return;
    writePick({
      agent: item.name,
      model: item.model ? { ...item.model } : undefined,
      variant: item.variant ?? undefined,
    });
  }, [ags, writePick]);

  const setModel = useCallback((value: string) => {
    const [providerID, modelID] = value.split("/");
    const model = { providerID, modelID };
    if (!valid(model)) return;
    writePick({ model });
    push(model);
  }, [push, valid, writePick]);

  const setVariant = useCallback((value: string) => {
    writePick({
      variant: value === "default" ? null : value,
    });
  }, [writePick]);

  const togglePermission = useCallback(() => {
    save((item) => ({
      ...item,
      accept: !(item.accept ?? (cfg.permission === "allow")),
    }));
  }, [cfg.permission, save]);

  return {
    load,
    agents: list,
    models: rows,
    state,
    row,
    vars,
    accepting: cur.accept ?? (cfg.permission === "allow"),
    permissionsEnabled: hasPermissionPromptRules(cfg.permission),
    setAgent,
    setModel,
    setVariant,
    togglePermission,
  };
}
