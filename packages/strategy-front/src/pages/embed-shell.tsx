import { GlobalDataProvider } from "@/data/global-data-provider"
import EmbedLayoutPage from "@/pages/embed-layout"

export default function Page() {
  return (
    <GlobalDataProvider>
      <EmbedLayoutPage />
    </GlobalDataProvider>
  )
}
