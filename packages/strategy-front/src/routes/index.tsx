import { Suspense, lazy } from "react"
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom"

const LayoutPage = lazy(() => import("@/pages/layout"))
const IndexPage = lazy(() => import("@/pages/index"))
const InstallerPage = lazy(() => import("@/pages/installer"))
const SettingsPage = lazy(() => import("@/pages/settings"))
const SettingsAppearancePage = lazy(() => import("@/pages/settings-appearance"))
const SettingsRuntimePage = lazy(() => import("@/pages/settings-runtime"))
const SettingsLogsPage = lazy(() => import("@/pages/settings-logs"))
const AgentPage = lazy(() => import("@/pages/agents"))
const McpPage = lazy(() => import("@/pages/mcp"))
const ProviderPage = lazy(() => import("@/pages/providers"))
const ProviderOverviewPage = lazy(() => import("@/pages/providers-overview"))
const ProviderModelsPage = lazy(() => import("@/pages/providers-models"))
const SkillPage = lazy(() => import("@/pages/skills"))

const router = createBrowserRouter([
  {
    path: "/",
    element: <LayoutPage />,
    children: [
      {
        index: true,
        element: <IndexPage />,
      },
      {
        path: "providers",
        element: <ProviderPage />,
        children: [
          {
            index: true,
            element: <Navigate to="overview" replace />,
          },
          {
            path: "overview",
            element: <ProviderOverviewPage />,
          },
          {
            path: "models",
            element: <ProviderModelsPage />,
          },
        ],
      },
      {
        path: "installer",
        element: <Navigate to="/settings/tools" replace />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
        children: [
          {
            index: true,
            element: <Navigate to="appearance" replace />,
          },
          {
            path: "appearance",
            element: <SettingsAppearancePage />,
          },
          {
            path: "runtime",
            element: <SettingsRuntimePage />,
          },
          {
            path: "logs",
            element: <SettingsLogsPage />,
          },
          {
            path: "tools",
            element: <InstallerPage />,
          },
        ],
      },
      {
        path: "mcp",
        element: <McpPage />,
      },
      {
        path: "agents",
        element: <AgentPage />,
      },
      {
        path: "skills",
        element: <SkillPage />,
      },
    ],
  },
])

export function AppRouter() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RouterProvider router={router} />
    </Suspense>
  )
}
