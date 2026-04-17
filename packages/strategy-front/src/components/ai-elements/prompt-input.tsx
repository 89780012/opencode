"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowUpIcon, Loader2Icon, SquareIcon, XIcon } from "lucide-react"
import type { PromptInputMessage } from "@/types/chat"
import {
  type ChangeEvent,
  type ComponentProps,
  createContext,
  type FormEvent,
  type KeyboardEvent,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

export type PromptInputStatus = "ready" | "submitted" | "streaming" | "error"

type State = {
  value: string
  onValueChange: (value: string) => void
}

const Ctx = createContext<State | null>(null)

const usePromptInputContext = () => {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error("PromptInput 相关组件必须在 PromptInput 内使用")
  }
  return ctx
}

export type PromptInputProps = Omit<ComponentProps<"form">, "onSubmit"> & {
  value: string
  onValueChange: (value: string) => void
  onSubmit: (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => void
}

export const PromptInput = ({ className, children, value, onValueChange, onSubmit, ...props }: PromptInputProps) => {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit({ text: value }, event)
  }

  return (
    <Ctx.Provider value={{ value, onValueChange }}>
      <form
        className={cn(
          "chat-prompt-shell w-full rounded-[25px] border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)] transition-[border-color,box-shadow] focus-within:border-primary/45 focus-within:shadow-[0_0_0_1px_rgb(var(--primary)/0.10),0_24px_44px_-30px_rgba(37,99,235,0.35)] dark:border-[#29302e] dark:bg-[#171b1a] dark:shadow-none",
          className,
        )}
        onSubmit={submit}
        {...props}
      >
        {children}
      </form>
    </Ctx.Provider>
  )
}

export type PromptInputBodyProps = ComponentProps<"div">

export const PromptInputBody = ({ className, ...props }: PromptInputBodyProps) => (
  <div className={cn("chat-prompt-body px-4 pt-2", className)} {...props} />
)

export type PromptInputTextareaProps = Omit<ComponentProps<"textarea">, "value" | "onChange"> & {
  maxHeight?: number
  minHeight?: number
}

export const PromptInputTextarea = ({
  className,
  maxHeight = 65,
  minHeight = 65,
  placeholder = "输入你的消息...",
  onKeyDown,
  ...props
}: PromptInputTextareaProps) => {
  const { value, onValueChange } = usePromptInputContext()
  const ref = useRef<HTMLTextAreaElement>(null)
  const [compose, setCompose] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = "auto"
    ref.current.style.height = `${ref.current.scrollHeight}px`
  }, [value])

  const change = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onValueChange(event.target.value)
  }

  const keydown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    if (event.key !== "Enter") return
    if (compose || event.nativeEvent.isComposing) return
    if (event.shiftKey) return

    const form = event.currentTarget.form
    if (!form) return

    const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null
    if (btn?.disabled) return

    event.preventDefault()
    form.requestSubmit()
  }

  return (
    <textarea
      ref={ref}
      className={cn(
        "chat-prompt-textarea txt block w-full resize-none border-none bg-transparent px-1 py-1 text-sm leading-[1.6] text-slate-800 outline-none placeholder:text-slate-400 dark:text-[#f1f5f3] dark:placeholder:text-[#7f8b86]",
        className,
      )}
      name="message"
      onChange={change}
      onCompositionEnd={() => setCompose(false)}
      onCompositionStart={() => setCompose(true)}
      onKeyDown={keydown}
      placeholder={placeholder}
      rows={1}
      style={{
        maxHeight: `${maxHeight}px`,
        minHeight: `${minHeight}px`,
        overflowY: "auto",
      }}
      value={value}
      {...props}
    />
  )
}

export type PromptInputFooterProps = ComponentProps<"div">

export const PromptInputFooter = ({ className, ...props }: PromptInputFooterProps) => (
  <div className={cn("chat-prompt-footer flex items-center justify-between px-2.5 pb-2 pt-1", className)} {...props} />
)

export type PromptInputToolsProps = ComponentProps<"div">

export const PromptInputTools = ({ className, ...props }: PromptInputToolsProps) => (
  <div className={cn("flex items-center gap-2", className)} {...props} />
)

export type PromptInputButtonProps = ComponentProps<typeof Button>

export const PromptInputButton = ({
  className,
  type = "button",
  variant = "ghost",
  size = "sm",
  ...props
}: PromptInputButtonProps) => <Button className={cn(className)} size={size} type={type} variant={variant} {...props} />

export type PromptInputSubmitProps = Omit<ComponentProps<typeof Button>, "children"> & {
  status?: PromptInputStatus
}

export const PromptInputSubmit = ({
  className,
  status = "ready",
  size = "icon-sm",
  variant = "default",
  ...props
}: PromptInputSubmitProps) => {
  let icon = <ArrowUpIcon className="size-3.5" />

  if (status === "submitted") {
    icon = <Loader2Icon className="size-3.5 animate-spin" />
  }
  if (status === "streaming") {
    icon = <SquareIcon className="size-3.5" />
  }
  if (status === "error") {
    icon = <XIcon className="size-3.5" />
  }

  return (
    <Button aria-label="提交" className={cn(className)} size={size} type="submit" variant={variant} {...props}>
      {icon}
    </Button>
  )
}

export type PromptInputProviderProps = PropsWithChildren

export const PromptInputProvider = ({ children }: PromptInputProviderProps) => <>{children}</>
