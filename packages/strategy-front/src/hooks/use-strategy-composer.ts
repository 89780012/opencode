import { useCallback, useMemo } from "react"
import { useAgentList, useProviderList } from "@/data/global-data-provider"
import { useProjectComposer } from "@/hooks/use-project-composer"
import { resolveComposer } from "@/lib/chat-composer"

/**
 * 策略组合器 Hook
 * 用于管理聊天机器人的代理、模型和变体选择
 * @param scope - 项目范围标识
 * @param kind - 代理类型过滤
 */
export function useStrategyComposer(scope?: string, kind?: string) {
  // 获取模型提供商目录
  const catalog = useProviderList()
  // 获取指定类型的代理列表
  const ags = useAgentList(kind)
  // 获取项目组合状态
  const project = useProjectComposer(scope)
  // 解析组合器配置
  const composer = useMemo(
    () =>
      resolveComposer({
        agents: ags.ags,
        catalog,
        state: project.state,
      }),
    [ags.ags, catalog, project.state],
  )
  // 格式化模型名称为 providerID/modelID
  const model = composer.model ? `${composer.model.providerID}/${composer.model.modelID}` : undefined

  /**
   * 设置选中的代理
   * @param value - 代理名称
   */
  const setAgent = useCallback(
    (value: string) => {
      if (!ags.ags.some((item) => item.name === value)) {
        return
      }
      project.setAgent(value)
    },
    [ags.ags, project],
  )

  /**
   * 设置选中的模型
   * @param value - 模型标识，格式为 providerID/modelID
   */
  const setModel = useCallback(
    (value: string) => {
      const [providerID, ...rest] = value.split("/")
      const modelID = rest.join("/")
      if (!catalog.connectedModels.some((item) => item.provider.id === providerID && item.id === modelID)) {
        return
      }
      project.setModel({ providerID, modelID })
    },
    [catalog.connectedModels, project],
  )

  /**
   * 设置选中的变体
   * @param value - 变体名称，"default" 表示默认变体
   */
  const setVariant = useCallback(
    (value: string) => {
      project.setVariant(value === "default" ? null : value)
    },
    [project],
  )

  // 返回组合器状态和操作方法
  return useMemo(
    () => ({
      composer, // 当前组合器配置
      agent: composer.agent?.name, // 当前选中的代理名称
      model, // 当前选中的模型标识
      variant: composer.variant, // 当前选中的变体
      variants: composer.variants, // 可用的变体列表
      agents: ags.names, // 可用的代理名称列表
      models: catalog.visibleModels, // 可见的模型列表
      load: ags.load || catalog.load, // 加载状态
      setAgent, // 设置代理的方法
      setModel, // 设置模型的方法
      setVariant, // 设置变体的方法
    }),
    [ags.load, ags.names, catalog.load, catalog.visibleModels, composer, model, setAgent, setModel, setVariant],
  )
}
