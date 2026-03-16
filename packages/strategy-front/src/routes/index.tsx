import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Suspense, lazy } from "react";

const IndexPage = lazy(() => import("@/pages/index"));

const router = createBrowserRouter([
  {
    path: "/",
    element: <IndexPage />,
  },
]);

export function AppRouter() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
