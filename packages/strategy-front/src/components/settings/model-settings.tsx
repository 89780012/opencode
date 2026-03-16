"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { LLMConfigFormValues } from "@/types/settings";

interface ModelSettingsProps {
  values: LLMConfigFormValues;
  onChange: (field: keyof LLMConfigFormValues, value: string | number) => void;
}

export function ModelSettings({ values, onChange }: ModelSettingsProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold">模型配置</h3>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="baseUrl">API 地址</Label>
          <Input
            id="baseUrl"
            value={values.base_url}
            onChange={(e) => onChange("base_url", e.target.value)}
            placeholder="https://api.deepseek.com/v1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiKey">API 秘钥</Label>
          <Input
            id="apiKey"
            type="password"
            value={values.api_key}
            onChange={(e) => onChange("api_key", e.target.value)}
            placeholder="sk-..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="modelName">模型名称</Label>
          <Input
            id="modelName"
            value={values.model_name}
            onChange={(e) => onChange("model_name", e.target.value)}
            placeholder="deepseek-reasoner"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="temperature">温度</Label>
          <Input
            id="temperature"
            type="number"
            value={values.temperature}
            onChange={(e) => onChange("temperature", Number(e.target.value))}
            min="0"
            max="2"
            step="0.1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxTokens">最大token数</Label>
          <Input
            id="maxTokens"
            type="number"
            value={values.max_tokens}
            onChange={(e) => onChange("max_tokens", Number(e.target.value))}
            min="1"
            max="1000000"
          />
        </div>
      </div>
    </div>
  );
}
