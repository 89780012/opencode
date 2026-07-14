import { request } from "@/api/client"
import type { BacktestConfig, BacktestList, BacktestRun, BacktestRunInput } from "@/types/backtest"

export const backtestApi = {
  config() {
    return request.get<BacktestConfig>("/backtest/config")
  },
  saveConfig(cfg: BacktestConfig) {
    return request.put<BacktestConfig, BacktestConfig>("/backtest/config", cfg)
  },
  run(input: BacktestRunInput) {
    return request.post<BacktestRun, BacktestRunInput>("/backtest/run", input)
  },
  runs(workspacePath: string, sessionId?: string, limit = 20) {
    const query = new URLSearchParams({ workspacePath, limit: `${limit}` })
    if (sessionId) query.set("sessionId", sessionId)
    return request.get<BacktestList>(`/backtest/runs?${query.toString()}`)
  },
  detail(id: string, workspacePath: string, sessionId: string) {
    const query = new URLSearchParams({ workspacePath, sessionId })
    return request.get<BacktestRun>(`/backtest/runs/${encodeURIComponent(id)}?${query.toString()}`)
  },
  refresh(id: string) {
    return request.post<BacktestRun>(`/backtest/runs/${encodeURIComponent(id)}/refresh`)
  },
}
