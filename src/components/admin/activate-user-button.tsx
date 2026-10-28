"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, Loader2 } from "lucide-react";

export function ActivateUserButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!confirm("Activate this user account? They will be able to sign in.")) return;
    setLoading(true);
    try {
      await fetch(`/api/users/${userId}/activate`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleActivate}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
      Activate
    </button>
  );
}
