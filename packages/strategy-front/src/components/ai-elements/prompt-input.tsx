"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CornerDownLeftIcon, Loader2Icon, SquareIcon, XIcon } from "lucide-react"
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

export type PromptInputMessage = {
  text: string
  files: []
}

type PromptInputContextValue = {
  value: string
  onValueChange: (value: string) => void
}

const PromptInputContext = createContext<PromptInputContextValue | null>(null)

const usePromptInputContext = () => {
  const context = useContext(PromptInputContext)
  if (!context) {
    throw new Error("PromptInput components must be used inside PromptInput")
  }
  return context
}

export type PromptInputProps = Omit<ComponentProps<"form">, "onSubmit"> & {
  value: string
  onValueChange: (value: string) => void
  onSubmit: (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => void
}

export const PromptInput = ({ className, children, value, onValueChange, onSubmit, ...props }: PromptInputProps) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit(
      {
        text: value,
        files: [],
      },
      event,
    )
  }

  return (
    <PromptInputContext.Provider value={{ value, onValueChange }}>
      <form
        className={cn("w-full rounded-2xl border border-[#E5E5E5] bg-background", className)}
        onSubmit={handleSubmit}
        {...props}
      >
        {children}
      </form>
    </PromptInputContext.Provider>
  )
}

export type PromptInputBodyProps = ComponentProps<"div">

export const PromptInputBody = ({ className, ...props }: PromptInputBodyProps) => (
  <div className={cn("p-1", className)} {...props} />
)

export type PromptInputTextareaProps = Omit<ComponentProps<"textarea">, "value" | "onChange"> & {
  maxHeight?: number
  minHeight?: number
}

export const PromptInputTextarea = ({
  className,
  maxHeight = 65,
  minHeight = 65,
  placeholder = "Type your message...",
  onKeyDown,
  ...props
}: PromptInputTextareaProps) => {
  const { value, onValueChange } = usePromptInputContext()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isComposing, setIsComposing] = useState(false)

  useEffect(() => {
    if (!textareaRef.current) {
      return
    }
    textareaRef.current.style.height = "auto"
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
  }, [value])

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onValueChange(event.target.value)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) {
      return
    }

    if (event.key === "Enter") {
      if (isComposing || event.nativeEvent.isComposing) {
        return
      }
      if (event.shiftKey) {
        return
      }

      const form = event.currentTarget.form
      if (!form) {
        return
      }

      const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement | null

      if (submitButton?.disabled) {
        return
      }

      event.preventDefault()
      form.requestSubmit()
    }
  }

  return (
    <textarea
      ref={textareaRef}
      className={cn(
        "txt w-full resize-none border-none px-2 pt-1 text-gray-700 outline-none placeholder:text-gray-400",
        className,
      )}
      name="message"
      onChange={handleChange}
      onCompositionEnd={() => setIsComposing(false)}
      onCompositionStart={() => setIsComposing(true)}
      onKeyDown={handleKeyDown}
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
  <div className={cn("flex items-center justify-between p-2", className)} {...props} />
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
    <Button aria-label="Submit" className={cn(className)} size={size} type="submit" variant={variant} {...props}>
      {icon}
    </Button>
  )
}

export type PromptInputProviderProps = PropsWithChildren

export const PromptInputProvider = ({ children }: PromptInputProviderProps) => <>{children}</>
