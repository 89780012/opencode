"use client"

import { ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type Props = {
  open: boolean
  auth?: {
    name: string
    url: string
    code: string
  }
  busy: boolean
  onCode: (code: string) => void
  onClose: () => void
  onSubmit: () => void
}

/**
 * MCP 手动授权弹窗，用于输入 OAuth 授权码。
 */
export function McpAuthDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>手动 OAuth</DialogTitle>
          <DialogDescription>打开授权地址并完成流程，然后将返回的授权码粘贴到这里。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">授权地址</div>
            <div className="bg-muted rounded-xl border px-3 py-3 text-xs break-all">{props.auth?.url || "-"}</div>
            {props.auth?.url ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(props.auth?.url, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="size-4" />
                打开链接
              </Button>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">授权码</div>
            <Input
              value={props.auth?.code ?? ""}
              onChange={(event) => props.onCode(event.target.value)}
              placeholder="粘贴授权码"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onClose} disabled={props.busy}>
            取消
          </Button>
          <Button type="button" onClick={props.onSubmit} disabled={!props.auth?.code.trim() || props.busy}>
            {props.busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                提交中...
              </>
            ) : (
              "提交授权码"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
