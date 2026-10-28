"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, UserPlus, Loader2, CheckCircle } from "lucide-react";

// Phone is handled outside RHF (country code + number = two inputs, one value)
const SignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Enter a valid email address"),
  organization: z.string().min(2, "Organization name required").max(100),
  department: z.string().max(100).optional().or(z.literal("")),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128)
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupData = z.infer<typeof SignupSchema>;

const passwordRules = [
  { label: "At least 12 characters", test: (p: string) => p.length >= 12 },
  { label: "Uppercase letter",        test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter",        test: (p: string) => /[a-z]/.test(p) },
  { label: "Number",                  test: (p: string) => /[0-9]/.test(p) },
  { label: "Special character",       test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

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

export function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Phone state — managed outside RHF
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const countryRule = COUNTRY_CODES.find((c) => c.code === countryCode) ?? COUNTRY_CODES[0];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupData>({ resolver: zodResolver(SignupSchema) });

  const password = watch("password", "");

  function handlePhoneInput(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, countryRule.digits);
    setPhoneNumber(digits);
    if (phoneError) setPhoneError("");
  }

  function handleCountryChange(code: string) {
    setCountryCode(code);
    setPhoneNumber("");
    setPhoneError("");
  }

  function validatePhone(): boolean {
    if (!phoneNumber) return true; // optional
    if (!countryRule.regex.test(phoneNumber)) {
      setPhoneError(
        countryCode === "+91"
          ? "India: 10 digits starting with 6, 7, 8 or 9"
          : `${countryRule.name}: ${countryRule.digits} digits`
      );
      return false;
    }
    return true;
  }

  const onSubmit = async (data: SignupData) => {
    if (!validatePhone()) return;

    setIsLoading(true);
    setServerError(null);

    const fullPhone = phoneNumber ? `${countryCode}${phoneNumber}` : undefined;

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email.toLowerCase().trim(),
          phone: fullPhone,
          organization: data.organization,
          department: data.department || undefined,
          password: data.password,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error ?? "Registration failed. Please try again.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login?registered=1"), 2500);
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Account created!</h3>
        <p className="text-sm text-slate-500">
          You can sign in now. Complete KYC verification in your portal settings to unlock all features.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Full name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
          Full name <span className="text-red-500">*</span>
        </label>
        <input
          {...register("name")}
          id="name"
          type="text"
          autoComplete="name"
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Jane Smith"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
          Work email <span className="text-red-500">*</span>
        </label>
        <input
          {...register("email")}
          id="email"
          type="email"
          autoComplete="email"
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="you@company.com"
        />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>

      {/* Phone — country code + strict digits */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Phone <span className="text-slate-400 text-xs font-normal">(optional)</span>
        </label>
        <div className="flex gap-2">
          <select
            value={countryCode}
            onChange={(e) => handleCountryChange(e.target.value)}
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
          <p className="mt-1 text-xs text-red-600">{phoneError}</p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">
            {countryCode === "+91"
              ? "India: 10 digits starting with 6–9, numbers only"
              : `${countryRule.name}: ${countryRule.digits} digits, numbers only`}
          </p>
        )}
      </div>

      {/* Organization + Department */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="organization" className="block text-sm font-medium text-slate-700 mb-1">
            Organization <span className="text-red-500">*</span>
          </label>
          <input
            {...register("organization")}
            id="organization"
            type="text"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Acme Corp"
          />
          {errors.organization && <p className="mt-1 text-xs text-red-600">{errors.organization.message}</p>}
        </div>
        <div>
          <label htmlFor="department" className="block text-sm font-medium text-slate-700 mb-1">
            Department
          </label>
          <input
            {...register("department")}
            id="department"
            type="text"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Finance"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
          Password <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            {...register("password")}
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
            placeholder="••••••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {password && (
          <div className="mt-2 grid grid-cols-2 gap-1">
            {passwordRules.map((rule) => (
              <div key={rule.label} className={`flex items-center gap-1.5 text-xs ${rule.test(password) ? "text-green-600" : "text-slate-400"}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${rule.test(password) ? "bg-green-500" : "bg-slate-300"}`} />
                {rule.label}
              </div>
            ))}
          </div>
        )}
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
      </div>

      {/* Confirm password */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
          Confirm password <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            {...register("confirmPassword")}
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
            placeholder="••••••••••••"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">
        You can sign in immediately after registration. Complete KYC verification in your portal settings to submit deposit requests.
      </p>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
      >
        {isLoading ? (
          <><Loader2 size={16} className="animate-spin" /> Creating account...</>
        ) : (
          <><UserPlus size={16} /> Create account</>
        )}
      </button>
    </form>
  );
}
