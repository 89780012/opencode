import { useEffect, type ReactNode } from "react"
import { socket } from "@/lib/socket-bus"

export function SocketBoot(props: { children: ReactNode }) {
  useEffect(() => {
    socket.connect()
    return () => socket.disconnect()
  }, [])

  return props.children
}
