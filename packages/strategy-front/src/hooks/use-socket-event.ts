import { useEffect, useRef } from "react"
import { socket, type SocketEvent } from "@/lib/socket-bus"

type Fn = (event: SocketEvent) => void

export function useSocketEvent(type: string, fn: Fn) {
  const ref = useRef(fn)

  useEffect(() => {
    ref.current = fn
  }, [fn])

  useEffect(() => {
    return socket.on(type, (event) => ref.current(event))
  }, [type])
}
