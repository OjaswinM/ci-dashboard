import { createBrowserRouter, useParams } from "react-router-dom";
import RootLayout from "./app/layout";
import Home from "./app/page";
import TestTypeClient from "./app/test-types/[type]/client";
import TestRunsClient from "./app/test-types/[type]/subtypes/[subtype]/client";
import TestRunClient from "./app/test-types/[type]/subtypes/[subtype]/runs/[id]/client";
import CompareClient from "./app/test-types/[type]/subtypes/[subtype]/runs/compare/[id1]/client";
import ComparisonClient from "./app/test-types/[type]/subtypes/[subtype]/runs/compare/[id1]/[id2]/client";

const TestTypeRoute = () => {
  const params = useParams();
  return <TestTypeClient testType={decodeURIComponent(params.type!)} />;
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { 
        path: "test-types/:type",
        element: <TestTypeRoute />
      },
      {
        path: "test-types/:type/subtypes/:subtype",
        element: <TestRunsClient />
      },
      {
        path: "test-types/:type/subtypes/:subtype/runs/:id",
        element: <TestRunClient />
      },
      {
        path: "test-types/:type/subtypes/:subtype/runs/compare/:id1",
        element: <CompareClient />
      },
      {
        path: "test-types/:type/subtypes/:subtype/runs/compare/:id1/:id2",
        element: <ComparisonClient />
      },
    ],
  },
]);
