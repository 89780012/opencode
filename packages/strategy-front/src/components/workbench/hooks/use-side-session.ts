import { useEffect, useState } from "react"
import { sleep } from "../lib"

export function useSideSession(props: { onCreate: (data: { title: string; reqs: string[] }) => void | Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState("新建策略会话")
  const [reqs, setReqs] = useState<string[]>(["请描述你的策略需求"])

  useEffect(() => {
    if (!open) return

    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setOpen(false)
    }

    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [busy, open])

  const reset = () => {
    setOpen(false)
    setStep(1)
    setBusy(false)
    setTitle("新建策略会话")
    setReqs(["请描述你的策略需求"])
  }

  const submit = async () => {
    if (step === 1) {
      setBusy(true)
      await sleep(500)
      setBusy(false)
      setStep(2)
      return
    }

    if (step === 2) {
      setStep(3)
      return
    }

    await props.onCreate({ title, reqs })
    reset()
  }

  return {
    open,
    setOpen,
    step,
    setStep,
    busy,
    title,
    setTitle,
    reqs,
    setReqs,
    submit,
  }
}
