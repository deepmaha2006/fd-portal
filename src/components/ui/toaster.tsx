"use client";
// Simple toast notification container — wire to a global state if needed
export function Toaster() {
  return <div id="toaster" aria-live="polite" aria-atomic="true" className="fixed bottom-4 right-4 z-50 space-y-2" />;
}
