// Marca Centro Visão.
//
// A logo oficial (centro-visao-logo.png) tem fundo preto — deve ser aplicada
// em um container escuro e NÃO redimensionada de forma que distorça.
//
// Como o PNG oficial não veio junto do código, esta é uma recriação fiel do
// símbolo (anel "C") em SVG usando as cores reais da marca. Para usar o PNG
// oficial: coloque o arquivo em src/assets/centro-visao-logo.png e troque o
// <svg> por <img src={logo} .../> (ver comentário abaixo).
//
// import logoPng from '../assets/centro-visao-logo.png';

export default function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      {/* container escuro obrigatório para a logo (fundo preto da marca) */}
      <div className="flex items-center justify-center rounded-lg bg-brand-dark p-2">
        <svg width={compact ? 34 : 40} height={compact ? 34 : 40} viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id="cvGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3897AF" />
              <stop offset="100%" stopColor="#1C63A1" />
            </linearGradient>
          </defs>
          {/* anel aberto em "C" */}
          <path
            d="M50 12 a38 38 0 1 0 0 76 a38 38 0 0 0 0 -76"
            fill="none"
            stroke="url(#cvGrad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray="150 300"
            transform="rotate(35 50 50)"
          />
          <circle cx="50" cy="50" r="12" fill="url(#cvGrad)" />
        </svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-lg font-bold tracking-wide text-brand-blue">
            CENTRO <span className="text-brand-teal">VISÃO</span>
          </div>
          <div className="text-[11px] italic text-slate-400">Essencialmente Mineiro</div>
        </div>
      )}
    </div>
  );
}
