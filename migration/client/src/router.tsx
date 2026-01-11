import { createBrowserRouter, useParams } from "react-router-dom";
import RootLayout from "./app/layout";
import Home from "./app/page";
import TestTypeClient from "./app/test-types/[type]/client";

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
    ],
  },
]);
