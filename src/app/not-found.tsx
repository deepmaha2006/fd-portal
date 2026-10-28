import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <section className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-16">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <span
          className="text-[8rem] leading-none font-bold tracking-tighter text-slate-800 tabular-nums select-none sm:text-[11rem]"
          aria-hidden="true"
        >
          404
        </span>
        <h1 className="-mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          This page took a wrong turn
        </h1>
        <p className="mt-3 max-w-sm text-sm text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          Let&apos;s get you back on track.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Home size={16} aria-hidden="true" />
            Go home
          </Link>
          <Link
            href="javascript:history.back()"
            onClick={(e) => { e.preventDefault(); history.back(); }}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Go back
          </Link>
        </div>
        <p className="mt-12 text-xs text-slate-400">
          FD Portal · Security Deposit Management
        </p>
      </div>
    </section>
  );
}
