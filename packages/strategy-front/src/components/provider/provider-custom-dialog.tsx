"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Config } from "@/types/provider";
import { headerRow, modelRow, validate, type Form } from "./provider-custom-form";
import { text } from "./utils";

type Props = {
  open: boolean;
  ids: Set<string>;
  cfg: Config;
  onOpenChange: (open: boolean) => void;
  onDone: () => Promise<void>;
};

const init = (): Form => ({
  providerID: "",
  name: "",
  baseURL: "",
  apiKey: "",
  models: [modelRow()],
  headers: [headerRow()],
  err: {},
});

export function ProviderCustomDialog(props: Props) {
  const [form, setForm] = useState<Form>(init);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const disabled = useMemo(() => props.cfg.disabled_providers ?? [], [props.cfg]);

  function close(next: boolean) {
    props.onOpenChange(next);
    if (!next) {
      setForm(init());
      setBusy(false);
      setLoading(false);
      setErr("");
    }
  }

  function setField(key: "providerID" | "name" | "baseURL" | "apiKey", value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      err: key === "apiKey" ? prev.err : { ...prev.err, [key]: undefined },
    }));
  }

  async function discover() {
    const baseURL = form.baseURL.trim();
    const msg =
      !baseURL
        ? "请输入服务地址后再获取模型"
        : !/^https?:\/\//.test(baseURL)
          ? "服务地址必须以 http:// 或 https:// 开头"
          : "";

    if (msg) {
      setForm((prev) => ({
        ...prev,
        err: { ...prev.err, baseURL: msg },
      }));
      setErr("");
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const rows = await providerApi.discover({
        baseURL,
        apiKey: form.apiKey.trim() || undefined,
        headers: Object.fromEntries(
          form.headers
            .map((item) => [item.key.trim(), item.value.trim()] as const)
            .filter(([key, value]) => key && value),
        ),
      });

      if (rows.length === 0) {
        setErr("未获取到可用模型");
        return;
      }

      setForm((prev) => ({
        ...prev,
        err: { ...prev.err, baseURL: undefined },
        models: rows.map((item) => ({
          row: modelRow().row,
          id: item.id,
          name: item.name,
          err: {},
        })),
      }));
    } catch (error) {
      setErr(text(error, "获取模型失败"));
    } finally {
      setLoading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const out = validate({
      form,
      ids: props.ids,
      disabled,
    });

    setForm((prev) => ({
      ...prev,
      err: out.err,
      models: prev.models.map((item, idx) => ({
        ...item,
        err: out.models[idx] ?? {},
      })),
      headers: prev.headers.map((item, idx) => ({
        ...item,
        err: out.headers[idx] ?? {},
      })),
    }));

    if (!("result" in out) || !out.result) {
      return;
    }

    const data = out.result;

    setBusy(true);
    setErr("");

    try {
      if (data.key) {
        await providerApi.set(data.providerID, {
          type: "api",
          key: data.key,
        });
      }

      await providerApi.update({
        provider: {
          [data.providerID]: data.cfg,
        },
        disabled_providers: disabled.filter((item) => item !== data.providerID),
      });

      await props.onDone();
      toast.success(`${data.name} 已添加`);
      close(false);
    } catch (error) {
      setErr(text(error, "保存自定义 provider 失败"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={close}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>自定义 provider</DialogTitle>
          <DialogDescription>
            配置一个兼容 OpenAI 的 provider，并通过你输入的服务地址主动获取模型列表。
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-6" onSubmit={save}>
          <ScrollArea className="h-[65vh] pr-4">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="provider-id">Provider ID</Label>
                  <Input
                    id="provider-id"
                    value={form.providerID}
                    onChange={(event) => setField("providerID", event.target.value)}
                    placeholder="请输入唯一标识"
                  />
                  {form.err.providerID ? (
                    <p className="text-sm text-red-600">{form.err.providerID}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider-name">显示名称</Label>
                  <Input
                    id="provider-name"
                    value={form.name}
                    onChange={(event) => setField("name", event.target.value)}
                    placeholder="请输入显示名称"
                  />
                  {form.err.name ? <p className="text-sm text-red-600">{form.err.name}</p> : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="provider-url">服务地址</Label>
                  <Input
                    id="provider-url"
                    value={form.baseURL}
                    onChange={(event) => setField("baseURL", event.target.value)}
                    placeholder="https://api.example.com/v1"
                  />
                  {form.err.baseURL ? (
                    <p className="text-sm text-red-600">{form.err.baseURL}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider-key">API Key</Label>
                  <Input
                    id="provider-key"
                    value={form.apiKey}
                    onChange={(event) => setField("apiKey", event.target.value)}
                    placeholder="可填密钥，或使用 {env:MY_KEY}"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>模型</Label>
                  <Button type="button" variant="outline" size="sm" disabled={busy || loading} onClick={discover}>
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    获取模型
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  会按你输入的 URL、API Key 和自定义请求头请求模型接口。支持基础 URL 与完整 /v1/models 地址。
                </p>
                <div className="space-y-3">
                  {form.models.map((item, idx) => (
                    <div key={item.row} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <div className="space-y-2">
                        <Input
                          value={item.id}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              models: prev.models.map((row, i) =>
                                i === idx
                                  ? { ...row, id: event.target.value, err: { ...row.err, id: undefined } }
                                  : row,
                              ),
                            }))
                          }
                          placeholder="模型标识"
                        />
                        {item.err.id ? <p className="text-sm text-red-600">{item.err.id}</p> : null}
                      </div>
                      <div className="space-y-2">
                        <Input
                          value={item.name}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              models: prev.models.map((row, i) =>
                                i === idx
                                  ? { ...row, name: event.target.value, err: { ...row.err, name: undefined } }
                                  : row,
                              ),
                            }))
                          }
                          placeholder="显示名称"
                        />
                        {item.err.name ? <p className="text-sm text-red-600">{item.err.name}</p> : null}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="mt-0.5"
                        disabled={form.models.length === 1}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            models: prev.models.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>请求头</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        headers: [...prev.headers, headerRow()],
                      }))
                    }
                  >
                    <Plus className="size-4" />
                    添加请求头
                  </Button>
                </div>
                <div className="space-y-3">
                  {form.headers.map((item, idx) => (
                    <div key={item.row} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <div className="space-y-2">
                        <Input
                          value={item.key}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              headers: prev.headers.map((row, i) =>
                                i === idx
                                  ? { ...row, key: event.target.value, err: { ...row.err, key: undefined } }
                                  : row,
                              ),
                            }))
                          }
                          placeholder="Header 名称"
                        />
                        {item.err.key ? <p className="text-sm text-red-600">{item.err.key}</p> : null}
                      </div>
                      <div className="space-y-2">
                        <Input
                          value={item.value}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              headers: prev.headers.map((row, i) =>
                                i === idx
                                  ? { ...row, value: event.target.value, err: { ...row.err, value: undefined } }
                                  : row,
                              ),
                            }))
                          }
                          placeholder="Header 值"
                        />
                        {item.err.value ? <p className="text-sm text-red-600">{item.err.value}</p> : null}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="mt-0.5"
                        disabled={form.headers.length === 1}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            headers: prev.headers.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          {err ? <p className="text-sm text-red-600">{err}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)} disabled={busy || loading}>
              取消
            </Button>
            <Button type="submit" disabled={busy || loading}>
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}