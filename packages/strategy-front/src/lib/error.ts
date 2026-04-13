/**
 * 提取适合展示给用户的错误文案。
 */
export function note(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = err.message
    if (typeof msg === "string" && msg) {
      return msg
    }
  }

  if (err && typeof err === "object" && "msg" in err) {
    const msg = err.msg
    if (typeof msg === "string" && msg) {
      return msg
    }
  }

  if (err && typeof err === "object" && "error" in err) {
    const msg = err.error
    if (typeof msg === "string" && msg) {
      return msg
    }
  }

  if (err && typeof err === "object" && "data" in err) {
    const msg = note((err as { data?: unknown }).data, "")
    if (msg) {
      return msg
    }
  }

  if (typeof err === "string" && err) {
    return err
  }

  if (err instanceof Error && err.message) {
    return err.message
  }

  return fallback
}

/**
 * 统一输出中文错误日志，方便排查前端问题。
 */
export function log(text: string, err: unknown) {
  console.error(text, err)
}
