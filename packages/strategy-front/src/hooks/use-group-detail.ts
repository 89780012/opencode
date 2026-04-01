import { useCallback, useEffect, useMemo, useState } from "react"
import { groupApi } from "@/api/modules/group"
import type { StrategyGroup } from "@/types/group"

export function useGroupDetail(id?: string) {
  const [group, setGroup] = useState<StrategyGroup | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await groupApi.detail(id)
      setGroup(data.group)
    } catch (err) {
      console.error("Failed to load group detail", err)
      setError(err instanceof Error && err.message ? err.message : "Failed to load group detail")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return useMemo(
    () => ({
      group,
      loading,
      error,
      refresh,
    }),
    [error, group, loading, refresh],
  )
}
