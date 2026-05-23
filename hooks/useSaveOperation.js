import { useMemo } from 'react';
import { useOperationQueue } from '@/contexts/OperationQueueContext';

/**
 * Run background saves with the global floating SavingProgress bar (see OperationQueueIndicator in app layout).
 *
 * @example
 * const { save, isSaving } = useSaveOperation();
 * void save({
 *   label: t('common_saving'),
 *   task: async () => { await apiCall(); await refresh(); },
 *   onSuccess: () => showToast({ type: 'success', message: t('toast_saved') }),
 *   toastErrorMessage: t('common_error'),
 * });
 */
export function useSaveOperation() {
  const { operations, runOperation, cancelAllOperations } = useOperationQueue();

  const isSaving = useMemo(
    () => operations.some((op) => op.status === 'pending'),
    [operations]
  );

  return {
    save: runOperation,
    cancelSave: cancelAllOperations,
    isSaving,
  };
}
