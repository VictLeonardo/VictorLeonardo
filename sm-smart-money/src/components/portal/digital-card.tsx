'use client';

import * as React from 'react';
import QRCode from 'qrcode';
import { QrCode, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';

/**
 * Cartão digital: compartilha a URL do perfil pelo share nativo do dispositivo e,
 * onde ele nao existe (desktop), copia o link. O QR Code e' gerado no cliente —
 * o endereco do membro nao passa por servico externo.
 */
export function DigitalCard({ slug, name }: { slug: string; name: string }) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  // { qr, url } chegam juntos do mesmo efeito assincrono: nenhum setState
  // sincrono no corpo do efeito.
  const [card, setCard] = React.useState<{ qr: string; url: string } | null>(null);
  const qr = card?.qr ?? null;
  const url = card?.url ?? '';

  React.useEffect(() => {
    if (!open) {
      return;
    }
    let active = true;
    const target = `${window.location.origin}/${slug}`;
    QRCode.toDataURL(target, {
      width: 512,
      margin: 1,
      color: { dark: '#02201f', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (active) setCard({ qr: dataUrl, url: target });
      })
      .catch(() => {
        if (active) setCard(null);
      });
    return () => {
      active = false;
    };
  }, [open, slug]);

  async function share() {
    const target = `${window.location.origin}/${slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${name} · SM Smart Money`, url: target });
        return;
      } catch {
        // Compartilhamento cancelado pelo usuario — cai para a copia do link.
      }
    }
    await navigator.clipboard.writeText(target);
    toast('Link do perfil copiado', 'success');
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <QrCode className="size-4" aria-hidden="true" />
        Cartão digital
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Cartão digital"
        description="Aponte a camera para abrir o perfil, ou compartilhe o link direto."
      >
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

          <p className="break-all text-center font-mono text-xs text-text-2">{url}</p>

          <Button type="button" onClick={() => void share()} className="w-full">
            <Share2 className="size-4" aria-hidden="true" />
            Compartilhar perfil
          </Button>
        </div>
      </Modal>
    </>
  );
}
