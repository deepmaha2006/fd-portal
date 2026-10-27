export default function DepositsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-28 bg-slate-200 rounded" />
          <div className="h-4 w-40 bg-slate-100 rounded mt-2" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-28 bg-slate-200 rounded-lg" />
          <div className="h-9 w-32 bg-blue-200 rounded-lg" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200 flex gap-3">
          <div className="h-9 w-48 bg-slate-100 rounded-lg" />
          <div className="h-9 w-32 bg-slate-100 rounded-lg" />
          <div className="h-9 w-32 bg-slate-100 rounded-lg" />
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Reference", "Type", "Bank", "Principal", "Maturity", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3">
                  <div className="h-3 w-16 bg-slate-200 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3"><div className="h-4 w-28 bg-slate-100 rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-20 bg-slate-100 rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-24 bg-slate-100 rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-20 bg-slate-100 rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-24 bg-slate-100 rounded" /></td>
                <td className="px-4 py-3"><div className="h-5 w-20 bg-slate-200 rounded-full" /></td>
                <td className="px-4 py-3"><div className="h-4 w-12 bg-slate-100 rounded" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
