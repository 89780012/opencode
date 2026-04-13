"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CornerDownLeftIcon, Loader2Icon, SquareIcon, XIcon } from "lucide-react"
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

type PromptInputContextValue = {
  value: string
  onValueChange: (value: string) => void
}

const PromptInputContext = createContext<PromptInputContextValue | null>(null)

const usePromptInputContext = () => {
  const ctx = useContext(PromptInputContext)
  if (!ctx) {
    throw new Error("PromptInput components must be used inside PromptInput")
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
    <PromptInputContext.Provider value={{ value, onValueChange }}>
      <form
        className={cn(
          "w-full rounded-[28px] bg-background/92 shadow-sm ring-1 ring-black/8 backdrop-blur-sm dark:bg-[#111515]/96 dark:ring-white/10",
          className,
        )}
        onSubmit={submit}
        {...props}
      >
        {children}
      </form>
    </PromptInputContext.Provider>
  )
}

export type PromptInputBodyProps = ComponentProps<"div">

export const PromptInputBody = ({ className, ...props }: PromptInputBodyProps) => (
  <div className={cn("px-3 pt-3", className)} {...props} />
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
        "txt w-full resize-none border-none bg-transparent px-1 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground",
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
  <div className={cn("flex items-center justify-between px-3 pb-3 pt-2", className)} {...props} />
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
  let icon = <CornerDownLeftIcon className="size-4" />

  if (status === "submitted") {
    icon = <Loader2Icon className="size-4 animate-spin" />
  } else if (status === "streaming") {
    icon = <SquareIcon className="size-4" />
  } else if (status === "error") {
    icon = <XIcon className="size-4" />
  }

  return (
    <Button aria-label="提交" className={cn(className)} size={size} type="submit" variant={variant} {...props}>
      {icon}
    </Button>
  )
}

export type PromptInputProviderProps = PropsWithChildren

export const PromptInputProvider = ({ children }: PromptInputProviderProps) => <>{children}</>
