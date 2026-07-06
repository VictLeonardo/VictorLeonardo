/**
 * Lojas da rede Centro Visão (mock realista — Minas Gerais).
 * Cada loja tem CNPJ próprio, o que impacta a checagem de consistência de loja.
 * type: 'propria' | 'franqueada'
 */

const stores = [
  { id: 'L001', name: 'Centro Visão — Belo Horizonte Centro', city: 'Belo Horizonte', type: 'propria', cnpj: '12.345.678/0001-01' },
  { id: 'L002', name: 'Centro Visão — Savassi', city: 'Belo Horizonte', type: 'propria', cnpj: '12.345.678/0002-82' },
  { id: 'L003', name: 'Centro Visão — Contagem', city: 'Contagem', type: 'propria', cnpj: '12.345.678/0003-63' },
  { id: 'L004', name: 'Centro Visão — Betim', city: 'Betim', type: 'propria', cnpj: '12.345.678/0004-44' },
  { id: 'L005', name: 'Centro Visão — Uberlândia', city: 'Uberlândia', type: 'propria', cnpj: '12.345.678/0005-25' },
  { id: 'L006', name: 'Centro Visão — Juiz de Fora', city: 'Juiz de Fora', type: 'propria', cnpj: '12.345.678/0006-06' },
  { id: 'L007', name: 'Centro Visão — Montes Claros', city: 'Montes Claros', type: 'propria', cnpj: '12.345.678/0007-97' },
  { id: 'L008', name: 'Centro Visão — Uberaba', city: 'Uberaba', type: 'propria', cnpj: '12.345.678/0008-78' },
  { id: 'L009', name: 'Centro Visão — Governador Valadares', city: 'Gov. Valadares', type: 'propria', cnpj: '12.345.678/0009-59' },
  { id: 'L010', name: 'Centro Visão — Ipatinga', city: 'Ipatinga', type: 'propria', cnpj: '12.345.678/0010-90' },
  { id: 'F001', name: 'Centro Visão — Divinópolis (Franquia)', city: 'Divinópolis', type: 'franqueada', cnpj: '98.765.432/0001-11' },
  { id: 'F002', name: 'Centro Visão — Sete Lagoas (Franquia)', city: 'Sete Lagoas', type: 'franqueada', cnpj: '98.765.432/0002-00' },
  { id: 'F003', name: 'Centro Visão — Poços de Caldas (Franquia)', city: 'Poços de Caldas', type: 'franqueada', cnpj: '98.765.432/0003-82' },
  { id: 'F004', name: 'Centro Visão — Pouso Alegre (Franquia)', city: 'Pouso Alegre', type: 'franqueada', cnpj: '98.765.432/0004-63' },
  { id: 'F005', name: 'Centro Visão — Barbacena (Franquia)', city: 'Barbacena', type: 'franqueada', cnpj: '98.765.432/0005-44' },
];

module.exports = { stores };
