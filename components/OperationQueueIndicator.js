import React from 'react';
import FloatingSavingOverlay from '@/components/FloatingSavingOverlay';
import SavingProgress from '@/components/SavingProgress';
import { useOperationQueue } from '@/contexts/OperationQueueContext';
import { getOperationQueueDisplay } from '@/utils/saveQueueDisplay';
import { useLocale } from '@/contexts/LocaleContext';

export function OperationQueueIndicator() {
  const { t } = useLocale();
  const { operations, cancelAllOperations } = useOperationQueue();
  const display = getOperationQueueDisplay(operations);

  const statusText = display
    ? display.total > 1
      ? t('common_savingCount', { count: display.total })
      : display.active?.label || t('common_savingUploadSub')
    : '';

  return (
    <FloatingSavingOverlay visible={Boolean(display)}>
      {display ? (
        <SavingProgress
          progress={display.progress}
          statusText={statusText}
          error={display.hasError}
          onCancel={display.canCancel ? cancelAllOperations : undefined}
        />
      ) : null}
    </FloatingSavingOverlay>
  );
}
