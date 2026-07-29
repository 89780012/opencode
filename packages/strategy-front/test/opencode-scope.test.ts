import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { permissionApi } from "../src/api/modules/permission"
import { questionApi } from "../src/api/modules/question"
import { opencode } from "../src/api/opencode"

afterEach(() => mock.restore())

describe("OpenCode workspace scope", () => {
  test("scopes permission list and reply to the active workspace", async () => {
    const get = spyOn(opencode, "get").mockResolvedValue([])
    const post = spyOn(opencode, "post").mockResolvedValue(true)

    await permissionApi.list("D:/workspace/alpha")
    await permissionApi.respond("D:/workspace/alpha", "per/a b", { reply: "once" })

    expect(get).toHaveBeenCalledWith("/permission", {
      params: { directory: "D:/workspace/alpha" },
    })
    expect(post).toHaveBeenCalledWith(
      "/permission/per%2Fa%20b/reply",
      { reply: "once" },
      { params: { directory: "D:/workspace/alpha" } },
    )
  })

  test("scopes question list, reply, and reject to the active workspace", async () => {
    const get = spyOn(opencode, "get").mockResolvedValue([])
    const post = spyOn(opencode, "post").mockResolvedValue(true)

    await questionApi.list("D:/workspace/beta")
    await questionApi.reply("D:/workspace/beta", "que/1", [["A"]])
    await questionApi.reject("D:/workspace/beta", "que/1")

    expect(get).toHaveBeenCalledWith("/question", {
      params: { directory: "D:/workspace/beta" },
    })
    expect(post).toHaveBeenNthCalledWith(
      1,
      "/question/que%2F1/reply",
      { answers: [["A"]] },
      { params: { directory: "D:/workspace/beta" } },
    )
    expect(post).toHaveBeenNthCalledWith(
      2,
      "/question/que%2F1/reject",
      undefined,
      { params: { directory: "D:/workspace/beta" } },
    )
  })
})
