import { SystemProvider } from "@/components/system/system-provider"
import { SocketBoot } from "@/components/socket/socket-boot"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/ui/theme-provider"
import { AppRouter } from "@/routes"
import { ReduxProvider } from "@/store/Provider"

function App() {
  return (
    <ReduxProvider>
      <ThemeProvider>
        <SystemProvider>
          <SocketBoot>
            <AppRouter />
            <Toaster />
          </SocketBoot>
        </SystemProvider>
      </ThemeProvider>
    </ReduxProvider>
  )
}

export default App
