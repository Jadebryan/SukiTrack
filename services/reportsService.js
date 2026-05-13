import { toJsDate } from '@/utils/date';

function sumPaymentsInRangeFromPages(pages, start, end) {
  const s = start.getTime();
  const e = end.getTime();
  let total = 0;
  for (const p of pages) {
    for (const pay of p.payments || []) {
      const d = toJsDate(pay.createdAt);
      if (!d) continue;
      const x = d.getTime();
      if (x >= s && x <= e) {
        total += Number(pay.amount) || 0;
      }
    }
  }
  return total;
}

function sumUtangItemsInRangeFromPages(pages, start, end) {
  const s = start.getTime();
  const e = end.getTime();
  let total = 0;
  for (const p of pages) {
    for (const it of p.items || []) {
      const d = toJsDate(it.createdAt);
      if (!d) continue;
      const x = d.getTime();
      if (x >= s && x <= e) {
        total += Number(it.amount) || 0;
      }
    }
  }
  return total;
}

function sumAllPaymentsFromPages(pages) {
  let total = 0;
  for (const p of pages) {
    for (const pay of p.payments || []) {
      total += Number(pay.amount) || 0;
    }
  }
  return total;
}

function sumAllUtangItemsFromPages(pages) {
  let total = 0;
  for (const p of pages) {
    for (const it of p.items || []) {
      total += Number(it.amount) || 0;
    }
  }
  return total;
}

function bucket(payments, utangAdded) {
  return {
    payments,
    utangAdded,
    net: payments - utangAdded,
  };
}

export function buildReportSummary(customers, pages, now = new Date()) {
  const unpaidCustomerCount = customers.reduce((acc, c) => {
    const b = Number(c.balance) || 0;
    return acc + (b > 0 ? 1 : 0);
  }, 0);

  const totalUnpaid = customers.reduce((acc, c) => {
    const b = Number(c.balance) || 0;
    return acc + (b > 0 ? b : 0);
  }, 0);

  const totalCollected = sumAllPaymentsFromPages(pages);
  const allTimeUtangAdded = sumAllUtangItemsFromPages(pages);

  const startDay = new Date(now);
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(startDay);
  endDay.setHours(23, 59, 59, 999);

  const startWeek = new Date(startDay);
  const dow = startWeek.getDay();
  startWeek.setDate(startWeek.getDate() - ((dow + 6) % 7));

  const endWeek = new Date(startWeek);
  endWeek.setDate(endWeek.getDate() + 7);
  endWeek.setMilliseconds(-1);

  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  endMonth.setMilliseconds(-1);

  const dPay = sumPaymentsInRangeFromPages(pages, startDay, endDay);
  const dUtang = sumUtangItemsInRangeFromPages(pages, startDay, endDay);
  const wPay = sumPaymentsInRangeFromPages(pages, startWeek, endWeek);
  const wUtang = sumUtangItemsInRangeFromPages(pages, startWeek, endWeek);
  const mPay = sumPaymentsInRangeFromPages(pages, startMonth, endMonth);
  const mUtang = sumUtangItemsInRangeFromPages(pages, startMonth, endMonth);

  return {
    unpaidCustomerCount,
    totalUnpaid,
    totalCollected,
    allTimeUtangAdded,
    daily: bucket(dPay, dUtang),
    weekly: bucket(wPay, wUtang),
    monthly: bucket(mPay, mUtang),
    allTime: bucket(totalCollected, allTimeUtangAdded),
  };
}
