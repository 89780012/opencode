import { describe, expect, test } from "bun:test"
import { noteReview, noteReviewer } from "../src/note"

describe("reviewer note", () => {
  test("keeps automatic review inside the active workspace", () => {
    const note = noteReviewer(["实现入场和退出逻辑"])

    expect(note).toContain("只检查当前工作区")
    expect(note).toContain("不要扫描工作区外的配置目录、技能目录或其它项目")
  })

  test("requires every check to pass before the review passes", () => {
    const note = noteReview({ workspace: "f:/repo", worktree: "f:/repo", sessionID: "session-1" })

    expect(note).toContain("只有所有检查项均为 `passed` 才视为通过")
    expect(note).toContain("任一 `warning`、`failed` 或 `error` 都按未通过处理")
  })
})
