"use client";
import { useState } from "react";
import { User, Building2, CheckCircle2, AlertCircle } from "lucide-react";

interface ProfileEditProps {
  name: string;
  department: string | null;
  email: string;
}

export function ProfileEdit({ name, department, email }: ProfileEditProps) {
  const [editName, setEditName] = useState(name);
  const [editDept, setEditDept] = useState(department ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (editName.trim().length < 2) { setMessage({ type: "error", text: "Name must be at least 2 characters." }); return; }
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), department: editDept.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setMessage({ type: "error", text: json.error ?? "Update failed" }); return; }
      setMessage({ type: "success", text: "Profile updated. Changes take effect on next login." });
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          <span className="flex items-center gap-1.5"><User size={13} /> Full Name</span>
        </label>
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          <span className="flex items-center gap-1.5"><Building2 size={13} /> Organization / Department</span>
        </label>
        <input
          type="text"
          value={editDept}
          onChange={(e) => setEditDept(e.target.value)}
          placeholder="e.g. Acme Corp — Finance"
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
        />
        <p className="text-xs text-slate-400 mt-1">Email cannot be changed. Contact your admin if needed.</p>
      </div>

      {message && (
        <div className={`flex gap-2 rounded-lg px-3 py-2.5 ${message.type === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          {message.type === "success"
            ? <CheckCircle2 size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
            : <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />}
          <p className={`text-sm ${message.type === "success" ? "text-green-700" : "text-red-700"}`}>{message.text}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
      >
        {loading ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
