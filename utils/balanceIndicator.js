import { HIGH_BALANCE_PESO } from '@/constants/thresholds';
import { balanceHigh, balanceMedium, balancePaid } from '@/constants/theme';

/**
 * @returns {'paid' | 'medium' | 'high'}
 */
export function getBalanceIndicator(balance) {
  const b = Number(balance) || 0;
  if (b <= 0) return 'paid';
  if (b >= HIGH_BALANCE_PESO) return 'high';
  return 'medium';
}

export function getBalanceColor(balance) {
  const k = getBalanceIndicator(balance);
  if (k === 'paid') return balancePaid;
  if (k === 'high') return balanceHigh;
  return balanceMedium;
}
