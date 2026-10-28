"use client"

import { useEffect } from "react";
import Link from "next/link";
import { Home, RefreshCw, Wifi } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isNetworkError =
    error.message?.toLowerCase().includes("network") ||
    error.message?.toLowerCase().includes("fetch") ||
    error.message?.toLowerCase().includes("connection");

  return (
    <section className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-16">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-6">
          {isNetworkError ? (
            <Wifi className="h-10 w-10 text-red-500" />
          ) : (
            <span className="text-3xl font-bold text-red-500">!</span>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {isNetworkError ? "Connection problem" : "Something went wrong"}
        </h1>
        <p className="mt-3 max-w-sm text-sm text-slate-500">
          {isNetworkError
            ? "We couldn't reach the server. Check your internet connection and try again."
            : "An unexpected error occurred. Our team has been notified and we're working on a fix."}
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-slate-400 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={16} />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Home size={16} />
            Go home
          </Link>
        </div>
        <p className="mt-12 text-xs text-slate-400">
          FD Portal · Security Deposit Management
        </p>
      </div>
    </section>
  );
}
