import { useEffect, useEffectEvent, useSyncExternalStore } from "react"
import { socket, type SocketEvent } from "@/lib/socket-bus"

type Fn = (event: SocketEvent) => void

export function useSocketEvent(type: string, fn: Fn) {
  const on = useEffectEvent(fn)

  useEffect(() => {
    return socket.on(type, (event) => on(event))
  }, [type])
}

export function useSocketStatus() {
  return useSyncExternalStore(socket.subscribe, socket.status, socket.status)
}
