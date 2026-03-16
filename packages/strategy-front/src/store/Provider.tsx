import { Provider } from 'react-redux'
import { store } from './index'

interface Props {
  children: React.ReactNode
}

export function ReduxProvider({ children }: Props) {
  return <Provider store={store}>{children}</Provider>
}
