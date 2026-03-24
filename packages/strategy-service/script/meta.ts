import { $ } from "bun"

export async function meta() {
  const commit = (await git("rev-parse", "--short", "HEAD")) || ""
  const version = env("STRATEGY_VERSION") || (await git("describe", "--tags", "--abbrev=0")) || build(commit)
  const channel = env("STRATEGY_CHANNEL") || "stable"
  const dirty = ((await git("status", "--short")) || "").trim() !== ""
  const built_at = new Date().toISOString()

  return {
    version,
    channel,
    commit,
    dirty,
    built_at,
  }
}

export function flags(row: Awaited<ReturnType<typeof meta>>) {
  return [
    `-X strategy-service/internal/meta.Version=${row.version}`,
    `-X strategy-service/internal/meta.Channel=${row.channel}`,
    `-X strategy-service/internal/meta.Commit=${row.commit}`,
    `-X strategy-service/internal/meta.BuiltAt=${row.built_at}`,
    `-X strategy-service/internal/meta.Dirty=${row.dirty}`,
  ].join(" ")
}

function env(key: string) {
  return process.env[key]?.trim() || ""
}

async function git(...args: string[]) {
  try {
    return (await $`git ${args}`.quiet().text()).trim()
  } catch {
    return ""
  }
}

function build(commit: string) {
  if (!commit) {
    return "0.0.0"
  }

  return `0.0.0+${commit}`
}
