"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { AgentConfigFormValues } from "@/types/settings";

interface AppSettingsProps {
  values: AgentConfigFormValues;
  onChange: (field: keyof AgentConfigFormValues, value: number) => void;
}

export function AppSettings({ values, onChange }: AppSettingsProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold">Agent 配置</h3>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="maxIterations">最大迭代次数</Label>
          <Input
            id="maxIterations"
            type="number"
            value={values.max_iterations}
            onChange={(e) => onChange("max_iterations", Number(e.target.value))}
            min="1"
            max="1000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxRetries">最大重试次数</Label>
          <Input
            id="maxRetries"
            type="number"
            value={values.max_retries}
            onChange={(e) => onChange("max_retries", Number(e.target.value))}
            min="0"
            max="10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxSearchResults">最大搜索结果数</Label>
          <Input
            id="maxSearchResults"
            type="number"
            value={values.max_search_results}
            onChange={(e) =>
              onChange("max_search_results", Number(e.target.value))
            }
            min="1"
            max="30"
          />
        </div>
      </div>
    </div>
  );
}
