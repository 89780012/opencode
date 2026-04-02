# JS 量化策略脚手架

这是一个给 AI 和开发者共用的 JavaScript 量化策略骨架模板。

它的目标不是预置某种具体策略，而是先把目录结构、模块职责和入口流程定好，让后续实现可以根据创建工作区时选择的条件落到固定位置。

## 入口

- 入口文件：`index.js`

## 目录结构

```text
js_basic/
|- index.js
|- package.json
|- config.js
|- docs/
|  |- strategy.md
|  \- backtest.md
|- indicators/
|  \- factors.js
|- signals/
|  |- filter.js
|  |- entry.js
|  \- exit.js
|- risk/
|  |- constraints.js
|  \- position.js
|- backtest/
|  \- engine.js
\- README.md
```

## 与创建表单的对应关系

- 市场信息：`config.js`
  包含 `market`、`pool`、`tf`、`side`、`hold`
- 指标与因子：`indicators/factors.js`
- 过滤条件：`signals/filter.js`
- 入场规则：`signals/entry.js`
- 出场规则：`signals/exit.js`
- 风控约束：`risk/constraints.js`
- 仓位方式：`risk/position.js`
- 回测验证：`backtest/engine.js`
- 输出文档：`docs/strategy.md`、`docs/backtest.md`

## 文件职责

- `index.js`：串联整体流程，只负责编排，不写死策略细节
- `config.js`：保存策略条件、参数和基础数据入口
- `docs/strategy.md`：沉淀策略说明、风险说明、参数说明
- `docs/backtest.md`：沉淀回测口径、结果记录、优化建议
- `indicators/factors.js`：根据指标/因子配置计算中间特征
- `signals/filter.js`：处理时间、流动性、市场环境等过滤逻辑
- `signals/entry.js`：生成入场信号
- `signals/exit.js`：生成出场信号
- `risk/constraints.js`：做交易前风险检查
- `risk/position.js`：输出仓位大小
- `backtest/engine.js`：回测主循环

## 当前模板原则

- 目录结构完整
- 模块边界明确
- 默认实现尽量留空或最小占位
- 不提前写死某种均线、突破或反转策略
- 入口层和文档层分开，方便 AI 边实现边补说明

## 运行方式

```bash
node index.js
```

## 推荐后续补强顺序

1. 在 `config.js` 填入真实策略条件和参数
2. 在 `indicators/factors.js` 实现指标或因子计算
3. 在 `signals` 目录实现过滤、入场、出场规则
4. 在 `risk` 目录补全仓位和风控
5. 在 `backtest/engine.js` 接入真实回测逻辑
