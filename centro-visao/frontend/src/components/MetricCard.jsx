export default function MetricCard({ label, value, sub, accent = 'blue' }) {
  const accents = {
    blue: 'text-brand-blue',
    teal: 'text-brand-teal',
    amber: 'text-amber-600',
    red: 'text-red-600',
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${accents[accent] || accents.blue}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}
