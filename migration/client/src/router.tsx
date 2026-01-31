import { createBrowserRouter } from "react-router-dom";
import RootLayout from "./app/layout";
import Home from "./app/page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
    ],
  },
]);
