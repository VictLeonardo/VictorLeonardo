import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import ConfidenceBadge from '../components/ConfidenceBadge.jsx';
import { Loading, ErrorBox } from './Dashboard.jsx';
import { brl, ptDate, ptDateTime } from '../lib/format.js';

const CRIT_LABELS = {
  valueMatch: 'Valor bate',
  dateMatch: 'Data bate',
  nsuUnique: 'NSU único',
  storeConsistent: 'Loja consistente',
};

const STATUS_COLOR = {
  pass: 'bg-emerald-500',
  partial: 'bg-amber-500',
  fail: 'bg-red-500',
};

export default function Exceptions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  const loadList = useCallback(() => {
    api.getExceptions().then(setList).catch((e) => setError(e.message));
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  useEffect(() => {
    if (id) {
      api.getTransaction(id).then(setDetail).catch((e) => setError(e.message));
    } else {
      setDetail(null);
    }
  }, [id]);

  if (error) return <ErrorBox message={error} />;
  if (!list) return <Loading />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Fila de exceções</h1>
        <p className="text-sm text-slate-500">
          Transações que não conciliaram automaticamente — clique para revisar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
        {/* Lista à esquerda */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-2 text-xs uppercase text-slate-400">
            {list.length} exceção(ões)
          </div>
          <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
            {list.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => navigate(`/excecoes/${t.id}`)}
                  className={`flex w-full items-start justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 ${
                    id === t.id ? 'bg-slate-50' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-700">{t.storeName}</div>
                    <div className="text-xs text-slate-400">
                      {brl(t.amount)} · {ptDate(t.date)}
                    </div>
                  </div>
                  <ConfidenceBadge band={t.reconciliation.band} score={t.reconciliation.score} />
                </button>
              </li>
            ))}
            {list.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-400">Nada pendente 🎉</li>
            )}
          </ul>
        </div>

        {/* Detalhe à direita */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          {detail ? (
            <Detail tx={detail} onActionDone={() => { loadList(); api.getTransaction(id).then(setDetail); }} />
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-slate-400">
              Selecione uma exceção à esquerda para ver o detalhamento.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ tx, onActionDone }) {
  const r = tx.reconciliation;
  const sources = tx.sources;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{tx.storeName}</h2>
          <div className="text-xs text-slate-400">
            {tx.id} · {tx.storeId} · NSU {tx.nsu || '—'}
          </div>
        </div>
        <ConfidenceBadge band={r.band} score={r.score} />
      </div>

      {/* Motivo explicável */}
      <div className={`rounded-md border px-4 py-3 text-sm ${
        r.band === 'low' ? 'border-red-200 bg-red-50 text-red-700'
        : r.band === 'medium' ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}>
        {r.reason}
      </div>

      {/* Comparação POS x ERP x Banco lado a lado */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-600">Comparação por fonte</h3>
        <div className="grid grid-cols-3 gap-3">
          <SourceCard title="POS" subtitle="Caixa" s={sources.pos} />
          <SourceCard title="ERP" subtitle="Presence Domain" s={sources.erp} />
          <SourceCard title="Banco" subtitle="Extrato/adquirente" s={sources.banco} />
        </div>
      </div>

      {/* Barras por critério de confiança */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-600">Critérios de confiança</h3>
        <div className="space-y-3">
          {r.breakdown.map((b) => (
            <div key={b.criterion}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">{CRIT_LABELS[b.criterion]}</span>
                <span className="font-mono text-slate-400">
                  {b.score}/{b.maxScore} pts
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full ${STATUS_COLOR[b.status]}`}
                  style={{ width: `${b.maxScore ? (b.score / b.maxScore) * 100 : 0}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-slate-500">{b.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ações */}
      <ActionBar tx={tx} onActionDone={onActionDone} />

      {/* Auditoria */}
      {tx.audit && tx.audit.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-600">Histórico de auditoria</h3>
          <ul className="space-y-2 text-xs">
            {tx.audit.map((a) => (
              <li key={a.id} className="rounded border border-slate-100 bg-slate-50 px-3 py-2">
                <span className="font-medium text-slate-700">{a.label}</span> · por {a.user} ·{' '}
                {ptDateTime(a.at)}
                {a.reason && <div className="text-slate-500">Motivo: {a.reason}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SourceCard({ title, subtitle, s }) {
  const present = s && s.present;
  return (
    <div className={`rounded-md border p-3 text-sm ${present ? 'border-slate-200' : 'border-dashed border-slate-200 bg-slate-50'}`}>
      <div className="flex items-baseline justify-between">
        <span className="font-semibold text-slate-700">{title}</span>
        <span className="text-[10px] uppercase text-slate-400">{subtitle}</span>
      </div>
      {present ? (
        <dl className="mt-2 space-y-1 text-xs">
          <Row k="Valor" v={brl(s.amount)} mono />
          <Row k="Data" v={ptDate(s.date)} />
          <Row k="NSU" v={s.nsu || '—'} mono />
          <Row k="Loja" v={s.storeId} />
        </dl>
      ) : (
        <div className="mt-3 text-xs italic text-slate-400">Sem registro nesta fonte</div>
      )}
    </div>
  );
}

function Row({ k, v, mono }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-400">{k}</dt>
      <dd className={`text-slate-700 ${mono ? 'font-mono' : ''}`}>{v}</dd>
    </div>
  );
}

const ACTIONS = [
  { key: 'aprovar', label: 'Aprovar casamento', cls: 'bg-emerald-600 hover:bg-emerald-700' },
  { key: 'fraude', label: 'Suspeita de fraude', cls: 'bg-red-600 hover:bg-red-700' },
  { key: 'pedir_dados', label: 'Pedir dados à loja', cls: 'bg-brand-blue hover:bg-brand-teal' },
];

function ActionBar({ tx, onActionDone }) {
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  async function run(action) {
    const reason = window.prompt('Justificativa (registrada na auditoria):', '');
    if (reason === null) return; // cancelou
    setBusy(action);
    setMsg(null);
    try {
      await api.postAction(tx.id, {
        action,
        user: 'operador',
        reason,
        scoreAtDecision: tx.reconciliation.score,
        band: tx.reconciliation.band,
      });
      setMsg('Ação registrada com auditoria.');
      onActionDone && onActionDone();
    } catch (e) {
      setMsg(`Falha: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {tx.decision && (
        <div className="mb-2 text-xs text-slate-500">
          Decisão atual: <span className="font-medium text-slate-700">{tx.decision}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.key}
            disabled={busy !== null}
            onClick={() => run(a.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${a.cls}`}
          >
            {busy === a.key ? '…' : a.label}
          </button>
        ))}
      </div>
      {msg && <div className="mt-2 text-xs text-slate-500">{msg}</div>}
    </div>
  );
}
