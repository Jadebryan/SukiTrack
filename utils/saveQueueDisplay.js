/** @internal Used by OperationQueueIndicator only. */
export function getOperationQueueDisplay(operations) {
  const active = operations.filter((op) => op.status !== 'cancelled');
  if (!active.length) {
    return null;
  }

  const total = active.length;
  const slot = 100 / total;
  let progress = 0;
  let pendingCount = 0;
  let errorCount = 0;

  for (const op of active) {
    if (op.status === 'complete') {
      progress += slot;
    } else if (op.status === 'error') {
      errorCount += 1;
      progress += slot * Math.min(op.fraction ?? 0.5, 1);
    } else if (op.status === 'pending') {
      pendingCount += 1;
      progress += slot * Math.min(Math.max(op.fraction ?? 0.08, 0), 1);
    }
  }

  return {
    progress: Math.min(100, Math.round(progress)),
    hasError: errorCount > 0,
    active: active.find((op) => op.status === 'pending') ?? active[0],
    total,
    pendingCount,
    canCancel: pendingCount > 0,
  };
}
