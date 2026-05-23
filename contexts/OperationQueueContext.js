import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';

const OperationQueueContext = createContext(null);

const CREEP_INTERVAL_MS = 80;
const CREEP_MAX_FRACTION = 0.9;

/** Queue + global SavingProgress UI. Prefer `useSaveOperation()` in screens and modals. */
export function OperationQueueProvider({ children }) {
  const { showToast } = useToast();
  const { t } = useLocale();
  const [operations, setOperations] = useState([]);
  const mountedRef = useRef(false);
  const cleanupTimers = useRef([]);
  const creepTimers = useRef(new Map());
  const cancelledIds = useRef(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupTimers.current.forEach(clearTimeout);
      cleanupTimers.current = [];
      creepTimers.current.forEach(clearInterval);
      creepTimers.current.clear();
    };
  }, []);

  const patchOperation = useCallback((id, patch) => {
    setOperations((prev) =>
      prev.map((op) => (op.id === id ? { ...op, ...patch } : op))
    );
  }, []);

  const stopCreep = useCallback((id) => {
    const timer = creepTimers.current.get(id);
    if (timer) {
      clearInterval(timer);
      creepTimers.current.delete(id);
    }
  }, []);

  const startProgressCreep = useCallback(
    (id) => {
      stopCreep(id);
      const startedAt = Date.now();
      const timer = setInterval(() => {
        if (!mountedRef.current || cancelledIds.current.has(id)) {
          stopCreep(id);
          return;
        }
        setOperations((prev) =>
          prev.map((op) => {
            if (op.id !== id || op.status !== 'pending') {
              return op;
            }
            const elapsed = Date.now() - startedAt;
            const eased = 1 - Math.exp(-elapsed / 2200);
            const fraction = Math.min(
              CREEP_MAX_FRACTION,
              0.12 + eased * (CREEP_MAX_FRACTION - 0.12)
            );
            return { ...op, fraction };
          })
        );
      }, CREEP_INTERVAL_MS);
      creepTimers.current.set(id, timer);
    },
    [stopCreep]
  );

  const removeOperation = useCallback(
    (id) => {
      stopCreep(id);
      cancelledIds.current.delete(id);
      setOperations((prev) => prev.filter((op) => op.id !== id));
    },
    [stopCreep]
  );

  const scheduleRemoval = useCallback(
    (id, delay = 4000) => {
      const timer = setTimeout(() => {
        if (!mountedRef.current) return;
        removeOperation(id);
        cleanupTimers.current = cleanupTimers.current.filter((item) => item !== timer);
      }, delay);
      cleanupTimers.current.push(timer);
    },
    [removeOperation]
  );

  const cancelAllOperations = useCallback(() => {
    let hadPending = false;
    setOperations((prev) => {
      prev.forEach((op) => {
        if (op.status === 'pending') {
          hadPending = true;
          cancelledIds.current.add(op.id);
          stopCreep(op.id);
        }
      });
      return prev.filter((op) => op.status !== 'pending');
    });
    if (hadPending) {
      showToast({ type: 'info', message: t('toast_saveCancelled') });
    }
  }, [stopCreep, showToast, t]);

  const runOperation = useCallback(
    async ({
      label,
      task,
      onSuccess,
      onFailure,
      toastErrorMessage,
      retryLabel,
    }) => {
      const id = `op-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setOperations((prev) => [
        ...prev,
        {
          id,
          label: label || t('common_saving'),
          status: 'pending',
          fraction: 0.08,
          retry: null,
        },
      ]);

      const retry = () =>
        runOperation({
          label,
          task,
          onSuccess,
          onFailure,
          toastErrorMessage,
          retryLabel,
        });

      setOperations((prev) =>
        prev.map((op) => (op.id === id ? { ...op, retry } : op))
      );

      startProgressCreep(id);

      const finishCancelled = () => {
        stopCreep(id);
        cancelledIds.current.delete(id);
        removeOperation(id);
      };

      const complete = () => {
        if (!mountedRef.current) return;
        stopCreep(id);
        patchOperation(id, { status: 'complete', fraction: 1 });
        scheduleRemoval(id, 300);
      };

      const fail = (error) => {
        if (!mountedRef.current) return;
        stopCreep(id);
        setOperations((prev) =>
          prev.map((op) =>
            op.id === id ? { ...op, status: 'error', error, retry, fraction: op.fraction ?? 0.5 } : op
          )
        );
        showToast({
          type: 'error',
          message: toastErrorMessage || t('toast_saveFailedRetry'),
          actionLabel: retryLabel || t('common_retry'),
          onAction: retry,
        });
        scheduleRemoval(id, 6000);
      };

      try {
        patchOperation(id, { fraction: 0.22 });
        const result = await task();

        if (cancelledIds.current.has(id)) {
          finishCancelled();
          return undefined;
        }

        complete();
        if (onSuccess) {
          await onSuccess(result);
        }
        return result;
      } catch (error) {
        if (cancelledIds.current.has(id)) {
          finishCancelled();
          return undefined;
        }
        fail(error);
        if (onFailure) {
          await onFailure(error);
        }
        throw error;
      }
    },
    [
      showToast,
      scheduleRemoval,
      startProgressCreep,
      stopCreep,
      patchOperation,
      removeOperation,
      t,
    ]
  );

  const value = useMemo(
    () => ({ operations, runOperation, cancelAllOperations }),
    [operations, runOperation, cancelAllOperations]
  );

  return (
    <OperationQueueContext.Provider value={value}>
      {children}
    </OperationQueueContext.Provider>
  );
}

export function useOperationQueue() {
  const ctx = useContext(OperationQueueContext);
  if (!ctx) {
    throw new Error('useOperationQueue must be used within OperationQueueProvider');
  }
  return ctx;
}
