import { describe, expect, test } from "bun:test"
import { noteReviewer } from "../src/note"

describe("reviewer note", () => {
  test("keeps automatic review inside the active workspace", () => {
    const note = noteReviewer(["实现入场和退出逻辑"])

    expect(note).toContain("只检查当前工作区")
    expect(note).toContain("不要扫描工作区外的配置目录、技能目录或其它项目")
  })
})
