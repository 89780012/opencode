import { ProjectComposerProvider } from "@/components/project/project-composer-provider"
import { GlobalDataProvider } from "@/data/global-data-provider"
import EmbedLayoutPage from "@/pages/embed-layout"

export default function Page() {
  return (
    <ProjectComposerProvider>
      <GlobalDataProvider>
        <EmbedLayoutPage />
      </GlobalDataProvider>
    </ProjectComposerProvider>
  )
}
