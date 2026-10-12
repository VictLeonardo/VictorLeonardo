'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, PowerOff, QrCode, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, Modal } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';

/**
 * O WhatsApp invalida o QR Code a cada vinte segundos. Renovamos antes disso,
 * porque entre abrir o modal e apontar a camera se passa justamente esse tempo:
 * a pessoa precisa pegar o celular, abrir o aplicativo e achar "Aparelhos
 * conectados". Um codigo buscado uma vez so' ja' esta' morto quando a camera
 * chega nele.
 */
const RENOVAR_QR_MS = 15_000;

/** Quem percebe que o pareamento deu certo e' a tela, nao a pessoa. */
const CONSULTAR_ESTADO_MS = 3_000;

/**
 * Depois disso o modal para de renovar e de consultar.
 *
 * Nao e' economia: e' que um modal esquecido aberto numa aba consultaria o
 * Z-API para sempre, e dois minutos sem parear significa que ninguem esta'
 * mais do outro lado.
 */
const DESISTIR_MS = 120_000;

export function WhatsappControls({
  connected,
  configured,
}: {
  connected: boolean;
  configured: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [restartOpen, setRestartOpen] = React.useState(false);
  const [disconnectOpen, setDisconnectOpen] = React.useState(false);

  const [qrOpen, setQrOpen] = React.useState(false);
  const [qr, setQr] = React.useState<string | null>(null);
  const [expirou, setExpirou] = React.useState(false);
  const [pareou, setPareou] = React.useState(false);
  // Trocar este numero reinicia o ciclo de renovacao e consulta.
  const [tentativa, setTentativa] = React.useState(0);

  async function acao(action: 'reiniciar' | 'desconectar') {
    setPending(true);
    const res = await fetch('/api/admin/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const payload = await res.json().catch(() => ({}));
    setPending(false);
    return { ok: res.ok, payload } as const;
  }

  function abrirConexao() {
    setQr(null);
    setExpirou(false);
    setPareou(false);
    setTentativa((n) => n + 1);
    setQrOpen(true);
  }

  React.useEffect(() => {
    if (!qrOpen) return;

    let ativo = true;
    const inicio = Date.now();

    const desistir = () => {
      ativo = false;
      setExpirou(true);
    };

    async function renovarQr() {
      const res = await fetch('/api/admin/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'qrcode' }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!ativo) return;
      if (res.ok && payload.qr) setQr(payload.qr);
    }

    async function consultarEstado() {
      const res = await fetch('/api/admin/whatsapp');
      const estado = await res.json().catch(() => ({}));
      if (!ativo || !res.ok) return;
      if (estado.connected) {
        // Pareou: para tudo, mostra o aviso e deixa a pessoa ler antes de o
        // modal sair da frente.
        ativo = false;
        setPareou(true);
        toast('WhatsApp conectado', 'success');
        router.refresh();
        setTimeout(() => setQrOpen(false), 2200);
      }
    }

    void renovarQr();

    const relogio = setInterval(() => {
      if (!ativo) return;
      if (Date.now() - inicio > DESISTIR_MS) {
        desistir();
        return;
      }
      void renovarQr();
    }, RENOVAR_QR_MS);

    const sonda = setInterval(() => {
      if (!ativo) return;
      void consultarEstado();
    }, CONSULTAR_ESTADO_MS);

    return () => {
      ativo = false;
      clearInterval(relogio);
      clearInterval(sonda);
    };
    // `tentativa` entra para que "tentar de novo" recomece o ciclo.
  }, [qrOpen, tentativa, router, toast]);

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => setRestartOpen(true)} disabled={!configured}>
        <RefreshCw className="size-4" aria-hidden="true" />
        Reiniciar instância
      </Button>

      <Button variant="secondary" onClick={abrirConexao} disabled={!configured || connected}>
        <QrCode className="size-4" aria-hidden="true" />
        Conectar número
      </Button>

      <Button
        variant="ghost"
        className="text-danger"
        onClick={() => setDisconnectOpen(true)}
        disabled={!configured || !connected}
      >
        <PowerOff className="size-4" aria-hidden="true" />
        Desconectar
      </Button>

      <ConfirmDialog
        open={restartOpen}
        onOpenChange={setRestartOpen}
        title="Reiniciar a instância de WhatsApp?"
        description="A sessão é reiniciada e os envios ficam indisponíveis por alguns segundos. A vinculação do número é preservada."
        confirmLabel="Reiniciar"
        tone="primary"
        loading={pending}
        onConfirm={async () => {
          const { ok, payload } = await acao('reiniciar');
          setRestartOpen(false);
          toast(ok ? 'Instância reiniciada' : (payload.error ?? 'Falha ao reiniciar'), ok ? 'success' : 'error');
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        title="Desconectar o WhatsApp?"
        description="Todos os disparos param até que o número seja vinculado de novo por QR Code."
        confirmLabel="Desconectar"
        loading={pending}
        onConfirm={async () => {
          const { ok, payload } = await acao('desconectar');
          setDisconnectOpen(false);
          toast(ok ? 'Instância desconectada' : (payload.error ?? 'Falha'), ok ? 'success' : 'error');
          router.refresh();
        }}
      />

      <Modal
        open={qrOpen}
        onOpenChange={setQrOpen}
        title="Conectar o WhatsApp"
        description="No celular, abra o WhatsApp, vá em Aparelhos conectados, toque em Conectar um aparelho e aponte a câmera para o código."
      >
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-64 flex-col items-center justify-center gap-2 rounded-md border border-line bg-surface-sunken p-2 text-center text-sm text-text-3">
            {pareou ? (
              <>
                <CheckCircle2 className="size-8 text-positive" aria-hidden="true" />
                <span className="font-medium text-text-1">Número conectado</span>
              </>
            ) : expirou ? (
              <>
                <span className="font-medium text-text-1">O código expirou</span>
                <span>Ninguém leu a tempo. Gere um novo para tentar de novo.</span>
              </>
            ) : qr ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL vinda do provedor
              <img
                src={qr}
                alt="QR Code de pareamento do WhatsApp"
                className="size-full rounded bg-white p-2"
              />
            ) : (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                Buscando o código...
              </>
            )}
          </div>

          {pareou ? null : expirou ? (
            <Button variant="secondary" onClick={abrirConexao} className="w-full">
              <RefreshCw className="size-4" aria-hidden="true" />
              Gerar um novo código
            </Button>
          ) : (
            <p className="text-center text-xs leading-relaxed text-text-3">
              O código se renova sozinho a cada 15 segundos, e esta tela avisa
              assim que o número conectar. Pode deixar aberta.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
