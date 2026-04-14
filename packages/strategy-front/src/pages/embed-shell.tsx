import { ComposerProvider } from "@/components/composer/composer-provider"
import { GlobalDataProvider } from "@/data/global-data-provider"
import EmbedLayoutPage from "@/pages/embed-layout"

export default function Page() {
  return (
    <ComposerProvider>
      <GlobalDataProvider>
        <EmbedLayoutPage />
      </GlobalDataProvider>
    </ComposerProvider>
  )
}
