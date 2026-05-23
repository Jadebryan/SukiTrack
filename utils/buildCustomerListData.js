function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .trim();
}

function compareCustomers(a, b, sortKey) {
  if (sortKey === 'balance') {
    const diff = (Number(b.balance) || 0) - (Number(a.balance) || 0);
    if (diff !== 0) return diff;
  }
  if (sortKey === 'recent') {
    const ta = new Date(a.lastTransactionAt || 0).getTime();
    const tb = new Date(b.lastTransactionAt || 0).getTime();
    if (tb !== ta) return tb - ta;
  }
  return String(a.name || '').localeCompare(String(b.name || ''), 'en', {
    sensitivity: 'base',
  });
}

export function buildCustomerListData({ customers, loading, filterKey, query }) {
  const nq = normalize(query);
  const hasQuery = Boolean(nq);
  const sortKey = filterKey === 'recent' ? 'recent' : 'balance';

  let unpaid = 0;
  let count = 0;
  let allPaid = 0;
  const filtered = [];

  for (const c of customers) {
    const balance = Number(c.balance) || 0;
    if (balance > 0) {
      unpaid += balance;
      count += 1;
    } else {
      allPaid += Math.abs(balance);
    }

    if (nq) {
      const name = normalize(c.name);
      const phone = normalize(c.phone);
      const addr = normalize(c.address);
      if (!name.includes(nq) && !phone.includes(nq) && !addr.includes(nq)) {
        continue;
      }
    }
    if (filterKey === 'unpaid' && balance <= 0) continue;
    if (filterKey === 'paid' && balance > 0) continue;
    filtered.push(c);
  }

  filtered.sort((a, b) => compareCustomers(a, b, sortKey));

  const totals = {
    unpaid,
    count,
    allPaid,
    totalCustomers: customers.length,
  };

  if (loading && customers.length === 0) {
    if (filterKey === 'all') {
      return {
        totals,
        listData: Array.from({ length: 7 }, (_, i) => ({
          __kind: 'skeleton',
          id: `sk-${i}`,
        })),
        outstandingCount: 0,
      };
    }
    return { totals, listData: [], outstandingCount: 0 };
  }

  if (filterKey === 'all') {
    const outstanding = [];
    const allCustomers = [];
    for (const c of filtered) {
      if (balancePositive(c)) outstanding.push(c);
      else allCustomers.push(c);
    }
    const rowCount = outstanding.length + allCustomers.length;
    if (hasQuery && rowCount === 0 && customers.length > 0 && !loading) {
      return { totals, listData: [], outstandingCount: 0 };
    }
    return {
      totals,
      outstandingCount: outstanding.length,
      listData: [
        { __kind: 'section', id: 'out' },
        ...outstanding,
        { __kind: 'section', id: 'all' },
        ...allCustomers,
      ],
    };
  }

  if (hasQuery && filtered.length === 0 && customers.length > 0 && !loading) {
    return { totals, listData: [], outstandingCount: 0 };
  }

  return { totals, listData: filtered, outstandingCount: 0 };
}

function balancePositive(c) {
  return (Number(c.balance) || 0) > 0;
}
