import { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client.js';
import { Loading, ErrorBox } from './Dashboard.jsx';

const STATUS = {
  online: { label: 'API ativa', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  instavel: { label: 'Instável', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
  offline: { label: 'Offline', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
};

export default function Cameras() {
  const [cameras, setCameras] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.getCameras().then(setCameras).catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!cameras) return [];
    if (filter === 'all') return cameras;
    if (filter === 'api') return cameras.filter((c) => c.apiActive);
    if (filter === 'card') return cameras.filter((c) => !c.apiActive && c.cardLocal);
    if (filter === 'dinamico') return cameras.filter((c) => c.ipType === 'dinamico');
    return cameras;
  }, [cameras, filter]);

  if (error) return <ErrorBox message={error} />;
  if (!cameras) return <Loading />;

  const apiCount = cameras.filter((c) => c.apiActive).length;
  const cardOnly = cameras.filter((c) => !c.apiActive && c.cardLocal).length;
  const dynamic = cameras.filter((c) => c.ipType === 'dinamico').length;

  const filters = [
    { key: 'all', label: `Todas (${cameras.length})` },
    { key: 'api', label: `Com API (${apiCount})` },
    { key: 'card', label: `Só cartão local (${cardOnly})` },
    { key: 'dinamico', label: `IP dinâmico (${dynamic})` },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Status das câmeras</h1>
        <p className="text-sm text-slate-500">
          Infraestrutura por loja — câmeras Intelbras. Fase de mapeamento de acesso (sem vídeo/métricas).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.key ? 'bg-brand-blue text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const st = STATUS[c.status] || STATUS.offline;
          return (
            <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-slate-700">{c.storeName}</div>
                  <div className="text-xs text-slate-400">{c.id}</div>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${st.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                  {st.label}
                </span>
              </div>

              <div className="mt-3 text-xs text-slate-500">{c.model}</div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Tag on={c.apiActive} onLabel="API/IP" offLabel="Sem API" />
                <Tag on={c.cardLocal} onLabel="Cartão local" offLabel="Sem cartão" neutral />
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  IP {c.ipType === 'fixo' ? 'fixo' : 'dinâmico'}
                </span>
              </div>

              {c.notes && (
                <div className="mt-3 rounded bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  {c.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tag({ on, onLabel, offLabel, neutral }) {
  const cls = on
    ? neutral
      ? 'bg-slate-100 text-slate-600'
      : 'bg-emerald-100 text-emerald-700'
    : 'bg-slate-100 text-slate-400 line-through';
  return <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${cls}`}>{on ? onLabel : offLabel}</span>;
}
