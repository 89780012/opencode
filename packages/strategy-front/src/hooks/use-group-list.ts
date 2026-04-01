import { useCallback, useEffect, useMemo, useState } from "react"
import { groupApi } from "@/api/modules/group"
import type { StrategyGroup } from "@/types/group"

export function useGroupList() {
  const [groups, setGroups] = useState<StrategyGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await groupApi.list()
      setGroups(data.groups ?? [])
      setLoaded(true)
    } catch (err) {
      console.error("Failed to load groups", err)
      setError(err instanceof Error && err.message ? err.message : "加载组合策略失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (loaded) return
    void refresh()
  }, [loaded, refresh])

  useEffect(() => {
    const sync = () => {
      void refresh()
    }

    window.addEventListener("focus", sync)
    window.addEventListener("group:changed", sync)
    return () => {
      window.removeEventListener("focus", sync)
      window.removeEventListener("group:changed", sync)
    }
  }, [refresh])

  const prepend = useCallback((group: StrategyGroup) => {
    setGroups((prev) => {
      const list = prev.filter((item) => item.id !== group.id)
      return [group, ...list]
    })
    setLoaded(true)
    setError(null)
  }, [])

  return useMemo(
    () => ({
      groups,
      loading,
      loaded,
      error,
      refresh,
      prepend,
    }),
    [error, groups, loaded, loading, prepend, refresh],
  )
}
