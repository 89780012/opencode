import { GlobalDataProvider } from "@/data/global-data-provider"
import LayoutPage from "@/pages/layout"

export default function Page() {
  return (
    <GlobalDataProvider>
      <LayoutPage />
    </GlobalDataProvider>
  )
}
