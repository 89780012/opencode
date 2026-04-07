# Strategy Front Workflow Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 `packages/strategy-front` 中集成 `xyflow`，新增“工作流”入口、工作流列表 demo 页，以及进入后可进行节点编排的工作流编辑页，并让编排页整体布局接近参考截图。

**Architecture:** 复用现有 `strategies` 的页面组织方式和视觉层级，在路由层新增 `workflows` 模块。列表页先使用前端本地 demo 数据完成信息架构和视觉占位，详情页采用 `xyflow` 负责画布、节点、边与交互，整体改为“左侧组件库 + 中央大画布 + 顶部悬浮工具条 + 画布角落控件”的布局，外层仍沿用现有 `tailwindcss + shadcn + react-router` 的按钮、输入、卡片和主题变量。

**Tech Stack:** React 19, React Router 7, Tailwind CSS v4, shadcn/ui, lucide-react, xyflow/react

---

## Current State

`packages/strategy-front` 已有这些可直接复用的能力：

- `src/routes/index.tsx`
  现有路由全部挂在 `/app/*` 下，页面通过 `lazy()` 懒加载。
- `src/components/app-sidebar.tsx`
  左侧导航统一维护，新增一级入口成本很低。
- `src/pages/strategies.tsx`
  已经实现了一个完整的“列表页 + 顶部操作区 + 搜索区 + 卡片网格”范式。
- `src/components/strategy/strategy-list.tsx`
  已经把列表卡片拆成 `StrategyList` + `Row` 两层，适合作为工作流 demo 列表的参考模板。
- `src/pages/strategy-detail.tsx`
  已经实现了一个“顶部工具栏 + 可伸缩主区域 + 右侧面板”的详情页骨架，可直接借鉴给工作流编排页。
- `src/index.css`
  项目已完成 Tailwind v4 和 shadcn 变量接入，因此工作流页应继续使用 CSS 变量、语义色值和现有圆角、边框、阴影语言。

这次改造建议只做前端 demo，不改 `strategy-service`，避免把需求扩大成接口设计和后端建模。

## Screenshot Alignment

根据你补充的截图，编排页应该贴近下面这套信息架构，而不是我前一版里更偏“IDE 三栏”的方案：

- 左侧是固定组件库
  有搜索框、分类标题、组件卡片列表，适合直接点击或拖入画布。
- 中间是全屏主画布
  占据页面绝大部分宽度，背景为浅色点阵网格。
- 顶部中间有悬浮操作条
  用来放保存、校验、运行、导出、代码视图之类的操作。
- 左下角是画布控制器
  典型是缩放、适配、锁定、删除等 flow 控件。
- 右下角是 minimap
  这是 `xyflow` 原生就很适合承接的区域。
- 节点本身是“表单卡片”
  不是简单的小矩形，而是包含标题、表单项、下拉框、checkbox 的业务卡片。

这意味着第一版详情页应当优先还原“工作流画布产品”的感觉，而不是做成通用后台详情页。

## Scope

本次计划只覆盖这两步：

1. 新增“工作流列表页”
   风格、布局、密度、操作区尽量向“我的策略”看齐，但数据先用本地 demo 数据。
2. 新增“工作流编排页”
   点击列表卡片后进入，展示真实可交互的 `xyflow` 画布与左右分区界面，支持基础节点拖拽、连接、选中和属性展示。

本次先不做：

- 工作流持久化到服务端
- 节点模板市场
- 执行引擎
- 历史版本与协作
- 节点配置表单生成器
- 真正和策略运行时联动

## Route Plan

建议新增两条路由，并保持和 `strategies` 模块一致的结构：

- `/app/workflows`
  工作流列表页
- `/app/workflows/:workflowID`
  工作流编排页

需要修改：

- `packages/strategy-front/src/routes/index.tsx`
  增加 `WorkflowsPage` 与 `WorkflowDetailPage` 的懒加载和路由声明。
- `packages/strategy-front/src/components/app-sidebar.tsx`
  增加“工作流”导航入口，位置建议放在“策略”后面，保持认知连续性。

## Data Plan

因为第一阶段明确是 demo，推荐新增一个轻量本地数据层，而不是强绑现有 `workspace` 类型。

建议新增：

- `packages/strategy-front/src/types/workflow.ts`
  定义 `WorkflowItem`、`WorkflowNodeData`、`WorkflowEdgeData`、`WorkflowDetail`。
- `packages/strategy-front/src/data/workflow-demo.ts`
  放 3 到 5 个演示工作流条目，以及 1 到 2 套默认画布数据。

数据字段建议包含：

- `id`
- `name`
- `desc`
- `status`
- `updated_at`
- `tags`
- `owner`
- `nodes`
- `edges`

这样列表页和详情页都能消费同一份 demo 源，后续如果接后端，也能较平滑替换。

## Component Plan

为避免把编排逻辑写进单文件，建议建立独立目录：

- `packages/strategy-front/src/components/workflow`

建议拆分为以下组件：

- `workflow-list.tsx`
  工作流列表卡片网格，职责对齐 `strategy-list.tsx`。
- `workflow-list-card.tsx`
  单个工作流卡片，负责标题、状态、更新时间、标签和进入按钮。
- `workflow-empty.tsx`
  空状态。
- `workflow-shell.tsx`
  编排页主体容器，负责组织左侧库、中央画布和悬浮工具条。
- `workflow-topbar.tsx`
  顶部悬浮工具条，放保存、检查、运行、导出、代码视图等动作。
- `workflow-canvas.tsx`
  `xyflow` 画布封装，集中处理 `nodes`、`edges`、`onNodesChange`、`onEdgesChange`、`onConnect`。
- `workflow-node.tsx`
  自定义节点渲染，先做 2 到 3 种 demo 节点，如 `start`、`agent`、`condition`。
- `workflow-library.tsx`
  左侧固定组件库，提供搜索、分类和组件卡片。
- `workflow-mini-toolbar.tsx`
  对 `xyflow` 角落控件做一层风格封装。
- `workflow-inspector.tsx`
  先做成可选抽屉或弹层，不作为默认常驻右栏；用于展示当前选中节点摘要。

右侧固定属性栏不再作为第一版默认布局要求。为了更贴图，属性展示优先放进节点卡片内部，或做成选中后的抽屉。

## Page Plan

### 1. 工作流列表页

建议新增：

- `packages/strategy-front/src/pages/workflows.tsx`

页面职责：

- 复用 `strategies.tsx` 的整体节奏
- 保留页面标题、说明文案、搜索框、刷新按钮、新建按钮
- 列表数据读取 `workflow-demo.ts`
- 点击卡片进入 `/app/workflows/:workflowID`

视觉建议：

- 大结构与策略页一致，降低认知跳跃
- 卡片视觉稍作区分，突出“流程编排”的特征
- 可在卡片中加入小型流程预览图标、状态徽标和节点数信息

### 2. 工作流编排页

建议新增：

- `packages/strategy-front/src/pages/workflow-detail.tsx`

页面结构建议：

- 顶部留轻量留白区
- 中间绝对主体为 `xyflow` 画布
- 左侧固定组件库贴边
- 顶部中间放悬浮工具条
- 左下角画布控制器
- 右下角 minimap

布局技术建议：

- 不强依赖 `ResizablePanelGroup`
- 详情页主体改为相对定位容器
- 左侧组件库固定宽度
- 中央画布铺满剩余空间
- 悬浮工具条、控件、minimap 通过绝对定位叠在画布层上

这样能更接近截图里的产品布局。

## XYFlow Integration Plan

需要新增依赖：

- `@xyflow/react`

接入方式建议：

1. 安装依赖
2. 在 `workflow-canvas.tsx` 中集中引入 `@xyflow/react/dist/style.css` 或项目推荐样式入口
3. 使用受控模式维护 `nodes` 与 `edges`
4. 使用 `Background`、`Controls`、`MiniMap`
5. 用 `nodeTypes` 注册自定义节点组件

第一版交互只做这些：

- 节点展示
- 拖拽移动
- 边连接
- 选中节点
- 右侧显示节点属性
- 画布缩放与居中
- minimap
- 左侧组件项点击插入节点

节点交互第一版建议以“点击插入”为主，拖拽插入可放在第二轮；这样能更快稳定出 demo。

不建议第一版就做：

- 拖入新增节点
- 复杂校验
- 自动布局算法
- 撤销重做

## Styling Plan

风格上要遵循当前 `strategy-front` 的 Tailwind 和 shadcn 体系，建议规则如下：

- 全部颜色使用语义 token，如 `bg-background`、`text-foreground`、`border-border`
- 自定义强调色只用于节点类型区分，不改全局主题
- 容器圆角沿用当前页面的 `rounded-xl` 到 `rounded-[24px]`
- 面板、工具栏、卡片全部基于 `Card`、`Button`、`Input`、`Badge` 风格语言组合
- 右侧属性区优先使用 `Tabs`、`ScrollArea`、`Separator`、`Input`、`Textarea` 等 shadcn 组件
- 节点 UI 保持克制，避免脱离现有系统形成另一套视觉
- 画布背景使用浅灰点阵，贴近截图观感
- 顶部工具条使用圆角胶囊形浮层，弱阴影，居中悬浮
- 左侧组件库采用白底面板，不做过重描边
- minimap 和 controls 统一做轻量边框与白底卡片感

节点建议样式：

- `placeholder` 节点：接近截图左侧那张“未实现组件”的空白卡片
- `finance` 节点：接近截图右侧那张“财务数据”表单卡片
- `source` 节点：作为左侧库中的基础数据源卡片
- `condition` 节点：作为后续扩展节点，首版可先不放到初始 demo 中

这样既能区分角色，又不会和整个站点风格割裂。

## File Plan

建议新增文件：

- `packages/strategy-front/src/pages/workflows.tsx`
- `packages/strategy-front/src/pages/workflow-detail.tsx`
- `packages/strategy-front/src/types/workflow.ts`
- `packages/strategy-front/src/data/workflow-demo.ts`
- `packages/strategy-front/src/components/workflow/workflow-list.tsx`
- `packages/strategy-front/src/components/workflow/workflow-list-card.tsx`
- `packages/strategy-front/src/components/workflow/workflow-empty.tsx`
- `packages/strategy-front/src/components/workflow/workflow-shell.tsx`
- `packages/strategy-front/src/components/workflow/workflow-topbar.tsx`
- `packages/strategy-front/src/components/workflow/workflow-canvas.tsx`
- `packages/strategy-front/src/components/workflow/workflow-node.tsx`
- `packages/strategy-front/src/components/workflow/workflow-library.tsx`
- `packages/strategy-front/src/components/workflow/workflow-mini-toolbar.tsx`
- `packages/strategy-front/src/components/workflow/workflow-inspector.tsx`

建议修改文件：

- `packages/strategy-front/package.json`
- `packages/strategy-front/src/routes/index.tsx`
- `packages/strategy-front/src/components/app-sidebar.tsx`

## Execution Steps

### Task 1: 接入依赖与路由骨架

**Files:**
- Modify: `packages/strategy-front/package.json`
- Modify: `packages/strategy-front/src/routes/index.tsx`
- Modify: `packages/strategy-front/src/components/app-sidebar.tsx`

**Steps:**

1. 安装 `@xyflow/react`
2. 在路由文件中增加 `workflows` 模块
3. 在侧边栏增加“工作流”入口
4. 先让两个新路由能正常打开占位页

### Task 2: 建立 workflow 类型与 demo 数据

**Files:**
- Create: `packages/strategy-front/src/types/workflow.ts`
- Create: `packages/strategy-front/src/data/workflow-demo.ts`

**Steps:**

1. 定义列表与详情共用类型
2. 准备列表页 demo 数据
3. 准备至少一套可用于 `xyflow` 的 `nodes` 和 `edges`

### Task 3: 完成工作流列表页

**Files:**
- Create: `packages/strategy-front/src/pages/workflows.tsx`
- Create: `packages/strategy-front/src/components/workflow/workflow-list.tsx`
- Create: `packages/strategy-front/src/components/workflow/workflow-list-card.tsx`
- Create: `packages/strategy-front/src/components/workflow/workflow-empty.tsx`

**Steps:**

1. 复刻策略页的页头结构和搜索体验
2. 渲染工作流卡片网格
3. 支持搜索过滤
4. 点击卡片跳转到编排页

### Task 4: 搭建贴近截图的编排页外壳

**Files:**
- Create: `packages/strategy-front/src/pages/workflow-detail.tsx`
- Create: `packages/strategy-front/src/components/workflow/workflow-shell.tsx`
- Create: `packages/strategy-front/src/components/workflow/workflow-topbar.tsx`
- Create: `packages/strategy-front/src/components/workflow/workflow-library.tsx`

**Steps:**

1. 建立左侧固定库 + 中央画布的主结构
2. 顶部添加悬浮胶囊工具条
3. 预留 minimap 与 controls 的角落区域
4. 保证窄屏下左库可折叠

### Task 5: 集成 xyflow 画布

**Files:**
- Create: `packages/strategy-front/src/components/workflow/workflow-canvas.tsx`
- Create: `packages/strategy-front/src/components/workflow/workflow-node.tsx`
- Create: `packages/strategy-front/src/components/workflow/workflow-mini-toolbar.tsx`

**Steps:**

1. 建立受控 `nodes` / `edges`
2. 注册自定义节点
3. 实现连接、选中、缩放和居中
4. 加入 `Background`、`Controls`、`MiniMap`

### Task 6: 完成节点库与轻量属性查看

**Files:**
- Create: `packages/strategy-front/src/components/workflow/workflow-inspector.tsx`

**Steps:**

1. 左侧展示 demo 节点模板
2. 节点选中时展示轻量摘要信息
3. 为第二阶段真实配置编辑预留抽屉或弹层位

### Task 7: 联调与验证

**Files:**
- Modify: touched files as needed

**Steps:**

1. 运行 `bun typecheck` 于 `packages/strategy-front`
2. 运行 `bun build` 于 `packages/strategy-front`
3. 检查路由跳转、列表页渲染、画布交互、暗色模式
4. 做一次窄屏检查，确保分栏不会崩

## Acceptance Criteria

满足以下条件即可认为第一版达标：

- 侧边栏出现“工作流”入口
- `/app/workflows` 能看到与“我的策略”风格接近的 demo 列表页
- 点击列表项可进入 `/app/workflows/:workflowID`
- 编排页中间是可操作的 `xyflow` 画布
- 编排页整体布局接近参考截图
- 左侧有可搜索的组件库
- 顶部有居中悬浮工具条
- 左下有 controls，右下有 minimap
- 至少有 2 到 3 个 demo 节点类型
- 至少有一个“表单型节点”外观接近截图
- 节点可选中，并能展示对应信息
- 页面风格与现有 Tailwind/shadcn 系统一致
- 组件拆分清晰，不把画布、列表、侧栏、顶栏混写在同一文件

## Risks And Notes

- 当前对“类似图片那种”的理解，只能先按通用工作流编排界面处理，因为这轮对话里没有实际图片附件。
- 如果你后续补图，我建议在实现前微调节点外观、面板布局和工具栏密度，以便更贴近目标视觉。
- 因为第一步是 demo，列表页与详情页都不建议接入真实后端，否则会把节奏从“做出正确界面骨架”拉到“做全链路产品”。
- 如果后面要复用“策略工作区”概念做工作流和策略联动，第二阶段可以再讨论是否把工作流挂到 `workspace` 维度。
