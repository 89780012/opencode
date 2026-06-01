import { useEffect, useEffectEvent } from "react"
import { socket, type SocketEvent } from "@/lib/socket-bus"

type Fn = (event: SocketEvent) => void

export function useSocketEvent(type: string, fn: Fn) {
  const on = useEffectEvent(fn)

  useEffect(() => {
    return socket.on(type, (event) => on(event))
  }, [type])
}
