"use client";
import { useState } from "react";
import { User, Building2, Phone, CheckCircle2, AlertCircle } from "lucide-react";

const COUNTRY_CODES = [
  { code: "+91",  name: "India",        digits: 10, regex: /^[6-9]\d{9}$/ },
  { code: "+1",   name: "USA / Canada", digits: 10, regex: /^\d{10}$/ },
  { code: "+44",  name: "UK",           digits: 10, regex: /^\d{10}$/ },
  { code: "+61",  name: "Australia",    digits: 9,  regex: /^\d{9}$/ },
  { code: "+971", name: "UAE",          digits: 9,  regex: /^\d{9}$/ },
  { code: "+65",  name: "Singapore",    digits: 8,  regex: /^\d{8}$/ },
  { code: "+49",  name: "Germany",      digits: 10, regex: /^\d{10,11}$/ },
  { code: "+33",  name: "France",       digits: 9,  regex: /^\d{9}$/ },
];

function parsePhone(fullPhone: string | null): { countryCode: string; number: string } {
  if (!fullPhone) return { countryCode: "+91", number: "" };
  for (const c of COUNTRY_CODES) {
    if (fullPhone.startsWith(c.code)) {
      return { countryCode: c.code, number: fullPhone.slice(c.code.length) };
    }
  }
  return { countryCode: "+91", number: fullPhone };
}

interface ProfileEditProps {
  name: string;
  department: string | null;
  email: string;
  phone?: string | null;
}

export function ProfileEdit({ name, department, email, phone }: ProfileEditProps) {
  const [editName, setEditName] = useState(name);
  const [editDept, setEditDept] = useState(department ?? "");

  const parsed = parsePhone(phone ?? null);
  const [countryCode, setCountryCode] = useState(parsed.countryCode);
  const [phoneNumber, setPhoneNumber] = useState(parsed.number);
  const [phoneError, setPhoneError] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const countryRule = COUNTRY_CODES.find((c) => c.code === countryCode) ?? COUNTRY_CODES[0];

  function handlePhoneInput(val: string) {
    // digits only
    const digits = val.replace(/\D/g, "").slice(0, 15);
    setPhoneNumber(digits);
    if (phoneError) setPhoneError("");
  }

  function validatePhone(): boolean {
    if (!phoneNumber) return true; // optional field
    if (!countryRule.regex.test(phoneNumber)) {
      setPhoneError(
        `${countryRule.name} phone: ${countryRule.digits} digits${countryCode === "+91" ? ", starting with 6-9" : ""}`
      );
      return false;
    }
    return true;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (editName.trim().length < 2) {
      setMessage({ type: "error", text: "Name must be at least 2 characters." });
      return;
    }
    if (!validatePhone()) return;

    setLoading(true);
    setMessage(null);

    const fullPhone = phoneNumber ? `${countryCode}${phoneNumber}` : "";

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          department: editDept.trim(),
          phone: fullPhone || null,
        }),
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

      {/* Phone with country code */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          <span className="flex items-center gap-1.5"><Phone size={13} /> Phone Number <span className="text-slate-400 text-xs font-normal">(optional)</span></span>
        </label>
        <div className="flex gap-2">
          <select
            value={countryCode}
            onChange={(e) => { setCountryCode(e.target.value); setPhoneNumber(""); setPhoneError(""); }}
            className="border border-slate-300 rounded-lg px-2 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>{c.code} {c.name}</option>
            ))}
          </select>
          <input
            type="tel"
            inputMode="numeric"
            value={phoneNumber}
            onChange={(e) => handlePhoneInput(e.target.value)}
            onBlur={validatePhone}
            placeholder={`${countryRule.digits} digits`}
            maxLength={countryRule.digits}
            className={`flex-1 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              phoneError ? "border-red-400 bg-red-50" : "border-slate-300"
            }`}
          />
        </div>
        {phoneError ? (
          <p className="text-xs text-red-600 mt-1">{phoneError}</p>
        ) : (
          <p className="text-xs text-slate-400 mt-1">
            {countryCode === "+91" ? "India: 10 digits starting with 6, 7, 8 or 9" : `${countryRule.name}: ${countryRule.digits} digits`}
          </p>
        )}
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
