import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

let browserQueryClient: QueryClient | undefined;

export const getRouter = () => {
  const queryClient =
    typeof window !== "undefined"
      ? (browserQueryClient ??= new QueryClient())
      : new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
