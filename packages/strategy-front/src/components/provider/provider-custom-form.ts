import type { ProviderCfg } from "@/types/provider";

const id = /^[a-z0-9][a-z0-9-_]*$/;

export type ModelErr = {
  id?: string;
  name?: string;
};

export type HeaderErr = {
  key?: string;
  value?: string;
};

export type ModelRow = {
  row: string;
  id: string;
  name: string;
  err: ModelErr;
};

export type HeaderRow = {
  row: string;
  key: string;
  value: string;
  err: HeaderErr;
};

export type Form = {
  providerID: string;
  name: string;
  baseURL: string;
  apiKey: string;
  models: ModelRow[];
  headers: HeaderRow[];
  err: {
    providerID?: string;
    name?: string;
    baseURL?: string;
  };
};

type Args = {
  form: Form;
  ids: Set<string>;
  disabled: string[];
};

let seq = 0;

const next = () => `row-${seq++}`;

export const modelRow = (): ModelRow => ({
  row: next(),
  id: "",
  name: "",
  err: {},
});

export const headerRow = (): HeaderRow => ({
  row: next(),
  key: "",
  value: "",
  err: {},
});

export function validate(args: Args) {
  const providerID = args.form.providerID.trim();
  const name = args.form.name.trim();
  const baseURL = args.form.baseURL.trim();
  const apiKey = args.form.apiKey.trim();
  const env = apiKey.match(/^\{env:([^}]+)\}$/)?.[1]?.trim();
  const key = apiKey && !env ? apiKey : undefined;

  const err = {
    providerID: !providerID
      ? "请输入 provider 标识"
      : !id.test(providerID)
        ? "只能使用小写字母、数字、- 或 _"
        : args.ids.has(providerID) && !args.disabled.includes(providerID)
          ? "provider 标识已存在"
          : undefined,
    name: !name ? "请输入显示名称" : undefined,
    baseURL: !baseURL
      ? "请输入服务地址"
      : !/^https?:\/\//.test(baseURL)
        ? "服务地址必须以 http:// 或 https:// 开头"
        : undefined,
  };

  const seenModel = new Set<string>();
  const models = args.form.models.map((item) => {
    const id = item.id.trim();
    const name = item.name.trim();
    const err: ModelErr = {};

    if (!id) err.id = "必填";
    if (id && seenModel.has(id)) err.id = "重复";
    if (id) seenModel.add(id);
    if (!name) err.name = "必填";

    return err;
  });

  const seenHeader = new Set<string>();
  const headers = args.form.headers.map((item) => {
    const key = item.key.trim();
    const value = item.value.trim();
    if (!key && !value) {
      return {};
    }

    const err: HeaderErr = {};
    if (!key) err.key = "必填";
    if (!value) err.value = "必填";
    if (key && seenHeader.has(key.toLowerCase())) err.key = "重复";
    if (key) seenHeader.add(key.toLowerCase());

    return err;
  });

  const ok =
    !err.providerID &&
    !err.name &&
    !err.baseURL &&
    models.every((item) => !item.id && !item.name) &&
    headers.every((item) => !item.key && !item.value);

  if (!ok) {
    return { err, models, headers };
  }

  const map = Object.fromEntries(
    args.form.headers
      .map((item) => [item.key.trim(), item.value.trim()] as const)
      .filter(([key, value]) => key && value),
  );

  const cfg: ProviderCfg = {
    npm: "@ai-sdk/openai-compatible",
    name,
    ...(env ? { env: [env] } : {}),
    options: {
      baseURL,
      ...(Object.keys(map).length > 0 ? { headers: map } : {}),
    },
    models: Object.fromEntries(
      args.form.models.map((item) => [item.id.trim(), { name: item.name.trim() }]),
    ),
  };

  return {
    err,
    models,
    headers,
    result: {
      providerID,
      name,
      key,
      cfg,
    },
  };
}
