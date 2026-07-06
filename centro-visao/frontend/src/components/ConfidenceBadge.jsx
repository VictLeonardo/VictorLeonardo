// Badge de confiança colorido: vermelho/baixa, amarelo/média, verde/alta.

const styles = {
  high: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Alta' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Média' },
  low: { bg: 'bg-red-100', text: 'text-red-700', label: 'Baixa' },
};

export default function ConfidenceBadge({ band, score }) {
  const s = styles[band] || styles.low;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
      {typeof score === 'number' && <span className="font-mono">{score}%</span>}
    </span>
  );
}
