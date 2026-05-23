import React, { memo, useCallback } from 'react';
import { CustomerCard } from '@/components/CustomerCard';

function HomeCustomerRow({ customer, onCustomerPress, colors }) {
  const onPress = useCallback(
    () => onCustomerPress(customer.id),
    [customer.id, onCustomerPress]
  );
  return <CustomerCard customer={customer} onPress={onPress} colors={colors} />;
}

export default memo(HomeCustomerRow, (prev, next) => {
  const a = prev.customer;
  const b = next.customer;
  return (
    prev.onCustomerPress === next.onCustomerPress &&
    a.id === b.id &&
    a.name === b.name &&
    a.balance === b.balance &&
    a.lastTransactionAt === b.lastTransactionAt &&
    prev.colors === next.colors
  );
});
