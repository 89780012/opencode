export type Source = "env" | "config" | "custom" | "api";

export interface Model {
  id: string;
  name: string;
  family?: string;
  release_date: string;
  attachment: boolean;
  reasoning: boolean;
  temperature: boolean;
  tool_call: boolean;
  status?: "alpha" | "beta" | "deprecated";
  cost?: {
    input: number;
    output: number;
  };
  limit: {
    context: number;
    input?: number;
    output: number;
  };
  variants?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

export interface Provider {
  id: string;
  name: string;
  env: string[];
  api?: string;
  npm?: string;
  source?: Source;
  models: Record<string, Model>;
  [key: string]: unknown;
}

export interface List {
  all: Provider[];
  connected: string[];
  default: Record<string, string>;
}

export interface Method {
  type: "oauth" | "api";
  label: string;
}

export type AuthMap = Record<string, Method[]>;

export interface Grant {
  url: string;
  method: "auto" | "code";
  instructions: string;
}

export type Auth =
  | {
      type: "api";
      key: string;
    }
  | {
      type: "oauth";
      refresh: string;
      access: string;
      expires: number;
      accountId?: string;
      enterpriseUrl?: string;
    }
  | {
      type: "wellknown";
      key: string;
      token: string;
    };

export interface ModelCfg {
  name?: string;
  [key: string]: unknown;
}

export interface ProviderCfg {
  npm?: string;
  name?: string;
  env?: string[];
  options?: {
    baseURL?: string;
    headers?: Record<string, string>;
    [key: string]: unknown;
  };
  models?: Record<string, ModelCfg>;
  [key: string]: unknown;
}

export interface Config {
  disabled_providers?: string[];
  enabled_providers?: string[];
  provider?: Record<string, ProviderCfg>;
  [key: string]: unknown;
}
