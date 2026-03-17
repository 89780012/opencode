import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ChatQuestionAnswer, ChatQuestionRequest } from "@/types/chat";

interface Props {
  req: ChatQuestionRequest;
  sending?: boolean;
  onReply: (answers: ChatQuestionAnswer[]) => void;
  onReject: () => void;
}

export function QuestionPanel(props: Props) {
  const [answers, setAnswers] = useState<ChatQuestionAnswer[]>(() => props.req.questions.map(() => []));
  const [custom, setCustom] = useState<string[]>(() => props.req.questions.map(() => ""));
  const [customOn, setCustomOn] = useState<boolean[]>(() => props.req.questions.map(() => false));

  const pick = (q: number, label: string, multi: boolean) => {
    setAnswers((prev) =>
      prev.map((item, i) => {
        if (i !== q) return item;
        if (!multi) return [label];
        return item.includes(label) ? item.filter((v) => v !== label) : [...item, label];
      }),
    );
  };

  const setText = (q: number, value: string, multi: boolean) => {
    setCustom((prev) => prev.map((item, i) => (i === q ? value : item)));
    setAnswers((prev) =>
      prev.map((item, i) => {
        if (i !== q) return item;
        const next = item.filter((v) => v !== custom[q]);
        if (!customOn[q] || !value.trim()) return next;
        if (!multi) return [value.trim()];
        return next.includes(value.trim()) ? next : [...next, value.trim()];
      }),
    );
  };

  const toggleCustom = (q: number, multi: boolean) => {
    const on = !customOn[q];
    setCustomOn((prev) => prev.map((item, i) => (i === q ? on : item)));
    setAnswers((prev) =>
      prev.map((item, i) => {
        if (i !== q) return item;
        const txt = custom[q]?.trim();
        if (!txt) return item;
        if (!on) return item.filter((v) => v !== txt);
        if (!multi) return [txt];
        return item.includes(txt) ? item : [...item, txt];
      }),
    );
  };

  return (
    <Card className="mb-3 gap-4 border-amber-200 bg-amber-50/70 py-4">
      <CardHeader className="pb-0">
        <CardTitle>需要你确认几个问题</CardTitle>
        <CardDescription>
          当前任务被问题阻塞。回答后，后续执行会继续。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.req.questions.map((item, i) => {
          const multi = item.multiple === true;
          const allow = item.custom !== false;
          const selected = answers[i] ?? [];
          const text = custom[i] ?? "";
          const on = customOn[i] === true;

          return (
            <div key={`${props.req.id}:${i}`} className="rounded-xl border bg-background px-4 py-4">
              <div className="mb-1 text-sm font-medium">{item.header}</div>
              <div className="mb-3 text-sm text-muted-foreground">{item.question}</div>
              <div className="space-y-2">
                {item.options.map((opt) => {
                  const hit = selected.includes(opt.label);
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left ${
                        hit ? "border-primary bg-primary/5" : "border-border bg-background"
                      }`}
                      disabled={props.sending}
                      onClick={() => pick(i, opt.label, multi)}
                    >
                      <div className={`mt-0.5 size-4 rounded-full border ${hit ? "border-primary bg-primary" : "border-muted-foreground/40"}`} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="text-sm text-muted-foreground">{opt.description}</div>
                      </div>
                    </button>
                  );
                })}
                {allow ? (
                  <div className="rounded-lg border px-3 py-3">
                    <button
                      type="button"
                      className="mb-3 flex w-full items-center gap-3 text-left"
                      disabled={props.sending}
                      onClick={() => toggleCustom(i, multi)}
                    >
                      <div className={`size-4 rounded-full border ${on ? "border-primary bg-primary" : "border-muted-foreground/40"}`} />
                      <div className="text-sm font-medium">自定义输入</div>
                    </button>
                    <Input
                      disabled={!on || props.sending}
                      onChange={(e) => setText(i, e.target.value, multi)}
                      placeholder="输入你的答案"
                      value={text}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button disabled={props.sending} type="button" variant="outline" onClick={props.onReject}>
          取消
        </Button>
        <Button disabled={props.sending} type="button" onClick={() => props.onReply(answers)}>
          提交答案
        </Button>
      </CardFooter>
    </Card>
  );
}
