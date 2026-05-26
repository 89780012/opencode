import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { chatApi, workspaceApi } from "@/api/modules"
import { useWorkspaceList } from "@/data/global-data-provider"
import { log, note } from "@/lib/error"
import { cards, picks, prompt, seed, tail, type Card } from "@/lib/strategy-create"
import { encodeStrategyPath } from "@/lib/strategy-path"
import type { Guide, StrategyType } from "@/lib/strategy-guide"

type Props = {
  onDone?: () => void
  onOpenChange: (open: boolean) => void
}

/**
 * 管理新建策略弹窗的全部状态与提交流程。
 */
export function useWorkspaceCreate(props: Props) {
  const nav = useNavigate()
  const { refresh, select } = useWorkspaceList()
  const [state, setState] = useState(seed)
  const card = cards[state.kind]
  const rich = state.kind !== "other"
  const full = state.name.trim() ? `${state.name.trim()}-${state.tail.trim()}` : ""

  /**
   * 重置弹窗内的临时状态。
   */
  function reset() {
    setState(seed())
  }

  /**
   * 关闭弹窗，并顺手恢复默认状态。
   */
  function close() {
    props.onOpenChange(false)
    reset()
  }

  /**
   * 更新当前策略类型。
   */
  function setKind(kind: StrategyType) {
    setState((prev) => ({ ...prev, kind }))
  }

  /**
   * 更新当前配置页签。
   */
  function setPanel(panel: (typeof picks.panels)[number]) {
    setState((prev) => ({ ...prev, panel }))
  }

  /**
   * 更新策略名称。
   */
  function setName(name: string) {
    setState((prev) => ({ ...prev, name }))
  }

  /**
   * 更新目录后缀。
   */
  function setTail(next: string) {
    setState((prev) => ({ ...prev, tail: next }))
  }

  /**
   * 刷新一个新的随机后缀。
   */
  function refreshTail() {
    setState((prev) => ({ ...prev, tail: tail() }))
  }

  /**
   * 更新策略引导配置。
   */
  function setGuide(next: Guide | ((prev: Guide) => Guide)) {
    setState((prev) => ({
      ...prev,
      guide: typeof next === "function" ? next(prev.guide) : next,
    }))
  }

  /**
   * 更新补充说明。
   */
  function setBrief(brief: string) {
    setState((prev) => ({ ...prev, brief }))
  }

  /**
   * 更新首条引导消息草稿。
   */
  function setPrompt(prompt: string) {
    setState((prev) => ({ ...prev, prompt }))
  }

  /**
   * 计算当前表单对应的引导消息。
   */
  function build() {
    return prompt({
      kind: state.kind,
      name: full,
      guide: state.guide,
      brief: state.brief,
    })
  }

  /**
   * 进入下一步，并在确认前生成默认引导消息。
   */
  function next() {
    if (!state.name.trim()) {
      toast.error("请输入策略名称")
      return
    }

    if (state.step === 1) {
      setState((prev) => ({ ...prev, prompt: build(), step: Math.min(prev.step + 1, picks.steps.length - 1) }))
      return
    }

    setState((prev) => ({ ...prev, step: Math.min(prev.step + 1, picks.steps.length - 1) }))
  }

  /**
   * 返回上一步，或在第一步时关闭弹窗。
   */
  function prev() {
    if (state.step === 0) {
      close()
      return
    }

    setState((prev) => ({ ...prev, step: prev.step - 1 }))
  }

  /**
   * 创建工作区并自动发起首条会话消息。
   */
  async function create() {
    if (!full) {
      toast.error("请输入策略名称")
      return
    }

    setState((prev) => ({ ...prev, busy: true }))

    try {
      const data = await workspaceApi.createWorkspace(full, state.kind, card.template)
      await refresh()
      select(data.workspace)
      const session = await chatApi.createSession(data.workspace.path)
      await chatApi.sendPrompt(data.workspace.path, session.id, {
        parts: [{ type: "text", text: state.prompt || build() }],
      })
      props.onDone?.()
      props.onOpenChange(false)
      reset()
      toast.success(`策略已创建并发起引导：${data.workspace.name}`)
      nav(`/app/strategies/${encodeStrategyPath(data.workspace.path)}`)
    } catch (err) {
      log("创建策略工作区失败", err)
      toast.error(note(err, "创建策略失败"))
    } finally {
      setState((prev) => ({ ...prev, busy: false }))
    }
  }

  return {
    busy: state.busy,
    card,
    create,
    full,
    next,
    panel: state.panel,
    prev,
    reset,
    rich,
    setBrief,
    setGuide,
    setKind,
    setName,
    setPanel,
    setPrompt,
    setTail,
    state,
    steps: picks.steps,
    refreshTail,
  } satisfies {
    busy: boolean
    card: Card
    create: () => Promise<void>
    full: string
    next: () => void
    panel: (typeof picks.panels)[number]
    prev: () => void
    reset: () => void
    rich: boolean
    setBrief: (brief: string) => void
    setGuide: (next: Guide | ((prev: Guide) => Guide)) => void
    setKind: (kind: StrategyType) => void
    setName: (name: string) => void
    setPanel: (panel: (typeof picks.panels)[number]) => void
    setPrompt: (prompt: string) => void
    setTail: (next: string) => void
    state: ReturnType<typeof seed>
    steps: typeof picks.steps
    refreshTail: () => void
  }
}
