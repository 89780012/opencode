# Strategy Front Image Upload Design

**Goal:** 在 `packages/strategy-front` 增加图片上传能力，让用户可以在聊天输入框附加图片，并把图片作为 `file` part 发给 `opencode`，供支持视觉输入的模型读取。

**Scope:** 仅覆盖 `packages/strategy-front` 前端输入、草稿、请求构造、消息展示与能力约束。后端 `packages/opencode` 只做现状复用，不在本次方案内修改协议。

**Non-Goals:**
- 不做刷新后附件持久化
- 不做 PDF、文本文件、目录上传
- 不改 session 协议
- 不改 provider 数据来源
- 不做图片编辑、压缩、裁剪

---

## 1. 结论

`packages/opencode` 已经支持在 prompt 中接收 `file` part，并会把图片按 media 输入交给模型处理。因此这次改造的关键，不是扩后端接口，而是把 `strategy-front` 的 composer 从“纯文本”升级成“文本 + 图片附件”。

推荐采用和 `packages/app` 一致的最小模型：

1. 前端把图片读成 `data:` URL
2. 在输入态中以图片附件对象保存
3. 提交时把每张图片转换成 `type: "file"` 的请求 part
4. 根据模型能力决定是否允许上传/发送
5. 在消息列表中把图片类 `file` part 渲染成缩略图

这样可以最大化复用现有 `opencode` 协议，同时把改动控制在 `strategy-front` 内部。

---

## 2. 当前现状

## 2.1 `app` 已有完整参考实现

`packages/app` 已经实现了图片附件输入链路：

- 附件接入与粘贴、拖拽、上传：
  - `packages/app/src/components/prompt-input/attachments.ts`
- 附件类型与 MIME 判断：
  - `packages/app/src/components/prompt-input/files.ts`
- prompt 状态中对图片附件的建模：
  - `packages/app/src/context/prompt.tsx`
- 提交时构造 `file` part：
  - `packages/app/src/components/prompt-input/build-request-parts.ts`

其中图片附件的核心结构是：

```ts
{
  type: "image"
  id: string
  filename: string
  mime: string
  dataUrl: string
}
```

提交时会被转换成：

```ts
{
  type: "file"
  mime: attachment.mime
  url: attachment.dataUrl
  filename: attachment.filename
}
```

## 2.2 `strategy-front` 目前还是纯文本

当前 `strategy-front` 的缺口很明确：

- `PromptInputMessage.files` 是空数组占位，没有真正能力
  - `packages/strategy-front/src/components/ai-elements/prompt-input.tsx`
- `buildRequestParts()` 只生成 text part
  - `packages/strategy-front/src/lib/build-request-parts.ts`
- `ChatInputPart` 只有文本输入类型
  - `packages/strategy-front/src/types/chat.ts`
- `usePromptSubmit()` 只接收字符串
  - `packages/strategy-front/src/hooks/use-prompt-submit.ts`
- 会话草稿只保存文本
  - `packages/strategy-front/src/hooks/use-session-draft.ts`
- 消息列表对 `file` part 只显示文件名和 MIME，不显示图片预览
  - `packages/strategy-front/src/components/chat-message-list.tsx`

## 2.3 后端协议已经满足需求

`packages/opencode` 已经支持：

- session prompt 输入里包含 `FilePart`
  - `packages/opencode/src/session/prompt.ts`
- 图片和 PDF 被识别为 media
  - `packages/opencode/src/session/message-v2.ts`
- provider model 元数据中存在：
  - `attachment`
  - `modalities.input`
  - `modalities.output`
  - `packages/opencode/src/provider/models.ts`

因此本次不需要新增后端字段或接口。

---

## 3. 设计目标

本次设计目标如下：

1. 用户可以在聊天输入框中上传图片
2. 用户可以看到已挂载的图片缩略图，并能删除
3. 用户发送时，图片作为 `file` part 和文本一起发给后端
4. 不支持图片输入的模型要在前端被约束
5. 用户消息和工具返回中的图片都能在消息区显示
6. 不引入刷新持久化，不把图片写入 localStorage

---

## 4. 方案选择

## 方案 A：完全复刻 `app` 的 prompt store

优点：

- 最大程度复用
- 后续扩展 PDF/文本附件更顺

缺点：

- 对 `strategy-front` 侵入较大
- 要引入新的全局 prompt 状态模型
- 对当前 React 版 composer 过重

## 方案 B：在现有 `PromptInput` 上补充 `files`

优点：

- 改动面最小
- 可以保留当前 `PromptBar`、`useSessionDraft`、`usePromptSubmit` 的结构
- 更适合先交付“图片可发”

缺点：

- 后续如果要加更多附件类型，需要再扩一次

## 推荐方案

采用方案 B。

理由：

- 用户目标很明确，只要图片上传和视觉模型读取
- 后端协议已支持，前端只差把 `files` 真正打通
- 当前又明确“不需要刷新后保存”，可以避免把附件纳入复杂持久化状态

---

## 5. 数据结构设计

## 5.1 新增本地附件类型

建议在 `packages/strategy-front/src/types/chat.ts` 或新文件中定义：

```ts
export interface ChatImageInput {
  id: string
  filename: string
  mime: string
  url: string
}
```

说明：

- `url` 直接保存 `data:` URL
- 命名用 `url`，和最终请求字段保持一致
- 不再单独叫 `dataUrl`，减少转换层字段分叉

如果想贴近 `app` 术语，也可以叫 `ChatImageAttachment`，字段仍保持一致。

## 5.2 扩展 prompt message 类型

当前：

```ts
export type PromptInputMessage = {
  text: string
  files: []
}
```

建议改成：

```ts
export type PromptInputMessage = {
  text: string
  files: ChatImageInput[]
}
```

## 5.3 扩展发送请求 part

当前：

```ts
export type ChatInputPart = ChatTextInput
```

建议改成：

```ts
export interface ChatFileInput {
  id?: string
  type: "file"
  mime: string
  url: string
  filename?: string
}

export type ChatInputPart = ChatTextInput | ChatFileInput
```

这样就和后端 `SessionPrompt.PromptInput` 的 `FilePart` 输入对齐了。

---

## 6. 组件与状态改造

## 6.1 `components/ai-elements/prompt-input.tsx`

**目标：** 把当前基础输入组件从“只能发 text”升级成“能管理 text + files”。

**建议改造：**

1. 在上下文里加入：
   - `files`
   - `onFilesChange`
2. `PromptInputProps` 新增：
   - `files: ChatImageInput[]`
   - `onFilesChange: (files: ChatImageInput[]) => void`
3. `submit()` 时返回完整 message：

```ts
onSubmit({
  text: value,
  files,
}, event)
```

4. 新增隐藏 file input
5. 暴露上传触发按钮或专用子组件
6. 增加图片预览列表插槽

**职责边界：**

- 这里负责基础输入容器能力
- 不负责模型能力判断
- 不负责最终请求构造

## 6.2 `components/chat/prompt-bar.tsx`

**目标：** 让业务层 composer 真正接收附件并提交。

**建议改造：**

1. Props 新增：
   - `files`
   - `onFilesChange`
   - `canAttachImage`
2. `onSubmit` 从 `(value: string) => void` 改成 `(msg: PromptInputMessage) => void`
3. 上传按钮逻辑接到 `PromptInput` 能力上
4. 在 textarea 上方或 footer 上方显示附件缩略图条
5. submit 按钮可发送条件改成：

```ts
props.value.trim().length > 0 || props.files.length > 0
```

6. 如果当前模型不支持图片：
   - 上传按钮置灰，或
   - 点击时弹 toast，提示切换到支持图片输入的模型

## 6.3 `hooks/use-session-draft.ts`

**目标：** 会话内存草稿支持文本和图片，但不做刷新恢复。

因为你已经明确“刷新后不需要保存”，所以这里建议做简化：

### 推荐做法

- 只让 `use-session-draft.ts` 继续负责文本
- 图片附件放在页面级或面板级 `useState`
- session 切换时按 session 维度存内存 Map

例如：

```ts
type DraftImageMap = Record<string, Record<string, ChatImageInput[]>>
```

更简单的实现位置可以放在：

- `StrategyChatPanel`
- 或新的 `use-chat-draft.ts`

### 不推荐做法

- 继续把图片写进 localStorage

原因：

- base64 体积大
- 会快速撞上 localStorage 配额
- 和“刷新后不保留”的需求相违背

## 6.4 `hooks/use-prompt-submit.ts`

**目标：** 把提交输入从纯文本改成复合 message。

建议改造：

1. `submit(value: string)` 改成：

```ts
submit(msg: PromptInputMessage)
```

2. 通过 `buildRequestParts(msg)` 构造 parts
3. 空提交判定改成：

```ts
if (msg.text.trim().length === 0 && msg.files.length === 0) return
```

4. 提交成功后调用：
   - `onSubmitted?.()`
   - 由调用方清空 text 和 files

## 6.5 `lib/build-request-parts.ts`

**目标：** 从 message 生成 text part + file parts。

建议签名改成：

```ts
export function buildRequestParts(input: PromptInputMessage): ChatInputPart[]
```

逻辑：

1. 文本非空时生成一条 `text` part
2. 遍历 `files`
3. 每张图生成一条 `file` part

返回示例：

```ts
[
  { type: "text", text: "帮我分析这张图" },
  {
    type: "file",
    mime: "image/png",
    url: "data:image/png;base64,...",
    filename: "chart.png",
  },
]
```

## 6.6 `components/chat-message-list.tsx`

**目标：** 让消息时间线能真正看见图片内容。

建议改造 `renderPart(part)` 中 `case "file"` 的逻辑：

1. 若 `part.mime.startsWith("image/")`
   - 渲染图片缩略图
   - 下面显示文件名
2. 否则保留当前文件卡片表现

建议新增小组件：

- `components/chat/chat-image-part.tsx`

职责：

- 统一用户消息、助手消息、工具附件图片显示
- 控制最大宽高
- 加载失败时显示占位

---

## 7. 上传与附件交互设计

## 7.1 支持的输入方式

第一期建议支持三种：

1. 点击上传
2. 粘贴图片
3. 拖拽图片到输入框

原因：

- 点击上传是基础能力
- 粘贴图片对桌面用户很常见
- 拖拽图片和现有聊天产品心智一致

## 7.2 支持格式

与 `app` 对齐，第一期支持：

- `image/png`
- `image/jpeg`
- `image/gif`
- `image/webp`

不支持：

- `image/svg+xml`
- `bmp`
- `heic`
- `pdf`

## 7.3 限制策略

建议前端增加：

- 单张图片上限：10MB
- 单次最多图片数：4

原因：

- 避免超大 base64 直接塞进请求体
- 控制视觉模型上下文成本
- 避免输入区 UI 被过多图片撑爆

## 7.4 重复上传策略

建议允许重复文件名，但以 `id` 作为唯一标识。

原因：

- 用户可能同名截图多次上传
- 不能用 `filename` 做删除 key

## 7.5 删除策略

每个附件卡片提供单独删除按钮。

删除后：

- 从本地附件数组移除
- 不影响文本内容

---

## 8. 模型能力约束

## 8.1 能力判断来源

优先使用模型元数据里的：

```ts
model.modalities?.input.includes("image")
```

兜底使用：

```ts
model.attachment === true
```

原因：

- `modalities` 更精确，能明确区分 image/audio/pdf/video
- `attachment` 只能说明支持附件，不足以单独证明支持视觉输入

## 8.2 前端行为规则

### 规则 1：当前模型不支持图片时

- 上传按钮禁用
- hover 或点击提示：
  - “当前模型不支持图片输入，请切换到支持视觉的模型”

### 规则 2：已挂图片后切到不支持图片的模型

建议行为：

- 保留附件，不自动清除
- 在输入区上方显示 warning
- 发送按钮可继续显示，但点击发送时阻止并 toast 提示

原因：

- 自动清除会造成用户损失
- 发送前阻止更稳妥

### 规则 3：列表中标识支持图片的模型

建议在模型下拉中增加轻量标识：

- `Vision`
- 或 `图像`

这样用户切模型时更容易理解。

---

## 9. 技术实现细节

## 9.1 文件读取

建议复用 `app` 的思路：

1. 校验 MIME
2. `FileReader.readAsDataURL(file)`
3. 读成标准 `data:${mime};base64,...`

建议在 `strategy-front` 新增：

- `src/lib/attachment.ts`

包含：

- `acceptedImageTypes`
- `attachmentMime(file)`
- `readDataUrl(file, mime)`
- `isImageModel(model)`

这样可避免把逻辑塞到组件内部。

## 9.2 提交顺序

建议 part 顺序固定为：

1. text
2. files

原因：

- 与 `app` 的图片补充思路一致
- 模型先读指令，再读图片，语义更自然

## 9.3 性能考量

本期不做持久化，因此图片只存在当前页面内存中。

注意点：

- 不要把图片放入 Redux
- 不要把图片写入 localStorage
- 尽量让附件状态留在聊天面板局部

推荐归属：

- `StrategyChatPanel`
- 或 `PromptBar` 上层 hook

## 9.4 错误处理

需要覆盖：

1. 文件类型不支持
2. 文件过大
3. FileReader 失败
4. 当前模型不支持图片
5. 发送前图片数组为空但文本也为空

toast 文案建议统一放在现有中文 UI 风格下，避免再次出现乱码文本。

---

## 10. 文件改造清单

## 必改文件

- `packages/strategy-front/src/components/ai-elements/prompt-input.tsx`
- `packages/strategy-front/src/components/chat/prompt-bar.tsx`
- `packages/strategy-front/src/hooks/use-prompt-submit.ts`
- `packages/strategy-front/src/lib/build-request-parts.ts`
- `packages/strategy-front/src/types/chat.ts`
- `packages/strategy-front/src/components/chat-message-list.tsx`

## 大概率需要改

- `packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx`
- `packages/strategy-front/src/hooks/use-session-draft.ts`
- `packages/strategy-front/src/types/composer.ts`
- `packages/strategy-front/src/hooks/use-strategy-composer.ts`

## 推荐新增文件

- `packages/strategy-front/src/lib/attachment.ts`
- `packages/strategy-front/src/components/chat/image-attachments.tsx`
- `packages/strategy-front/src/components/chat/chat-image-part.tsx`

---

## 11. 分步实施计划

## Phase 1: 类型与请求通路

目标：先让协议层可发送图片。

任务：

1. 扩展 `ChatInputPart` 支持 `file`
2. 扩展 `PromptInputMessage.files`
3. 改造 `buildRequestParts()`
4. 改造 `usePromptSubmit()` 签名

完成标志：

- 可以构造出包含图片 `file` part 的请求体

## Phase 2: 输入区能力

目标：用户能上传、预览、删除图片。

任务：

1. 改造 `PromptInput`
2. 增加隐藏上传 input
3. 实现点击上传
4. 实现粘贴图片
5. 实现拖拽图片
6. 增加缩略图列表
7. 增加删除逻辑

完成标志：

- 输入框可见附件卡片
- 只发图片也能提交

## Phase 3: 模型能力约束

目标：避免把图片发给不支持视觉输入的模型。

任务：

1. 在 composer 中暴露 `modelEntry`
2. 新增 `canAttachImage`
3. 上传按钮禁用/提示
4. 发送前再次校验
5. 模型切换时显示 warning

完成标志：

- 不支持视觉模型时不能误发图片

## Phase 4: 消息展示

目标：用户和助手消息中的图片都能看见。

任务：

1. 新增图片 part 组件
2. 修改 `chat-message-list.tsx` 的 `file` 渲染
3. 渲染用户上传图
4. 渲染工具结果里的图片附件

完成标志：

- 时间线可预览图片

---

## 12. 验证方案

## 自动检查

在 `packages/strategy-front` 下运行：

```powershell
cmd /c bun run typecheck
```

如需要再跑：

```powershell
cmd /c bun run build
```

## 手工验证

### 用例 1：仅文本发送

- 不上传图片
- 输入文本
- 正常发送成功

### 用例 2：仅图片发送

- 不输入文字
- 上传一张 PNG
- 可以发送成功

### 用例 3：文本 + 图片发送

- 输入提示词
- 上传一张图片
- 请求体包含 text part + file part

### 用例 4：删除附件

- 上传两张图
- 删除其中一张
- 发送时只包含剩余图片

### 用例 5：切换到不支持图片的模型

- 先挂一张图
- 切到不支持视觉输入的模型
- 发送时被拦截并提示

### 用例 6：消息展示

- 用户上传的图片在时间线可见
- 助手工具附件里的图片也可见

### 用例 7：异常文件

- 上传不支持格式
- 上传超大文件
- 均出现明确错误提示

---

## 13. 风险与注意点

## 风险 1：base64 体积过大

影响：

- 请求体膨胀
- 浏览器内存抖动
- 模型上下文成本增加

缓解：

- 限制单图大小
- 限制单次张数

## 风险 2：模型能力判断不准

影响：

- 前端允许上传但模型实际不支持

缓解：

- 优先用 `modalities.input`
- `attachment` 只作兜底
- 发送前做二次校验

## 风险 3：附件状态归属不清

影响：

- session 切换时残留附件
- 清空输入不彻底

缓解：

- 明确附件状态只归当前聊天面板
- 成功发送后与文本一起清空
- 切换 session 时切换到各自内存附件集合

---

## 14. 推荐实施顺序

推荐按下面顺序落地：

1. `types/chat.ts`
2. `lib/build-request-parts.ts`
3. `hooks/use-prompt-submit.ts`
4. `components/ai-elements/prompt-input.tsx`
5. `components/chat/prompt-bar.tsx`
6. `components/strategy/strategy-chat-panel.tsx`
7. `components/chat-message-list.tsx`
8. 模型能力约束与文案

这样能先打通协议，再补 UI，再补约束和展示，便于逐步验证。

---

## 15. 最终建议

这次改造应当以“最小可用图片附件”作为目标，而不是一次性把 `app` 的全部附件体系搬过来。

最合适的落点是：

- 输入侧增加 `files`
- 提交侧增加 `file` part
- 展示侧增加图片缩略图
- 能力侧增加视觉模型判断

在你已经明确“不需要刷新后保存”的前提下，完全没必要把图片附件接进 localStorage 或 Redux。把它放在 `strategy-front` 的当前聊天面板内存中，是成本最低、风险最小、最容易上线的一版。
