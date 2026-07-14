export type BacktestConfig = {
  startTime: string
  endTime: string
  cash: number //初始资金
  shStockSx: number //沪市交易手续费
  shStockMinSx: number //沪市最低手续费
  szStockSx: number //深市交易手续费
  szStockMinSx: number //深市最低手续费
  shStockGh: number //沪市过户费
  szStockGh: number //深市过户费
  buyYh: number //买入印花费
  sellYh: number //卖出印花费
  rf: number //无风险利率
  slippage: number //滑点
  isTickMode: boolean //快照行情多选框
  useNewPrice: boolean //现价成交多选框
  interval: "1d" | "1m" //K线周期
  closeLog: boolean //是否关闭日志
}

export type BacktestRun = {
  id: string
  workspacePath: string
  sessionId: string
  pluginId: string
  btId: string //回测ID
  status: "pending" | "running" | "done" | "failed"
  statusCode: number
  progress: number
  config: BacktestConfig
  result: Record<string, unknown>
  summary: Record<string, unknown>
  dataFiles: Record<string, unknown>
  logPath: string
  error: string
  requestKey: string
  revision: number
  startedAt: number
  finishedAt: number
  updatedAt: number
}

export type BacktestList = {
  workspacePath: string
  sessionId?: string
  runs: BacktestRun[]
}

export type BacktestRunInput = {
  workspacePath: string
  sessionId: string
  pluginId: string
  requestKey: string
  config?: BacktestConfig
}

export type BacktestUpdate = {
  id: string
  workspacePath: string
  sessionId: string
  status: BacktestRun["status"]
  statusCode: number
  progress: number
  error: string
  revision: number
  updatedAt: number
  hasResult: boolean
}

export type BacktestBrief = Pick<
  BacktestRun,
  "id" | "workspacePath" | "sessionId" | "status" | "progress" | "revision"
>

export type BacktestToolResult =
  | {
      version: 1
      accepted: true
      reason: "created" | "idempotent" | "active"
      run: BacktestBrief
    }
  | {
      version: 1
      accepted: false
      reason: "busy"
    }
