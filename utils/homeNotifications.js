const OVERDUE_DAYS = 30;
const OVERDUE_LIMIT = 8;
const RECENT_LIMIT = 10;

/** Overdue customers for the bell sheet — call only when the sheet is open. */
export function buildOverdueCustomers(customers) {
  const now = Date.now();
  const cutoff = now - OVERDUE_DAYS * 24 * 60 * 60 * 1000;

  return customers
    .filter((c) => (Number(c.balance) || 0) > 0)
    .map((c) => {
      const ts = new Date(c.lastTransactionAt || 0).getTime() || 0;
      const days = ts
        ? Math.max(0, Math.floor((now - ts) / (24 * 60 * 60 * 1000)))
        : 999;
      return { customer: c, ts, days };
    })
    .filter((x) => x.ts === 0 || x.ts < cutoff)
    .sort((a, b) => {
      if (b.days !== a.days) return b.days - a.days;
      return (Number(b.customer.balance) || 0) - (Number(a.customer.balance) || 0);
    })
    .slice(0, OVERDUE_LIMIT);
}

/** Recent tx events for the bell sheet — call only when the sheet is open. */
export function buildRecentActivity(pages, customers, labels) {
  const byId = new Map(customers.map((c) => [c.id, c]));
  const events = [];

  for (const p of pages || []) {
    const cust = byId.get(p.customerId);
    const customerName = cust?.name || labels.customerFallback;

    for (const it of p.items || []) {
      const ts = new Date(it.createdAt || 0).getTime() || 0;
      if (!ts) continue;
      events.push({
        id: `i-${p.id}-${it.id}`,
        kind: 'utang',
        customerId: p.customerId,
        customerName,
        title: it.description || labels.utangFallback,
        amount: Number(it.amount) || 0,
        ts,
      });
    }

    for (const pay of p.payments || []) {
      const ts = new Date(pay.createdAt || 0).getTime() || 0;
      if (!ts) continue;
      const note = pay.note ? String(pay.note).trim() : '';
      events.push({
        id: `p-${p.id}-${pay.id}`,
        kind: 'payment',
        customerId: p.customerId,
        customerName,
        title: note
          ? `${labels.paymentFallback} · ${note}`
          : labels.paymentFallback,
        amount: Number(pay.amount) || 0,
        ts,
      });
    }
  }

  return events.sort((a, b) => b.ts - a.ts).slice(0, RECENT_LIMIT);
}
