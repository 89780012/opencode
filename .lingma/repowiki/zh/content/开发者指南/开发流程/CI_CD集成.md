# CI/CD集成

<cite>
**本文引用的文件**
- [.github/actions/setup-bun/action.yml](file://.github/actions/setup-bun/action.yml)
- [.github/actions/setup-git-committer/action.yml](file://.github/actions/setup-git-committer/action.yml)
- [.github/publish-python-sdk.yml](file://.github/publish-python-sdk.yml)
- [package.json](file://package.json)
- [turbo.json](file://turbo.json)
- [script/version.ts](file://script/version.ts)
- [script/changelog.ts](file://script/changelog.ts)
- [script/publish.ts](file://script/publish.ts)
</cite>

## 目录
1. [简介](#简介)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构总览](#架构总览)
5. [详细组件分析](#详细组件分析)
6. [依赖关系分析](#依赖关系分析)
7. [性能考虑](#性能考虑)
8. [故障排除指南](#故障排除指南)
9. [结论](#结论)
10. [附录](#附录)

## 简介
本文件系统性说明 OpenCode 项目的持续集成与持续部署（CI/CD）流程，重点覆盖以下方面：
- GitHub Actions 工作流配置：代码检查、测试运行、构建打包等自动化任务
- 多平台构建流程与发布策略
- 代码质量检查、安全扫描与依赖更新自动化
- 发布流程：版本号管理、变更日志生成与包发布步骤
- CI/CD 故障排除指南与常见问题解决方案

## 项目结构
OpenCode 采用 Monorepo 架构，使用 Turbo 作为任务编排工具，结合 GitHub Actions 实现跨平台 CI/CD。关键配置与脚本分布如下：
- GitHub Actions 自定义 Action：环境准备、Git 提交者配置
- 根级包管理与工作区配置：统一的包管理器与工作区声明
- 发布脚本：版本号管理、变更日志生成、多包发布与 Git 标签推送
- Turbo 任务定义：类型检查、构建、测试任务及其依赖关系

```mermaid
graph TB
subgraph "根目录"
PJ["package.json<br/>工作区与脚本"]
TJ["turbo.json<br/>任务定义"]
end
subgraph "GitHub Actions"
AB["setup-bun/action.yml<br/>复合动作"]
GC["setup-git-committer/action.yml<br/>复合动作"]
PS["publish-python-sdk.yml<br/>Python SDK 发布(示例)"]
end
subgraph "发布脚本"
SV["script/version.ts<br/>版本与发布"]
SC["script/changelog.ts<br/>变更日志生成"]
SP["script/publish.ts<br/>多包发布"]
end
PJ --> TJ
PJ --> SV
SV --> SC
SV --> SP
AB --> PJ
GC --> PJ
PS --> PJ
```

图表来源
- [package.json:1-118](file://package.json#L1-L118)
- [turbo.json:1-21](file://turbo.json#L1-L21)
- [.github/actions/setup-bun/action.yml:1-46](file://.github/actions/setup-bun/action.yml#L1-L46)
- [.github/actions/setup-git-committer/action.yml:1-44](file://.github/actions/setup-git-committer/action.yml#L1-L44)
- [.github/publish-python-sdk.yml:1-72](file://.github/publish-python-sdk.yml#L1-L72)
- [script/version.ts:1-35](file://script/version.ts#L1-L35)
- [script/changelog.ts:1-307](file://script/changelog.ts#L1-L307)
- [script/publish.ts:1-87](file://script/publish.ts#L1-L87)

章节来源
- [package.json:1-118](file://package.json#L1-L118)
- [turbo.json:1-21](file://turbo.json#L1-L21)

## 核心组件
- GitHub Actions 复合动作
  - setup-bun：自动解析并安装与 package.json 对应的 Bun 版本，缓存依赖，安装 setuptools 并执行依赖安装
  - setup-git-committer：基于 GitHub App 私钥创建访问令牌，配置 Git 用户信息与远程认证，确保后续提交与推送可用
- 发布脚本体系
  - version.ts：根据当前脚本版本决定是否创建草稿发布，生成变更日志并写入临时文件，调用 gh CLI 创建发布，输出 release 与 tag 信息
  - changelog.ts：从 GitHub API 拉取比较数据，过滤无效提交，按模块分组生成变更日志，支持 AI 摘要与回退到原始提交摘要
  - publish.ts：批量更新各包版本、扩展插件版本与下载链接、重新安装依赖、触发 SDK 构建，最终在正式发布时提交标签、推送并取消草稿状态

章节来源
- [.github/actions/setup-bun/action.yml:1-46](file://.github/actions/setup-bun/action.yml#L1-L46)
- [.github/actions/setup-git-committer/action.yml:1-44](file://.github/actions/setup-git-committer/action.yml#L1-L44)
- [script/version.ts:1-35](file://script/version.ts#L1-L35)
- [script/changelog.ts:1-307](file://script/changelog.ts#L1-L307)
- [script/publish.ts:1-87](file://script/publish.ts#L1-L87)

## 架构总览
下图展示从版本决策到多包发布的端到端流程，以及与 GitHub Actions 的交互。

```mermaid
sequenceDiagram
participant Dev as "开发者/CI 触发"
participant GH as "GitHub"
participant Act as "Actions 工作流"
participant Bun as "Bun 环境"
participant Ver as "version.ts"
participant Clg as "changelog.ts"
participant Pub as "publish.ts"
Dev->>GH : 推送/创建标签或手动触发
GH->>Act : 启动工作流
Act->>Bun : 使用 setup-bun 安装并缓存依赖
Act->>Ver : 执行版本与发布决策
Ver->>Clg : 生成变更日志(草稿发布)
Clg-->>Ver : 返回变更日志内容
Ver->>GH : 调用 gh CLI 创建/编辑发布
Act->>Pub : 执行多包发布流程
Pub->>Pub : 更新各包版本/扩展版本/下载链接
Pub->>Bun : 重新安装依赖并构建 SDK
Pub->>GH : 推送标签/分支并取消草稿
GH-->>Dev : 发布完成通知
```

图表来源
- [.github/actions/setup-bun/action.yml:1-46](file://.github/actions/setup-bun/action.yml#L1-L46)
- [script/version.ts:1-35](file://script/version.ts#L1-L35)
- [script/changelog.ts:1-307](file://script/changelog.ts#L1-L307)
- [script/publish.ts:1-87](file://script/publish.ts#L1-L87)

## 详细组件分析

### 组件A：GitHub Actions 复合动作
- setup-bun 动作
  - 解析 package.json 中的 packageManager 字段确定 Bun 版本
  - 根据运行器架构与操作系统拼接基准下载地址
  - 使用 oven-sh/setup-bun@v2 安装指定版本
  - 通过 actions/cache 缓存 Bun 依赖目录，键值基于 bun.lock
  - 安装 setuptools 以兼容某些 Python 工具链，随后执行 bun install
- setup-git-committer 动作
  - 使用 actions/create-github-app-token@v2 基于 App ID 与私钥生成访问令牌
  - 配置全局 Git 用户名与邮箱为 App slug bot
  - 清理本地额外的 HTTP 头部认证，设置 origin 远程为 https://x-access-token:...@github.com/...

```mermaid
flowchart TD
Start(["开始"]) --> ParsePkg["读取 package.json<br/>解析 packageManager"]
ParsePkg --> DetectArch["检测 RUNNER_OS/RUNNER_ARCH"]
DetectArch --> SetURL["拼接基准下载地址"]
SetURL --> InstallBun["安装指定版本的 Bun"]
InstallBun --> CacheDeps["计算缓存目录并缓存依赖"]
CacheDeps --> InstallPy["安装 setuptools"]
InstallPy --> InstallAll["执行 bun install"]
InstallAll --> Done(["结束"])
```

图表来源
- [.github/actions/setup-bun/action.yml:1-46](file://.github/actions/setup-bun/action.yml#L1-L46)

章节来源
- [.github/actions/setup-bun/action.yml:1-46](file://.github/actions/setup-bun/action.yml#L1-L46)
- [.github/actions/setup-git-committer/action.yml:1-44](file://.github/actions/setup-git-committer/action.yml#L1-L44)

### 组件B：发布脚本体系
- version.ts
  - 输出当前脚本版本到 GITHUB_OUTPUT
  - 非预发行时：获取最新发布版本，生成变更日志并写入临时文件，调用 gh CLI 创建草稿发布，输出 release 与 tag
  - 预发行通道为 beta：直接创建草稿发布并返回对应元数据
  - 输出仓库信息用于后续步骤
- changelog.ts
  - 从 GitHub API 拉取两次提交间的比较数据，提取提交哈希、作者与消息
  - 仅统计涉及特定包路径的提交，过滤掉忽略类前缀的提交
  - 将文件变更映射到模块区域（core/TUI/Desktop/SDK/Extensions/GitHub），按优先级选择分组
  - 使用 AI 会话对提交进行摘要，若超时则回退到原始提交摘要
  - 收集贡献者并生成致谢列表
- publish.ts
  - 批量替换所有 package.json 的 version 字段为当前版本
  - 更新扩展插件的 extension.toml 版本与下载链接中的版本占位符
  - 重新安装依赖并触发 SDK 构建脚本
  - 在正式发布时执行 git commit/tag/fetch/cherry-pick/push，并等待片刻后取消草稿状态

```mermaid
flowchart TD
VStart(["version.ts 入口"]) --> CheckPreview{"是否预发行?"}
CheckPreview --> |否| GetPrev["获取上一个正式发布版本"]
GetPrev --> BuildNotes["生成变更日志(草稿)"]
BuildNotes --> CreateDraft["gh CLI 创建草稿发布"]
CreateDraft --> OutMeta["输出 release/tag/repo"]
CheckPreview --> |是 且 通道为 beta| CreateBeta["gh CLI 创建 beta 草稿发布"]
CreateBeta --> OutMeta
OutMeta --> EndV(["结束"])
subgraph "changelog.ts"
C1["拉取比较数据"] --> C2["过滤无效提交"]
C2 --> C3["映射模块区域"]
C3 --> C4{"AI 摘要成功?"}
C4 --> |是| C5["并行摘要(批大小=10)"]
C4 --> |否| C6["回退到原始提交摘要"]
C5 --> C7["按模块分组并生成"]
C6 --> C7
C7 --> C8["收集贡献者并生成致谢"]
end
```

图表来源
- [script/version.ts:1-35](file://script/version.ts#L1-L35)
- [script/changelog.ts:1-307](file://script/changelog.ts#L1-L307)

章节来源
- [script/version.ts:1-35](file://script/version.ts#L1-L35)
- [script/changelog.ts:1-307](file://script/changelog.ts#L1-L307)
- [script/publish.ts:1-87](file://script/publish.ts#L1-L87)

### 组件C：多平台构建与发布策略
- 构建与缓存
  - setup-bun 动作在不同操作系统与架构下自动选择合适的下载源，确保一致的 Bun 版本与缓存命中
  - 通过 actions/cache 缓存 Bun 依赖目录，显著缩短后续构建时间
- 发布策略
  - 预发行与正式发布区分：预发行直接创建草稿；正式发布先生成变更日志，再创建草稿，最后取消草稿
  - 多包版本同步：批量更新各包 version 字段，确保版本一致性
  - 扩展插件版本与下载链接：更新 extension.toml 中的版本与下载路径，保证用户可正确获取新版本
  - Git 流程：在正式发布时提交标签、推送并进行必要的 cherry-pick，保持主干与开发分支同步

```mermaid
sequenceDiagram
participant CI as "CI 作业"
participant SB as "setup-bun"
participant VP as "version.ts"
participant CL as "changelog.ts"
participant PP as "publish.ts"
CI->>SB : 安装并缓存 Bun 依赖
CI->>VP : 决策版本与发布状态
VP->>CL : 生成变更日志
CL-->>VP : 返回变更日志
VP->>CI : 创建/编辑发布
CI->>PP : 批量更新版本/构建 SDK
PP->>CI : 推送标签/取消草稿
```

图表来源
- [.github/actions/setup-bun/action.yml:1-46](file://.github/actions/setup-bun/action.yml#L1-L46)
- [script/version.ts:1-35](file://script/version.ts#L1-L35)
- [script/changelog.ts:1-307](file://script/changelog.ts#L1-L307)
- [script/publish.ts:1-87](file://script/publish.ts#L1-L87)

章节来源
- [.github/actions/setup-bun/action.yml:1-46](file://.github/actions/setup-bun/action.yml#L1-L46)
- [script/publish.ts:1-87](file://script/publish.ts#L1-L87)

### 组件D：代码质量检查、安全扫描与依赖更新自动化
- 代码质量检查
  - 类型检查：通过 turbo.json 声明 typecheck 任务，可在 CI 中统一执行
  - 代码格式化与静态检查：结合 Husky 预提交钩子与 Prettier 配置，确保提交前的质量门槛
- 安全扫描
  - 依赖漏洞扫描：建议在 CI 中集成 SCA 工具（如 npm audit、osv-scanner 或企业级工具），在 PR 与主干构建中执行
  - 供应链安全：通过 trustedDependencies 与 overrides 控制关键依赖版本，减少供应链风险
- 依赖更新自动化
  - 依赖更新策略：建议引入 Dependabot 或 Renovate，在 PR 中自动创建依赖更新 PR，并在通过测试后合并
  - 版本锁定：使用 Bun 的 lock 文件与缓存机制，确保 CI 与本地环境一致

章节来源
- [package.json:1-118](file://package.json#L1-L118)
- [turbo.json:1-21](file://turbo.json#L1-L21)

### 组件E：发布流程文档（版本号管理、变更日志与包发布）
- 版本号管理
  - 由脚本层统一维护版本号，version.ts 输出到 GITHUB_OUTPUT，供后续步骤使用
  - 预发行与正式发布分别处理：预发行创建草稿，正式发布先生成变更日志再取消草稿
- 变更日志生成
  - changelog.ts 从 GitHub API 拉取两次提交间的变更，过滤无效提交，按模块分组并生成摘要
  - 支持 AI 摘要与回退逻辑，确保即使网络或服务异常也能产出可用日志
- 包发布步骤
  - publish.ts 批量更新各包版本、扩展插件版本与下载链接
  - 重新安装依赖并触发 SDK 构建
  - 正式发布时提交标签、推送并取消草稿状态

```mermaid
flowchart TD
RStart(["发布入口"]) --> Decide{"预发行还是正式发布?"}
Decide --> |预发行| DraftBeta["创建 beta 草稿发布"]
Decide --> |正式发布| GenNotes["生成变更日志"]
GenNotes --> CreateDraft["创建正式草稿发布"]
CreateDraft --> Publish["批量更新版本/构建/推送"]
Publish --> CancelDraft["取消草稿并完成发布"]
DraftBeta --> EndR(["结束"])
CancelDraft --> EndR
```

图表来源
- [script/version.ts:1-35](file://script/version.ts#L1-L35)
- [script/changelog.ts:1-307](file://script/changelog.ts#L1-L307)
- [script/publish.ts:1-87](file://script/publish.ts#L1-L87)

章节来源
- [script/version.ts:1-35](file://script/version.ts#L1-L35)
- [script/changelog.ts:1-307](file://script/changelog.ts#L1-L307)
- [script/publish.ts:1-87](file://script/publish.ts#L1-L87)

## 依赖关系分析
- 任务耦合与依赖
  - turbo.json 定义了 typecheck、build、测试任务及其依赖关系，确保构建顺序与缓存命中
  - 发布脚本之间存在明确的先后顺序：version.ts → changelog.ts → publish.ts
- 外部依赖与集成点
  - GitHub CLI（gh）用于创建/编辑/查看发布
  - GitHub App 令牌用于配置 Git 提交者身份与远程认证
  - Bun 作为包管理器与构建工具，配合缓存提升效率

```mermaid
graph LR
PJ["package.json"] --> TJ["turbo.json"]
PJ --> SV["script/version.ts"]
SV --> SC["script/changelog.ts"]
SV --> SP["script/publish.ts"]
AB["setup-bun/action.yml"] --> PJ
GC["setup-git-committer/action.yml"] --> PJ
PS["publish-python-sdk.yml"] --> PJ
```

图表来源
- [package.json:1-118](file://package.json#L1-L118)
- [turbo.json:1-21](file://turbo.json#L1-L21)
- [script/version.ts:1-35](file://script/version.ts#L1-L35)
- [script/changelog.ts:1-307](file://script/changelog.ts#L1-L307)
- [script/publish.ts:1-87](file://script/publish.ts#L1-L87)
- [.github/actions/setup-bun/action.yml:1-46](file://.github/actions/setup-bun/action.yml#L1-L46)
- [.github/actions/setup-git-committer/action.yml:1-44](file://.github/actions/setup-git-committer/action.yml#L1-L44)
- [.github/publish-python-sdk.yml:1-72](file://.github/publish-python-sdk.yml#L1-L72)

章节来源
- [package.json:1-118](file://package.json#L1-L118)
- [turbo.json:1-21](file://turbo.json#L1-L21)

## 性能考虑
- 依赖缓存
  - 使用 actions/cache 缓存 Bun 依赖目录，键值基于 bun.lock，显著降低重复安装时间
- 并行与批处理
  - changelog.ts 对 AI 摘要采用批处理（批大小=10），在保证吞吐的同时控制并发
- 构建优化
  - 通过 Turbo 任务定义与输出缓存，减少重复构建
- 网络与超时
  - AI 摘要设置超时保护，避免长时间阻塞 CI

## 故障排除指南
- Bun 安装失败或版本不匹配
  - 检查 package.json 中的 packageManager 字段与 setup-bun 动作解析逻辑
  - 确认 RUNNER_OS/RUNNER_ARCH 与基准下载地址拼接结果
- 依赖缓存未命中
  - 确认 bun.lock 变更导致的哈希变化
  - 检查 actions/cache 的 key/restore-keys 是否正确
- Git 提交者配置失败
  - 确认 GitHub App ID 与私钥配置正确
  - 检查远程 URL 是否已替换为带令牌的 https 地址
- 变更日志生成失败
  - 若 AI 摘要超时，脚本会回退到原始提交摘要；可检查网络连通性与服务可用性
  - 确认 GitHub API 权限与比较范围参数
- 发布流程中断
  - 检查 gh CLI 的权限与仓库可见性
  - 确认正式发布时的标签推送与 cherry-pick 流程是否成功

章节来源
- [.github/actions/setup-bun/action.yml:1-46](file://.github/actions/setup-bun/action.yml#L1-L46)
- [.github/actions/setup-git-committer/action.yml:1-44](file://.github/actions/setup-git-committer/action.yml#L1-L44)
- [script/changelog.ts:1-307](file://script/changelog.ts#L1-L307)
- [script/publish.ts:1-87](file://script/publish.ts#L1-L87)

## 结论
OpenCode 的 CI/CD 体系以 GitHub Actions 与自定义复合动作为基础，结合版本与变更日志脚本，实现了从环境准备、构建打包到多包发布的完整自动化流程。通过缓存与批处理优化，兼顾了性能与稳定性；通过预发行与正式发布的差异化策略，保障了发布质量与可控性。建议在现有基础上补充安全扫描与依赖更新自动化，进一步完善整体质量保障闭环。

## 附录
- 相关文件索引
  - GitHub Actions 复合动作：setup-bun、setup-git-committer
  - 发布脚本：version.ts、changelog.ts、publish.ts
  - 任务编排：turbo.json
  - 包管理：package.json