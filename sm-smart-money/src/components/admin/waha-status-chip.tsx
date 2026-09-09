import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { WahaStatus } from '@/lib/waha';
import { WAHA_STATE_LABELS } from '@/lib/waha';
import { cn } from '@/lib/utils';

/**
 * Estado da instancia WAHA em tempo real. Icone + texto: o estado nunca depende
 * apenas da cor.
 */
export function WahaStatusChip({ status }: { status: WahaStatus }) {
  const label = WAHA_STATE_LABELS[status.state] ?? status.state;

  return (
    <Link
      href="/admin/whatsapp"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        status.connected
          ? 'border-positive/40 bg-positive/10 text-positive hover:bg-positive/15'
          : 'border-danger/40 bg-danger/10 text-danger hover:bg-danger/15',
      )}
    >
      {status.connected ? (
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
      ) : (
        <XCircle className="size-3.5" aria-hidden="true" />
      )}
      WhatsApp: {label}
    </Link>
  );
}
