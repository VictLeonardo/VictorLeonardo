/**
 * Status de infraestrutura das câmeras por loja (mock).
 * Câmeras Intelbras, ~40 unidades. Esta fase é apenas STATUS de infraestrutura
 * (não há processamento de vídeo nem métricas de cliente).
 *
 * Campos:
 *  - apiActive: acesso via API/IP disponível
 *  - cardLocal: depende de gravação em cartão local (SD)
 *  - ipType: 'fixo' | 'dinamico'
 *  - status: 'online' | 'offline' | 'instavel'
 *  - notes: observações (baixa iluminação, ângulo, etc.)
 */

const cameras = [
  { id: 'CAM-L001-1', storeId: 'L001', storeName: 'BH Centro', model: 'Intelbras VIP 3230', apiActive: true, cardLocal: true, ipType: 'fixo', status: 'online', notes: '' },
  { id: 'CAM-L001-2', storeId: 'L001', storeName: 'BH Centro', model: 'Intelbras VIP 1230', apiActive: true, cardLocal: false, ipType: 'fixo', status: 'online', notes: '' },
  { id: 'CAM-L002-1', storeId: 'L002', storeName: 'Savassi', model: 'Intelbras VIP 3230', apiActive: true, cardLocal: true, ipType: 'fixo', status: 'online', notes: '' },
  { id: 'CAM-L002-2', storeId: 'L002', storeName: 'Savassi', model: 'Intelbras VIP 1130 B', apiActive: false, cardLocal: true, ipType: 'dinamico', status: 'instavel', notes: 'IP dinâmico — cai o acesso remoto ao reiniciar o roteador.' },
  { id: 'CAM-L003-1', storeId: 'L003', storeName: 'Contagem', model: 'Intelbras VIP 3230', apiActive: true, cardLocal: true, ipType: 'fixo', status: 'online', notes: '' },
  { id: 'CAM-L003-2', storeId: 'L003', storeName: 'Contagem', model: 'Intelbras VIP 1230 B', apiActive: false, cardLocal: true, ipType: 'dinamico', status: 'offline', notes: 'Sem API — apenas gravação local em cartão SD.' },
  { id: 'CAM-L004-1', storeId: 'L004', storeName: 'Betim', model: 'Intelbras VIP 3230', apiActive: true, cardLocal: true, ipType: 'fixo', status: 'online', notes: 'Baixa iluminação no período noturno.' },
  { id: 'CAM-L005-1', storeId: 'L005', storeName: 'Uberlândia', model: 'Intelbras VIP 3230', apiActive: true, cardLocal: true, ipType: 'fixo', status: 'online', notes: '' },
  { id: 'CAM-L005-2', storeId: 'L005', storeName: 'Uberlândia', model: 'Intelbras VIP 1130 B', apiActive: true, cardLocal: false, ipType: 'fixo', status: 'online', notes: '' },
  { id: 'CAM-L006-1', storeId: 'L006', storeName: 'Juiz de Fora', model: 'Intelbras VIP 1230 B', apiActive: false, cardLocal: true, ipType: 'dinamico', status: 'instavel', notes: 'IP dinâmico sem DDNS configurado.' },
  { id: 'CAM-L007-1', storeId: 'L007', storeName: 'Montes Claros', model: 'Intelbras VIP 3230', apiActive: true, cardLocal: true, ipType: 'fixo', status: 'online', notes: '' },
  { id: 'CAM-L007-2', storeId: 'L007', storeName: 'Montes Claros', model: 'Intelbras VIP 1130 B', apiActive: false, cardLocal: true, ipType: 'dinamico', status: 'offline', notes: 'Câmera do estoque — ângulo ruim, cobre só a porta.' },
  { id: 'CAM-L008-1', storeId: 'L008', storeName: 'Uberaba', model: 'Intelbras VIP 3230', apiActive: true, cardLocal: true, ipType: 'fixo', status: 'online', notes: '' },
  { id: 'CAM-L009-1', storeId: 'L009', storeName: 'Gov. Valadares', model: 'Intelbras VIP 1230 B', apiActive: false, cardLocal: true, ipType: 'dinamico', status: 'offline', notes: 'Depende só de cartão local — sem acesso remoto.' },
  { id: 'CAM-L010-1', storeId: 'L010', storeName: 'Ipatinga', model: 'Intelbras VIP 3230', apiActive: true, cardLocal: true, ipType: 'fixo', status: 'online', notes: '' },
  { id: 'CAM-L010-2', storeId: 'L010', storeName: 'Ipatinga', model: 'Intelbras VIP 1130 B', apiActive: true, cardLocal: false, ipType: 'fixo', status: 'instavel', notes: 'Perde conexão em horário de pico de rede.' },
  { id: 'CAM-F001-1', storeId: 'F001', storeName: 'Divinópolis', model: 'Intelbras VIP 3230', apiActive: true, cardLocal: true, ipType: 'fixo', status: 'online', notes: 'Franquia — acesso concedido pelo franqueado.' },
  { id: 'CAM-F002-1', storeId: 'F002', storeName: 'Sete Lagoas', model: 'Intelbras VIP 1230 B', apiActive: false, cardLocal: true, ipType: 'dinamico', status: 'offline', notes: 'Franquia — sem API liberada ainda.' },
  { id: 'CAM-F003-1', storeId: 'F003', storeName: 'Poços de Caldas', model: 'Intelbras VIP 3230', apiActive: true, cardLocal: true, ipType: 'fixo', status: 'online', notes: '' },
  { id: 'CAM-F004-1', storeId: 'F004', storeName: 'Pouso Alegre', model: 'Intelbras VIP 1130 B', apiActive: false, cardLocal: true, ipType: 'dinamico', status: 'instavel', notes: 'Baixa iluminação + IP dinâmico.' },
  { id: 'CAM-F005-1', storeId: 'F005', storeName: 'Barbacena', model: 'Intelbras VIP 1230 B', apiActive: false, cardLocal: true, ipType: 'dinamico', status: 'offline', notes: 'Franquia — apenas gravação local.' },
];

module.exports = { cameras };
