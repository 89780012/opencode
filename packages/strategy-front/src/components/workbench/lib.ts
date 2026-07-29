import { createElement } from "react"
import { CircleAlert, CircleCheck, CircleDot, LoaderCircle, type LucideProps } from "lucide-react"
import type { ReviewStatus, StepStatus, TimelineEvent } from "./data"

export function sleep(ms: number) {
  return new Promise((ok) => setTimeout(ok, ms))
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function text(status: ReviewStatus) {
  if (status === "running") return "进行中"
  if (status === "passed") return "已通过"
  if (status === "failed") return "未通过"
  return "未开始"
}

export function stepText(status: StepStatus) {
  if (status === "running") return "进行中"
  if (status === "done") return "完成"
  if (status === "warning") return "建议"
  if (status === "error") return "异常"
  return "等待中"
}

export function tone(status: StepStatus) {
  if (status === "running") return "run"
  if (status === "done") return "done"
  if (status === "warning") return "warn"
  if (status === "error") return "warn"
  return "idle"
}

export function lead(status: ReviewStatus) {
  if (status === "passed") return "通过"
  if (status === "failed") return "待修"
  if (status === "running") return "审查中"
  return "未开始"
}

export function status(status: ReviewStatus) {
  if (status === "passed") return "通过"
  if (status === "failed") return "待修"
  return "处理中"
}

export function badge(status: StepStatus, props: LucideProps) {
  if (status === "done") return createElement(CircleCheck, props)
  if (status === "warning" || status === "error") return createElement(CircleAlert, props)
  if (status === "running") return createElement(LoaderCircle, props)
  return createElement(CircleDot, props)
}

export function kind(type: TimelineEvent["type"]) {
  if (type === "requirement") return "需求"
  if (type === "code") return "编码"
  if (type === "git") return "Git"
  if (type === "review") return "审查"
  if (type === "debug") return "调试"
  if (type === "flowchart") return "流程图"
  if (type === "workflow") return "流程"
  return "回测"
}
