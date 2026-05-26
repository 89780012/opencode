import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { summaryApi } from "@/api/modules/summary"
import { log } from "@/lib/error"
import { selectSessionAbort, selectSessionIssue, useAppSelector } from "@/store"
import type { ChatMessageInfo } from "@/types/chat"
import type { SessionSummary } from "@/types/summary"

type Input = {
  workspacePath?: string | null
  sessionId?: string | null
  messages: ChatMessageInfo[]
  busy: boolean
}

const empty = (workspacePath = "", sessionId = ""): SessionSummary => ({
  workspacePath,
  sessionId,
  state: "empty",
  updatedAt: 0,
})

export function useSessionSummary(input: Input) {
  const [item, setItem] = useState<SessionSummary>(() => empty(input.workspacePath ?? "", input.sessionId ?? ""))
  const [load, setLoad] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const isAbort = useAppSelector((state) => selectSessionAbort(state, input.sessionId))
  const issue = useAppSelector((state) => selectSessionIssue(state, input.sessionId))

  const prev = useRef(input.busy)
  const summaryStatus = useAppSelector((state) =>
    item.summarySessionId ? state.chatSession.status[item.summarySessionId] : undefined,
  )
  const refresh = useCallback(async () => {
    if (!input.workspacePath || !input.sessionId) {
      setItem(empty(input.workspacePath ?? "", input.sessionId ?? ""))
      return
    }
    setLoad(true)
    setErr(null)
    try {
      setItem(await summaryApi.get(input.workspacePath, input.sessionId))
    } catch (e) {
      log("加载会话总结失败", e)
      setErr(e instanceof Error ? e.message : "加载总结失败")
    } finally {
      setLoad(false)
    }
  }, [input.sessionId, input.workspacePath])

  const run = useCallback(async () => {
    if (!input.workspacePath || !input.sessionId) return
    console.log("isAbort", isAbort, "issue", issue)
    if (isAbort || issue) {
      console.log("use-session-summary: isAbort")
      return
    }
    // 收到的消息列表中
    //data: {"type":"message.updated","properties":{"sessionID":"ses_1a3195f99ffeC9wpxwXddpKFdV","info":{"id":"msg_e5daa00ab001ZCc1VTPrRf8Er8","sessionID":"ses_1a3195f99ffeC9wpxwXddpKFdV","role":"assistant","time":{"created":1779687882923,"completed":1779687935203},"parentID":"msg_e5daa00640013FErAwbwA2SQ1r","modelID":"aifeifei798/DarkIdol-Llama-3.1-8B-Instruct-1.2-Uncensored","providerID":"linuxdo","mode":"smartx-helper","agent":"smartx-helper","path":{"cwd":"C:\\Users\\Admin\\.xtp-smart\\plugins\\grid-iy11ai","root":"C:\\Users\\Admin\\.xtp-smart\\plugins\\grid-iy11ai"},"cost":0,"tokens":{"input":0,"output":0,"reasoning":0,"cache":{"read":0,"write":0}},"error":{"name":"MessageAbortedError","data":{"message":"Aborted"}}}}}
    //data: {"type":"session.status","properties":{"sessionID":"ses_1a3195f99ffeC9wpxwXddpKFdV","status":{"type":"idle"}}}
    // 直接错误消息也要返回
    //data: {"type":"session.error","properties":{"sessionID":"ses_1a3195f99ffeC9wpxwXddpKFdV","error":{"name":"APIError","data":{"message":"model not found: aifeifei798/DarkIdol-Llama-3.1-8B-Instruct-1.2-Uncensored (no channel candidates remain; applied filters: api_key.binding_mode=manual, api_key.channelIDs, api_format=openai/chat_completions, stream=true, client_ip_blacklist; candidate trace: api_format 0->0 (request_api_format=openai/chat_completions), stream_policy 0->0 (no upstream candidates), ip_blacklist 0->0 (no upstream candidates))","statusCode":422,"isRetryable":false,"responseHeaders":{"ah-request-id":"ar-e3160828-8a0a-48dd-81a2-f43ea8d540fc","alt-svc":"h3=\":443\"; ma=86400","cf-cache-status":"DYNAMIC","cf-ray":"a012786df9e0b78b-HKG","connection":"keep-alive","content-length":"477","content-type":"application/json; charset=utf-8","date":"Mon, 25 May 2026 06:26:47 GMT","nel":"{\"report_to\":\"cf-nel\",\"success_fraction\":0.0,\"max_age\":604800}","report-to":"{\"group\":\"cf-nel\",\"max_age\":604800,\"endpoints\":[{\"url\":\"https://a.nel.cloudflare.com/report/v4?s=bv3ij5Ua7bUpRpWJE393tXM1ZAdUhxiRyDjUgI5MWoxV3%2Bpsmd864QuZloFjpmRPtXtZ602mMgsfpPxY1v3E7Niaw2O42sqOT44cP4CzlMWaQB7B%2FHwcO86ecpT70dLXIlI%3D\"}]}","server":"cloudflare","strict-transport-security":"max-age=15552000; includeSubDomains; preload","x-content-type-options":"nosniff","set-cookie":"server_name_session=6724747f20c59da0e0374c434c64a713; Max-Age=86400; httponly; path=/"},"responseBody":"{\"error\":{\"message\":\"model not found: aifeifei798/DarkIdol-Llama-3.1-8B-Instruct-1.2-Uncensored (no channel candidates remain; applied filters: api_key.binding_mode=manual, api_key.channelIDs, api_format=openai/chat_completions, stream=true, client_ip_blacklist; candidate trace: api_format 0-\\u003e0 (request_api_format=openai/chat_completions), stream_policy 0-\\u003e0 (no upstream candidates), ip_blacklist 0-\\u003e0 (no upstream candidates))\",\"type\":\"invalid_model_error\"}}","metadata":{"url":"https://hub.oaifree.com/v1/chat/completions"}}}}}

    setLoad(true)
    setErr(null)
    try {
      setItem(
        await summaryApi.run({
          workspacePath: input.workspacePath,
          sessionId: input.sessionId,
        }),
      )
    } catch (e) {
      log("生成会话总结失败", e)
      setErr(e instanceof Error ? e.message : "生成总结失败")
    } finally {
      setLoad(false)
    }
  }, [input.sessionId, input.workspacePath, isAbort])

  const stop = useCallback(async () => {
    if (!input.workspacePath || !input.sessionId) return
    setLoad(true)
    setErr(null)
    try {
      setItem(await summaryApi.stop(input.workspacePath, input.sessionId))
    } catch (e) {
      log("打断会话总结失败", e)
      setErr(e instanceof Error ? e.message : "打断总结失败")
    } finally {
      setLoad(false)
    }
  }, [input.sessionId, input.workspacePath])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const done = prev.current && !input.busy
    prev.current = input.busy
    if (!done || !item.sessionId) return
    void run()
  }, [input.busy, item.sessionId, run])

  // 监听摘要状态
  useEffect(() => {
    console.log("summaryStatus start", summaryStatus)
    if (!item.summarySessionId || summaryStatus?.type !== "idle") return
    console.log("summaryStatus start call refresh")
    void refresh()
  }, [item.summarySessionId, refresh, summaryStatus?.type])

  return useMemo(
    () => ({
      item,
      load,
      err,
      ready: !input.busy && summaryStatus?.type === "idle", // 没有摘要总结信息
      refresh,
      run,
      stop,
    }),
    [err, input.busy, item, load, refresh, run, stop],
  )
}
