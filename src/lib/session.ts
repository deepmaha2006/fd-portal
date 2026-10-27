import { cache } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";

// Deduplicates session calls within a single request (layout + page both call this safely)
export const getSession = cache(async () => {
  return getServerSession(authOptions);
});
