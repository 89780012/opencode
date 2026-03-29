import { GlobalDataProvider } from "@/components/data/global-data-provider"
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
          <GlobalDataProvider>
            <AppRouter />
            <Toaster />
          </GlobalDataProvider>
        </SystemProvider>
      </ThemeProvider>
    </ReduxProvider>
  )
}

export default App
