"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { providerApi } from "@/api/modules/provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Grant, Method, Provider } from "@/types/provider";
import { text } from "./utils";

type Props = {
  open: boolean;
  item?: Provider;
  list?: Method[];
  onOpenChange: (open: boolean) => void;
  onDone: () => Promise<void>;
};

function label(method: Method) {
  if (method.type === "api") return "API 密钥";
  if (method.label === "API Key") return "API 密钥";
  if (method.label === "OAuth") return "OAuth 授权";
  return method.label;
}

export function ProviderConnectDialog(props: Props) {
  const list = useMemo(
    () =>
      props.list?.length
        ? props.list
        : [{ type: "api" as const, label: "API 密钥" }],
    [props.list],
  );
  const [idx, setIdx] = useState<number>();
  const [grant, setGrant] = useState<Grant>();
  const [key, setKey] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const item = props.item;
  const method = idx === undefined ? undefined : list[idx];

  useEffect(() => {
    if (!props.open) return;
    setIdx(undefined);
    setGrant(undefined);
    setKey("");
    setCode("");
    setErr("");
    setBusy(false);
  }, [props.open, item?.id]);

  useEffect(() => {
    if (!props.open || !item || list.length !== 1) return;
    void pick(0);
  }, [props.open, item, list.length]);

  useEffect(() => {
    if (!props.open || !item || idx === undefined || grant?.method !== "auto") return;

    let live = true;
    void (async () => {
      setBusy(true);
      setErr("");
      try {
        if (grant.url) {
          window.open(grant.url, "_blank", "noopener,noreferrer");
        }
        await providerApi.callback(item.id, { method: idx });
        await providerApi.dispose();
        await props.onDone();
        if (!live) return;
        toast.success(`${item.name} 已连接`);
        props.onOpenChange(false);
      } catch (error) {
        if (!live) return;
        setErr(text(error, "OAuth 授权失败"));
      } finally {
        if (live) setBusy(false);
      }
    })();

    return () => {
      live = false;
    };
  }, [grant, idx, item, props]);

  async function pick(next: number) {
    const item = props.item;
    if (!item) return;

    setIdx(next);
    setErr("");
    setGrant(undefined);
    setCode("");

    if (list[next]?.type !== "oauth") return;

    setBusy(true);
    try {
      const res = await providerApi.authorize(item.id, next);
      setGrant(res);
      if (res.method === "code" && res.url) {
        window.open(res.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setErr(text(error, "无法发起 OAuth 授权"));
    } finally {
      setBusy(false);
    }
  }

  async function saveKey(e: React.FormEvent) {
    e.preventDefault();
    const item = props.item;
    if (!item) return;
    if (!key.trim()) {
      setErr("请输入 API 密钥");
      return;
    }

    setBusy(true);
    setErr("");
    try {
      await providerApi.set(item.id, {
        type: "api",
        key: key.trim(),
      });
      await providerApi.dispose();
      await props.onDone();
      toast.success(`${item.name} 已连接`);
      props.onOpenChange(false);
    } catch (error) {
      setErr(text(error, "保存 API 密钥失败"));
    } finally {
      setBusy(false);
    }
  }

  async function saveCode(e: React.FormEvent) {
    e.preventDefault();
    const item = props.item;
    if (!item || idx === undefined) return;
    if (!code.trim()) {
      setErr("请输入授权码");
      return;
    }

    setBusy(true);
    setErr("");
    try {
      await providerApi.callback(item.id, {
        method: idx,
        code: code.trim(),
      });
      await providerApi.dispose();
      await props.onDone();
      toast.success(`${item.name} 已连接`);
      props.onOpenChange(false);
    } catch (error) {
      setErr(text(error, "授权码校验失败"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={props.open && !!item} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? `连接 ${item.name}` : "连接提供商"}</DialogTitle>
          <DialogDescription>
            选择认证方式并完成授权，连接成功后页面会自动刷新状态。
          </DialogDescription>
        </DialogHeader>

        {!method && (
          <div className="space-y-3">
            {list.map((item, idx) => (
              <button
                key={`${item.type}-${item.label}`}
                type="button"
                className="hover:border-primary/60 hover:bg-accent/40 w-full rounded-xl border px-4 py-3 text-left transition-colors"
                onClick={() => void pick(idx)}
                disabled={busy}
              >
                <div className="font-medium">{label(item)}</div>
                <div className="text-muted-foreground mt-1 text-sm">
                  {item.type === "api" ? "通过 API 密钥连接" : "通过 OAuth 授权连接"}
                </div>
              </button>
            ))}
          </div>
        )}

        {busy && !grant && method?.type === "oauth" && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            正在发起授权...
          </div>
        )}

        {method?.type === "api" && (
          <form className="space-y-4" onSubmit={saveKey}>
            <div className="space-y-2">
              <Label htmlFor="provider-api-key">API 密钥</Label>
              <Input
                id="provider-api-key"
                type="password"
                value={key}
                onChange={(event) => setKey(event.target.value)}
                placeholder="请输入密钥"
                autoFocus
              />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setIdx(undefined);
                  setErr("");
                }}
                disabled={busy || list.length === 1}
              >
                返回
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "提交中..." : "提交"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {method?.type === "oauth" && grant?.method === "code" && (
          <form className="space-y-4" onSubmit={saveCode}>
            <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
              <p className="mb-2">请在新窗口完成授权，然后把授权码粘贴回这里。</p>
              <a
                href={grant.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex items-center gap-1 hover:underline"
              >
                打开授权链接
                <ExternalLink className="size-4" />
              </a>
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-auth-code">授权码</Label>
              <Input
                id="provider-auth-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="请输入授权码"
                autoFocus
              />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setIdx(undefined);
                  setGrant(undefined);
                  setErr("");
                }}
                disabled={busy || list.length === 1}
              >
                返回
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "提交中..." : "提交"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {method?.type === "oauth" && grant?.method === "auto" && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
              <p>请在新窗口完成授权。</p>
              {grant.instructions ? (
                <p className="text-muted-foreground mt-2 break-all font-mono text-xs">
                  {grant.instructions}
                </p>
              ) : null}
            </div>
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              等待服务端完成 OAuth 回调...
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
          </div>
        )}

        {!method && err && <p className="text-sm text-red-600">{err}</p>}
      </DialogContent>
    </Dialog>
  );
}
