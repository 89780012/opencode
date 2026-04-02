# SmartX Python 插件模板

这是一个完整的 SmartX 插件工程模板。

## 入口

- 策略入口：`start.py`
- 前端入口：`src/index.js`
- 前端页面模板：`src/index.ejs`

## 目录结构

```text
plugin_python/
|- start.py
|- package.json
|- build.js
|- webpack.config.js
|- index.html
|- index.js
|- src/
|  |- index.js
|  |- index.ejs
|  \- js/
|     |- App.vue
|     |- DealTable.vue
|     |- EntrustTable.vue
|     \- LogTable.vue
|- fonts/
|- imgs/
|- .vscode/
|  \- launch.json
\- README.md
```

## 文件说明

- `start.py`：SmartX 策略生命周期入口，包含订阅、回调和下单示例
- `package.json`：插件元数据与前端构建配置
- `build.js`：构建辅助脚本
- `webpack.config.js`：前端打包配置
- `src/index.js`：前端启动入口
- `src/index.ejs`：插件页面模板
- `src/js/App.vue`：前端根组件
- `src/js/DealTable.vue`：成交列表视图
- `src/js/EntrustTable.vue`：委托列表视图
- `src/js/LogTable.vue`：运行日志视图

## 下一步建议

- 把 `start.py` 里的示例逻辑替换成真实策略
- 把指标、信号和风控逻辑拆到独立 Python 模块里
- 按需要扩展 Vue 面板，增加监控和控制能力
- 让 `start.py` 保持 SmartX 运行时适配层，策略逻辑尽量沉淀到可复用文件中

## 注意

- 如果修改了 vue 文件内的文件，请运行 `npm run build` 重新构建
