"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function CancelRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this request?")) return;
    setLoading(true);
    try {
      await fetch(`/api/payment-requests/${requestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg py-2 transition-colors hover:bg-red-50 disabled:opacity-60"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : null}
      Cancel request
    </button>
  );
}
