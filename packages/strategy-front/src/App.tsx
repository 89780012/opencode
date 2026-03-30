import { GlobalDataProvider } from "@/data/global-data-provider"
import { ProjectComposerProvider } from "@/components/project/project-composer-provider"
import { SystemProvider } from "@/components/system/system-provider"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/ui/theme-provider"
import { AppRouter } from "@/routes"
import { ReduxProvider } from "@/store/Provider"

function App() {
  return (
    <ReduxProvider>
      <ThemeProvider>
        <SystemProvider>
          <ProjectComposerProvider>
            <GlobalDataProvider>
              <AppRouter />
              <Toaster />
            </GlobalDataProvider>
          </ProjectComposerProvider>
        </SystemProvider>
      </ThemeProvider>
    </ReduxProvider>
  )
}

export default App
