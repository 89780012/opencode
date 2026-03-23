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
          <AppRouter />
          <Toaster />
        </SystemProvider>
      </ThemeProvider>
    </ReduxProvider>
  )
}

export default App
