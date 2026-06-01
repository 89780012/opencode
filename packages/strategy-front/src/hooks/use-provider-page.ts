import { useMemo, useState } from "react"
import { toast } from "sonner"
import { providerApi } from "@/api/modules/provider"
import { useProviderList } from "@/data/global-data"
import type { Provider } from "@/types/provider"
import { custom, popular, text } from "@/components/provider/utils"

/**
 * 管理提供商页面的分组数据和断开动作。
 */
export function useProviderPage() {
  const prv = useProviderList()
  const [busy, setBusy] = useState("")
  const [item, setItem] = useState<Provider>()
  const [customOpen, setCustomOpen] = useState(false)
  const map = prv.auth
  const providers = prv.providers
  const config = prv.config
  const load = prv.load
  const err = prv.err

  /**
   * 已连接提供商列表。
   */
  const connected = useMemo(() => {
    if (providers.all.length === 0 || providers.connected.length === 0) {
      return []
    }

    const ids = new Set(providers.connected)
    return providers.all.filter((item) => ids.has(item.id))
  }, [providers])

  /**
   * 热门提供商集合，用于过滤优先展示项。
   */
  const hot = useMemo(() => new Set(popular), [])

  /**
   * 尚未连接的热门提供商。
   */
  const popularList = useMemo(() => {
    const ids = new Set(connected.map((item) => item.id))
    return providers.all
      .filter((item) => hot.has(item.id) && !ids.has(item.id))
      .sort((a, b) => popular.indexOf(a.id) - popular.indexOf(b.id))
  }, [connected, hot, providers])

  /**
   * 其余未连接提供商。
   */
  const other = useMemo(() => {
    const ids = new Set(connected.map((item) => item.id))
    return providers.all.filter((item) => !ids.has(item.id) && !hot.has(item.id))
  }, [connected, hot, providers])

  /**
   * 当前已识别到的 provider id 集合。
   */
  const ids = useMemo(() => new Set(providers.all.map((item) => item.id)), [providers])

  /**
   * 断开一个提供商，并根据来源决定清理方式。
   */
  async function remove(item: Provider) {
    setBusy(item.id)

    try {
      if (custom(item.id, config)) {
        await providerApi.remove(item.id).catch(() => undefined)
        await providerApi.update({
          disabled_providers: [...new Set([...(config.disabled_providers ?? []), item.id])],
        })
      } else {
        await providerApi.remove(item.id)
        await providerApi.dispose()
      }

      await prv.refresh()
      toast.success(`${item.name} 已断开`)
    } catch (err) {
      toast.error(text(err, "断开提供商失败"))
    } finally {
      setBusy("")
    }
  }

  return {
    busy,
    config,
    connected,
    customOpen,
    err,
    ids,
    item,
    list: map,
    load,
    other,
    popularList,
    providers,
    refresh: prv.refresh,
    remove,
    setCustomOpen,
    setItem,
  }
}
