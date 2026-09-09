'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PowerOff, QrCode, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, Modal } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';

export function WahaControls({
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

  async function call(action: 'reiniciar' | 'desconectar' | 'qrcode') {
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

  async function loadQr() {
    setQrOpen(true);
    setQr(null);
    const { ok, payload } = await call('qrcode');
    if (!ok) {
      toast(payload.error ?? 'Não foi possível obter o QR Code', 'error');
      return;
    }
    setQr(payload.qr);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => setRestartOpen(true)} disabled={!configured}>
        <RefreshCw className="size-4" aria-hidden="true" />
        Reiniciar instância
      </Button>

      <Button variant="secondary" onClick={() => void loadQr()} disabled={!configured || connected}>
        <QrCode className="size-4" aria-hidden="true" />
        Gerar QR Code
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
        title="Reiniciar a instância WAHA?"
        description="A sessao e' reiniciada e os envios ficam indisponíveis por alguns segundos. A vinculação do número e' preservada."
        confirmLabel="Reiniciar"
        tone="primary"
        loading={pending}
        onConfirm={async () => {
          const { ok, payload } = await call('reiniciar');
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
          const { ok, payload } = await call('desconectar');
          setDisconnectOpen(false);
          toast(ok ? 'Instância desconectada' : (payload.error ?? 'Falha'), ok ? 'success' : 'error');
          router.refresh();
        }}
      />

      <Modal
        open={qrOpen}
        onOpenChange={setQrOpen}
        title="Reconectar o WhatsApp"
        description="Abra o WhatsApp no celular, va em Aparelhos conectados e aponte a camera para o código."
      >
        <div className="flex flex-col items-center gap-4">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL vinda da WAHA
            <img
              src={qr}
              alt="QR Code de pareamento do WhatsApp"
              className="size-64 rounded-md border border-line bg-white p-2"
            />
          ) : (
            <div className="flex size-64 flex-col items-center justify-center gap-2 rounded-md border border-line bg-surface-sunken text-sm text-text-3">
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              Buscando QR Code...
            </div>
          )}
          <Button variant="secondary" onClick={() => void loadQr()} disabled={pending} className="w-full">
            <RefreshCw className="size-4" aria-hidden="true" />
            Atualizar código
          </Button>
        </div>
      </Modal>
    </div>
  );
}
