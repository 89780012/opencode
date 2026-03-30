import { ProjectComposerProvider } from "@/components/project/project-composer-provider"
import { GlobalDataProvider } from "@/data/global-data-provider"
import LayoutPage from "@/pages/layout"

export default function Page() {
  return (
    <ProjectComposerProvider>
      <GlobalDataProvider>
        <LayoutPage />
      </GlobalDataProvider>
    </ProjectComposerProvider>
  )
}
