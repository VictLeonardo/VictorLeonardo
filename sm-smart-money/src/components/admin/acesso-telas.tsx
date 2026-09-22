'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { Tier } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { TIER_LABELS } from '@/lib/domain';

type Tela = { href: string; label: string };

/**
 * Quais telas do portal cada nivel de acesso abre.
 *
 * Uma grade, e nao uma lista por tier, porque a pergunta que o admin faz e'
 * sempre comparativa: "quem ve' Analises?". Numa lista por tier isso exigiria
 * abrir tres listas e cruzar de cabeca.
 */
export function AcessoTelas({
  telas,
  tiers,
  inicial,
}: {
  telas: Tela[];
  tiers: Tier[];
  inicial: Record<string, Tier[]>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [matriz, setMatriz] = React.useState(inicial);
  const [salvando, setSalvando] = React.useState(false);

  // O que esta' na tela ainda e' o que esta' gravado?
  const mudou = React.useMemo(
    () =>
      telas.some(
        (t) =>
          (matriz[t.href] ?? []).slice().sort().join() !==
          (inicial[t.href] ?? []).slice().sort().join(),
      ),
    [matriz, inicial, telas],
  );

  function alternar(href: string, tier: Tier) {
    setMatriz((atual) => {
      const marcados = atual[href] ?? [];
      return {
        ...atual,
        [href]: marcados.includes(tier)
          ? marcados.filter((t) => t !== tier)
          : [...marcados, tier],
      };
    });
  }

  async function salvar() {
    setSalvando(true);
    const res = await fetch('/api/admin/acesso', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matriz }),
    });
    const payload = await res.json().catch(() => ({}));
    setSalvando(false);

    if (!res.ok) {
      toast(payload.error ?? 'Não foi possível salvar', 'error');
      return;
    }
    toast('Acesso por tela atualizado', 'success');
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-text-1">Acesso por tela</h2>
        <p className="mt-1 text-sm text-text-2">
          Marque quais níveis abrem cada tela do portal. Quem não tem acesso deixa de ver a tela no
          menu e é levado de volta se tentar abrir o endereço direto. Administradores enxergam tudo.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-text-3">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Tela
                </th>
                {tiers.map((tier) => (
                  <th key={tier} scope="col" className="px-3 py-2 text-center font-medium">
                    {TIER_LABELS[tier]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {telas.map((tela) => {
                const marcados = matriz[tela.href] ?? [];
                return (
                  <tr key={tela.href} className="border-b border-line last:border-0">
                    <th scope="row" className="py-2.5 pr-4 font-normal text-text-1">
                      {tela.label}
                      <span className="ml-2 text-xs text-text-3">{tela.href}</span>
                    </th>
                    {tiers.map((tier) => (
                      <td key={tier} className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={marcados.includes(tier)}
                          onChange={() => alternar(tela.href, tier)}
                          aria-label={`${TIER_LABELS[tier]} abre ${tela.label}`}
                          className="size-4 rounded border-line-strong accent-[var(--color-brand-strong)]"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          {mudou ? <span className="text-xs text-text-3">Há alterações não salvas.</span> : null}
          <Button type="button" onClick={() => void salvar()} disabled={!mudou || salvando}>
            {salvando ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Salvar acesso
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
