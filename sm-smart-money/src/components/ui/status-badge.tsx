import type { MemberStatus, Plan, Tier } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { PLAN_LABELS, STATUS_LABELS } from '@/lib/domain';

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

export function TierBadge({ tier }: { tier: Tier }) {
  if (tier !== 'VIP') return null;
  return <Badge tone="brand">VIP</Badge>;
}
