import { ComposerProvider } from "@/components/composer/composer-provider"
import { GlobalDataProvider } from "@/data/global-data-provider"
import LayoutPage from "@/pages/layout"

export default function Page() {
  return (
    <ComposerProvider>
      <GlobalDataProvider>
        <LayoutPage />
      </GlobalDataProvider>
    </ComposerProvider>
  )
}
