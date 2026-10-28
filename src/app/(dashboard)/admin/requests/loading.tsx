export default function AdminRequestsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-44 bg-slate-200 rounded-lg" />
        <div className="h-4 w-64 bg-slate-100 rounded mt-2" />
      </div>
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-24 bg-slate-200 rounded-full" />
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex gap-8">
          {["Client", "Request", "Type", "Amount", "Date", "Status", "Actions"].map((h) => (
            <div key={h} className="h-3 w-16 bg-slate-200 rounded" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-8 px-5 py-4 border-b border-slate-100 last:border-0">
            <div>
              <div className="h-4 w-28 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-20 bg-slate-100 rounded" />
            </div>
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded" />
            <div className="h-4 w-24 bg-slate-100 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded" />
            <div className="h-6 w-24 bg-slate-100 rounded-full" />
            <div className="flex gap-1.5">
              <div className="h-7 w-7 bg-slate-200 rounded" />
              <div className="h-7 w-7 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
