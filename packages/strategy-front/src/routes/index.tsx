import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { Suspense, lazy } from "react";

const LayoutPage = lazy(() => import("@/pages/layout"));
const IndexPage = lazy(() => import("@/pages/index"));
const InstallerPage = lazy(() => import("@/pages/installer"));
const McpPage = lazy(() => import("@/pages/mcp"));
const ProviderPage = lazy(() => import("@/pages/providers"));
const ProviderOverviewPage = lazy(() => import("@/pages/providers-overview"));
const ProviderModelsPage = lazy(() => import("@/pages/providers-models"));

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
        element: <InstallerPage />,
      },
      {
        path: "mcp",
        element: <McpPage />,
      },
    ],
  },
]);

export function AppRouter() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
