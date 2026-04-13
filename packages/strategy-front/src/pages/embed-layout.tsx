import { Outlet } from "react-router-dom"

export default function EmbedLayoutPage() {
  return (
    <div className="flex h-screen min-h-0 min-w-0 flex-col bg-background">
      <Outlet />
    </div>
  )
}
