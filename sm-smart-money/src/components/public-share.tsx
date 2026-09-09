'use client';

import * as React from 'react';
import QRCode from 'qrcode';
import { QrCode, Share2 } from 'lucide-react';
import { Modal } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';

/** Cartão digital na versao publica do perfil: QR Code + share nativo. */
export function PublicShare({ name, slug }: { name: string; slug: string }) {
  const [open, setOpen] = React.useState(false);
  const [qr, setQr] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    QRCode.toDataURL(`${window.location.origin}/${slug}`, {
      width: 512,
      margin: 1,
      color: { dark: '#16150f', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (active) setQr(dataUrl);
      })
      .catch(() => {
        if (active) setQr(null);
      });
    return () => {
      active = false;
    };
  }, [open, slug]);

  async function share() {
    const url = `${window.location.origin}/${slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${name} · SM Smart Money`, url });
        return;
      } catch {
        // Cancelado — segue para a copia.
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-medium text-[var(--color-brand-contrast)] transition-colors hover:bg-brand-strong hover:text-white"
      >
        <QrCode className="size-4" aria-hidden="true" />
        Cartão digital
      </button>

      <Modal open={open} onOpenChange={setOpen} title="Cartão digital" description={name}>
        <div className="flex flex-col items-center gap-4">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL gerada no cliente
            <img
              src={qr}
              alt={`QR Code do perfil de ${name}`}
              className="size-56 rounded-md border border-line bg-white p-2"
            />
          ) : (
            <div className="grid size-56 place-items-center rounded-md border border-line bg-surface-sunken text-sm text-text-3">
              Gerando QR Code...
            </div>
          )}
          <Button type="button" onClick={() => void share()} className="w-full">
            <Share2 className="size-4" aria-hidden="true" />
            {copied ? 'Link copiado' : 'Compartilhar perfil'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
