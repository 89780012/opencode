import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PermissionRequest } from "@/types/chat";

interface Props {
  req: PermissionRequest;
  sending?: boolean;
  onReject: () => void;
  onAllow: (value: "once" | "always") => void;
}

export function PermissionPanel(props: Props) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <ShieldAlert className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-amber-950">需要权限</div>
          <div className="mt-1 text-sm text-amber-900">
            工具 <span className="font-medium">{props.req.permission}</span>
            {props.req.patterns.length > 0 ? " 正在申请访问以下范围：" : " 正在申请执行。"}
          </div>
          {props.req.patterns.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {props.req.patterns.map((item) => (
                <code
                  key={item}
                  className="rounded-md border border-amber-200 bg-white/80 px-2 py-1 text-xs text-amber-900"
                >
                  {item}
                </code>
              ))}
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={props.onReject}
              disabled={props.sending}
            >
              拒绝
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => props.onAllow("always")}
              disabled={props.sending}
            >
              始终允许
            </Button>
            <Button
              type="button"
              onClick={() => props.onAllow("once")}
              disabled={props.sending}
            >
              仅本次允许
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
