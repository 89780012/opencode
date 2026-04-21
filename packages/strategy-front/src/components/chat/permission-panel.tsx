import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PermissionRequest } from "@/types/chat"

interface Props {
  req: PermissionRequest
  sending?: boolean
  onReject: () => void
  onAllow: (value: "once" | "always") => void
}

export function PermissionPanel(props: Props) {
  return (
    <div className="chat-perm rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="chat-perm-mark flex size-9 shrink-0 items-center justify-center rounded-xl">
          <ShieldAlert className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="chat-perm-title text-sm font-medium">需要权限</div>
          <div className="chat-perm-desc mt-1 text-sm">
            工具 <span className="font-medium">{props.req.permission}</span>
            {props.req.patterns.length > 0 ? " 正在申请访问以下范围:" : " 正在申请执行权限。"}
          </div>
          {props.req.patterns.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {props.req.patterns.map((item) => (
                <code key={item} className="chat-perm-path rounded-md px-2 py-1 text-xs">
                  {item}
                </code>
              ))}
            </div>
          ) : null}
          <div className="chat-perm-actions mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="chat-perm-btn"
              onClick={props.onReject}
              disabled={props.sending}
            >
              拒绝
            </Button>
            <Button
              type="button"
              variant="outline"
              className="chat-perm-btn"
              onClick={() => props.onAllow("always")}
              disabled={props.sending}
            >
              始终允许
            </Button>
            <Button
              type="button"
              className="chat-perm-btn chat-perm-btn-primary"
              onClick={() => props.onAllow("once")}
              disabled={props.sending}
            >
              仅本次允许
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
