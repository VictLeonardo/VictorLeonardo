import type { MemberStatus, Plan, Tier } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { PLAN_LABELS, STATUS_LABELS, TIER_LABELS } from '@/lib/domain';

const STATUS_TONE = {
  ATIVO: 'positive',
  CANCELADO: 'danger',
  PENDENTE: 'warning',
} as const;

export function StatusBadge({ status }: { status: MemberStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function PlanBadge({ plan }: { plan: Plan }) {
  return <Badge tone={plan === 'CORTESIA' ? 'info' : 'neutral'}>{PLAN_LABELS[plan]}</Badge>;
}

/**
 * Padrao nao rende selo: e' o caso comum, e um selo em todo mundo nao distingue
 * ninguem. Os demais tem tom proprio para se diferenciarem de relance na lista.
 */
// Os dois rendem selo: com apenas dois niveis, nenhum e' "o caso comum" que
// dispensaria a marcacao, e distinguir de relance na lista e' o que se quer.
const TIER_TONE = {
  VIP: 'brand',
  ACADEMY: 'info',
} as const;

export function TierBadge({ tier }: { tier: Tier }) {
  return <Badge tone={TIER_TONE[tier]}>{TIER_LABELS[tier]}</Badge>;
}
