import { useEffect, type ReactNode } from "react"
import { socket, type SocketEvent } from "@/lib/socket-bus"
import { useAppDispatch } from "@/store"

export function SocketBoot(props: { children: ReactNode }) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    socket.connect()
    return () => socket.disconnect()
  }, [])

  useEffect(() => {
    return socket.on("*", (event: SocketEvent) => {
      if (event.type === "session.created") {
        // dispatch(
        //   upsertWorkspaceSession({
        //     workspace: event.payload?.workspacePath || "",
        //   }),
        // )
        //正式分发消息
        return
      }

      if (event.type === "session.create.error") {
        //错误消息
        return
      }
    })
  }, [dispatch])

  return props.children
}
