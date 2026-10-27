export default function SettingsLoading() {
  return (
    <div className="space-y-8 max-w-3xl animate-pulse">
      <div>
        <div className="h-8 w-24 bg-slate-200 rounded" />
        <div className="h-4 w-64 bg-slate-100 rounded mt-2" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="h-5 w-48 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-72 bg-slate-100 rounded mb-4" />
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
              <div className="h-4 w-40 bg-slate-100 rounded" />
              <div className="h-5 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
