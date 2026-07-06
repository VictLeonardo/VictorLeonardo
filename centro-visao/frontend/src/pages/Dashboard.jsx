import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import MetricCard from '../components/MetricCard.jsx';
import ConfidenceBadge from '../components/ConfidenceBadge.jsx';
import { brl, ptDate } from '../lib/format.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.getDashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  const { metrics, exceptions } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Painel de conciliação</h1>
        <p className="text-sm text-slate-500">Visão geral do fechamento — POS × ERP × Banco</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Conciliado automático"
          value={`${metrics.autoReconciledPct}%`}
          sub={`${metrics.autoReconciledCount} de ${metrics.totalTransactions} transações`}
          accent="teal"
        />
        <MetricCard
          label="Exceções pendentes"
          value={metrics.pendingExceptions}
          sub={`${metrics.mediumCount} média · ${metrics.lowCount} crítica`}
          accent="amber"
        />
        <MetricCard
          label="Lojas mapeadas"
          value={`${metrics.storesMapped}/${metrics.totalStores}`}
          sub="com câmeras cadastradas"
          accent="blue"
        />
        <MetricCard
          label="Câmeras com API ativa"
          value={`${metrics.camerasApiActive}/${metrics.camerasTotal}`}
          sub="acesso via API/IP"
          accent="blue"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="font-medium text-slate-700">Fila de exceções</h2>
          <button
            onClick={() => navigate('/excecoes')}
            className="text-sm font-medium text-brand-blue hover:underline"
          >
            Abrir revisão →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400">
                <th className="px-5 py-2 font-medium">Loja</th>
                <th className="px-5 py-2 font-medium">Valor</th>
                <th className="px-5 py-2 font-medium">Data</th>
                <th className="px-5 py-2 font-medium">Motivo</th>
                <th className="px-5 py-2 font-medium">Confiança</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/excecoes/${t.id}`)}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-700">{t.storeName}</div>
                    <div className="text-xs text-slate-400">{t.storeId}</div>
                  </td>
                  <td className="px-5 py-3 font-mono text-slate-700">{brl(t.amount)}</td>
                  <td className="px-5 py-3 text-slate-600">{ptDate(t.date)}</td>
                  <td className="px-5 py-3 text-slate-600">{t.reconciliation.reason}</td>
                  <td className="px-5 py-3">
                    <ConfidenceBadge band={t.reconciliation.band} score={t.reconciliation.score} />
                  </td>
                </tr>
              ))}
              {exceptions.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-5 py-8 text-center text-slate-400">
                    Nenhuma exceção pendente 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function Loading() {
  return <div className="py-16 text-center text-slate-400">Carregando…</div>;
}
export function ErrorBox({ message }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      Erro ao carregar: {message}. Confira se a API está rodando (backend).
    </div>
  );
}
