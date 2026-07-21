export type Intake = {
  scope: string
  text: string
  id: string
}

let seq = 0

export function capture(store: Map<string, Intake>, scope: string, text: string) {
  const prev = store.get(scope)
  if (prev?.text === text) return prev
  const next = { scope, text, id: `intake_${Date.now()}_${++seq}` }
  store.set(scope, next)
  return next
}

export function settle(store: Map<string, Intake>, scope: string, id: string) {
  if (store.get(scope)?.id === id) store.delete(scope)
}
