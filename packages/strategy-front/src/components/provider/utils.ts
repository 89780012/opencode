import type { Config, Provider } from "@/types/provider";

export const popular = [
  "opencode",
  "opencode-go",
  "anthropic",
  "github-copilot",
  "openai",
  "google",
  "openrouter",
  "vercel",
];

const notes = new Map<string, string>([
  ["opencode", "内置整理好的模型，开箱即可使用。"],
  ["opencode-go", "更轻量的一条订阅接入路径。"],
  ["anthropic", "可直接使用 Claude 系列模型。"],
  ["openai", "适合通用任务和快速迭代。"],
  ["google", "可接入 Gemini 系列模型。"],
  ["openrouter", "一个入口连接多家模型提供商。"],
  ["vercel", "支持在多种模型之间做统一路由。"],
]);

export function note(id: string) {
  if (id.startsWith("github-copilot")) {
    return "可通过 GitHub Copilot 使用编程模型。";
  }

  return notes.get(id);
}

export function text(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg) {
      return msg;
    }
  }

  if (err && typeof err === "object" && "msg" in err) {
    const msg = (err as { msg?: unknown }).msg;
    if (typeof msg === "string" && msg) {
      return msg;
    }
  }

  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: unknown }).data;
    const msg = text(data, "");
    if (msg) {
      return msg;
    }
  }

  if (err instanceof Error && err.message) {
    return err.message;
  }

  if (typeof err === "string" && err) {
    return err;
  }

  return fallback;
}

export function custom(id: string, cfg: Config) {
  const item = cfg.provider?.[id];
  if (!item) {
    return false;
  }

  if (item.npm !== "@ai-sdk/openai-compatible") {
    return false;
  }

  return !!item.models && Object.keys(item.models).length > 0;
}

export function source(item: Provider) {
  if (item.source === "env") {
    return "环境变量";
  }

  if (item.source === "api") {
    return "API 密钥";
  }

  if (item.source === "config") {
    return "配置";
  }

  if (item.source === "custom") {
    return "自定义";
  }

  return "其他";
}
