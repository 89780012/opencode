# strategy-es

基于 Go + Elasticsearch 的最小知识库服务。

## 能力

- 启动时自动检查并创建索引
- 写入知识条目：`title` + `value`
- 根据标题检索高命中结果
- 返回命中的 `value` 列表，适合做大模型召回前置

## 环境变量

```bash
ES_ADDR=http://127.0.0.1:9200
ES_INDEX=knowledge
ES_USER=
ES_PASS=
ES_TIMEOUT=5s
ES_INSECURE=false
HTTP_HOST=127.0.0.1
HTTP_PORT=8080
```

## 启动

```bash
cd packages/strategy-es
go run ./cmd/strategy-es
```

## 接口

健康检查：

```bash
curl http://127.0.0.1:8080/api/health
```

写入文档：

```bash
curl -X POST http://127.0.0.1:8080/api/docs/upsert \
  -H "Content-Type: application/json" \
  -d '{"title":"退货规则","value":"7天无理由退货，特殊商品除外"}'
```

标题检索：

```bash
curl -X POST http://127.0.0.1:8080/api/search \
  -H "Content-Type: application/json" \
  -d '{"title":"退货政策","size":3}'
```
