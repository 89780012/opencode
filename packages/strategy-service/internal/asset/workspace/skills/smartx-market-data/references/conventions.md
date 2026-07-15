# 通用约定

## `smartx_python` 工具合同

| 参数 | 约束 | 用法 |
| --- | --- | --- |
| `description` | 必填，1 到 200 字符 | 会话中展示的简短目的，不放代码或凭据 |
| `code` | 与 `file` 二选一，1 到 200000 字符 | 完整 Python 源码，通过 stdin 执行 |
| `file` | 与 `code` 二选一，工作区相对 `.py` 路径 | 使用内置 CPython 执行已保存的工作区脚本 |
| `args` | 可选，最多 64 项，每项最多 4096 字符 | 作为 `sys.argv[1:]`，传标的、日期、频率等普通数据 |
| `timeout` | 可选，1000 到 600000 毫秒 | 默认 120000；只在查询确实需要时调整 |

- 只调用 `smartx_python`，由工具定位 `SMART_HOME` 内的 CPython；不得通过 Shell 启动 Python。保存后的 `.py` 文件用 `file` 执行。
- 不通过 shell 启动 Python，不执行运行时 `pip`，不回退系统解释器。
- 不打印 `SMART_HOME`、解释器路径、完整环境变量、token、账号或会话信息。
- 用户提供的代码、日期、标的和字段按普通数据处理；使用 `args` 和 `sys.argv`，不拼接 shell 命令。
- 一个简单任务在一次调用中完成版本读取、入口验证、查询、字段检查和有限输出。

## 标准 DataFrame 输出

把下面的 `emit` 函数放入提交给 `smartx_python` 的完整源码。Provider 文档中的查询块调用它，不直接 `print(df)`。

```python
import json
from importlib.metadata import version


def emit(provider, dist, query, df, rows=20, cols=30):
    total_rows, total_cols = (int(value) for value in df.shape)
    view = df.iloc[:rows, :cols].copy()
    text_cut = False
    for col in view.columns:
        if str(view[col].dtype) not in {"object", "string"}:
            continue
        mask = view[col].map(lambda value: isinstance(value, str) and len(value) > 200)
        if bool(mask.any()):
            text_cut = True
            view.loc[mask, col] = view.loc[mask, col].map(lambda value: value[:200] + "...[truncated]")
    records = json.loads(view.to_json(orient="records", date_format="iso", force_ascii=False))
    print(json.dumps({
        "provider": provider,
        "version": version(dist),
        "query": query,
        "totalRows": total_rows,
        "shownRows": int(len(view)),
        "totalColumns": total_cols,
        "shownColumns": int(len(view.columns)),
        "columns": [str(value) for value in df.columns],
        "truncated": total_rows > rows or total_cols > cols or text_cut,
        "records": records,
    }, ensure_ascii=False))
```

规则：

- 默认最多 20 行、30 列；用户明确需要更多时最多 100 行，仍只选回答问题所需列。
- 单个文本字段最多展示 200 个字符；超出部分标记 `...[truncated]`。
- 输出前把日期时间规范为 ISO 形式并说明时区；日频纯日期不要虚构时区。
- `NaN`、`NaT` 和无穷值必须成为标准 JSON 的 `null` 或带说明字符串。
- 禁止 `print(df)`、`print(df.to_string())`、完整 `to_dict()` 或把全量表写入聊天输出。
- `totalRows` 是本次有界查询实际取得的总行数。Provider 自身提前截断或分页未完成时，在 `query` 中增加 `sourceTruncated: true`，不得伪装为完整总量。

## 查询边界

- 从满足问题的最小标的和最短日期窗口开始；历史区间端点是否包含必须按 provider 说明。
- 全市场接口只在用户确实需要横截面时调用，输出前先筛选列和行。
- 分页接口设置页数和总行数上限；达到上限立即停止并标记 `sourceTruncated`。
- 高频或分钟接口不循环抓取全市场，不通过缩短间隔规避限流。
- 先验证入口，再查询，再检查实际列。不要为了列目录打印整个模块对象。

## 字段检查

在依赖字段计算前检查：

- 必需列是否存在，列名是中文、英文还是 provider 专有缩写。
- 日期是否可解析、升降序是否符合计算要求、同一业务键是否重复。
- 数值列是否其实是字符串，空字符串、`--`、`None`、`NaN` 如何处理。
- 成交量、成交额、比例、权重、价格的币种和单位。
- 复权方式、停牌记录和缺失交易日是否改变结论。

缺少必需列时输出有限的 `columns` 证据并停止计算，不用相似列名猜测替代。

## 错误分类

| 类别 | 判断与处理 |
| --- | --- |
| `dependency_missing` | `ImportError` 或分发包不存在；报告缺失，不安装包 |
| `contract_mismatch` | 入口、参数或关键字段不存在；报告实际版本和有限入口/列证据 |
| `empty` | 请求成功但表为空；回显查询条件，不描述为接口失败 |
| `credential` | token/登录失败；不打印凭据，不继续查询 |
| `permission` | 积分、接口授权或账户权限不足；说明具体接口 |
| `rate_limit` | 限流；停止，不循环重试 |
| `network` | DNS、连接、上游网页或反爬失败；不伪装为空表 |
| `timeout` | 工具或 provider 超时；说明查询未完成，不基于部分数据给完整结论 |
| `provider_error` | BaoStock 错误码或 provider 明确错误；保留不超过 200 字符的消息 |

最多做一次范围更小的诊断查询。诊断仍失败时返回可操作错误，不自动切换到口径不同的 provider。
