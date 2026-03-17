import { useCallback, useState } from "react";
import { chatApi } from "@/api/modules";
import { buildRequestParts } from "@/lib/build-request-parts";
import type { ChatModelRef } from "@/types/chat";

interface Input {
  workspacePath?: string | null;
  sessionId?: string | null;
  agent?: string;
  model?: ChatModelRef;
  variant?: string;
  createSession: () => Promise<string>;
  refreshSessions: () => Promise<void>;
  selectSession: (sessionId: string) => void;
  onSubmitted?: () => void;
}

export function usePromptSubmit(input: Input) {
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (value: string) => {
      if (!input.workspacePath || !input.agent || !input.model) {
        return;
      }

      const parts = buildRequestParts(value);
      if (parts.length === 0) {
        return;
      }

      setSubmitting(true);
      try {
        const sessionId = input.sessionId ?? (await input.createSession());
        input.selectSession(sessionId);
        await chatApi.sendPrompt(input.workspacePath, sessionId, {
          agent: input.agent,
          model: input.model,
          variant: input.variant,
          parts,
        });
        await input.refreshSessions();
        input.onSubmitted?.();
      } finally {
        setSubmitting(false);
      }
    },
    [input],
  );

  return {
    submitting,
    submit,
  };
}
