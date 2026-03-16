import { ReduxProvider } from '@/store/Provider'
import { AppRouter } from '@/routes'
import { Toaster } from '@/components/ui/sonner'

function App() {
  return (
    <ReduxProvider>
      <AppRouter />
      <Toaster />
    </ReduxProvider>
  )
}

export default App
