export default function AuditLogsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-36 bg-slate-200 rounded" />
        <div className="h-4 w-56 bg-slate-100 rounded mt-2" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Time", "User", "Action", "Entity", "IP", "Details"].map((h) => (
                <th key={h} className="px-4 py-3">
                  <div className="h-3 w-14 bg-slate-200 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: 12 }).map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3"><div className="h-3 w-28 bg-slate-100 rounded" /></td>
                <td className="px-4 py-3">
                  <div className="h-3.5 w-24 bg-slate-200 rounded mb-1" />
                  <div className="h-3 w-32 bg-slate-100 rounded" />
                </td>
                <td className="px-4 py-3"><div className="h-5 w-28 bg-slate-200 rounded" /></td>
                <td className="px-4 py-3"><div className="h-3.5 w-20 bg-slate-100 rounded" /></td>
                <td className="px-4 py-3"><div className="h-3 w-24 bg-slate-100 rounded" /></td>
                <td className="px-4 py-3"><div className="h-3 w-32 bg-slate-100 rounded" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
