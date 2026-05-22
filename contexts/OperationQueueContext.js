import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Portal, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';

const OperationQueueContext = createContext(null);

export function OperationQueueProvider({ children }) {
  const { showToast } = useToast();
  const { t } = useLocale();
  const [operations, setOperations] = useState([]);
  const mountedRef = useRef(false);
  const cleanupTimers = useRef([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupTimers.current.forEach(clearTimeout);
      cleanupTimers.current = [];
    };
  }, []);

  const removeOperation = useCallback((id) => {
    setOperations((prev) => prev.filter((op) => op.id !== id));
  }, []);

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
        { id, label: label || t('common_saving'), status: 'pending', retry: null },
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

      const complete = () => {
        if (!mountedRef.current) return;
        setOperations((prev) =>
          prev.map((op) => (op.id === id ? { ...op, status: 'complete' } : op))
        );
        scheduleRemoval(id, 300);
      };

      const fail = (error) => {
        if (!mountedRef.current) return;
        setOperations((prev) =>
          prev.map((op) =>
            op.id === id ? { ...op, status: 'error', error, retry } : op
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
        const result = await task();
        complete();
        if (onSuccess) {
          await onSuccess(result);
        }
        return result;
      } catch (error) {
        fail(error);
        if (onFailure) {
          await onFailure(error);
        }
        throw error;
      }
    },
    [showToast, scheduleRemoval, t]
  );

  const value = useMemo(
    () => ({ operations, runOperation }),
    [operations, runOperation]
  );

  return (
    <OperationQueueContext.Provider value={value}>
      {children}
      <OperationQueueIndicator operations={operations} />
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

function OperationQueueIndicator({ operations }) {
  const theme = useTheme();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  const pending = operations.some((op) => op.status === 'pending');
  const error = operations.some((op) => op.status === 'error');
  const complete = operations.some((op) => op.status === 'complete');
  const active = operations[0];

  useEffect(() => {
    const animateProgress = () => {
      progress.setValue(0);
      return Animated.loop(
        Animated.timing(progress, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: false,
        })
      );
    };

    let animation;
    if (pending) {
      animation = animateProgress();
      animation.start();
    } else if (error || complete) {
      animation = Animated.timing(progress, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      });
      animation.start();
    } else {
      progress.setValue(0);
    }

    return () => {
      animation?.stop();
    };
  }, [complete, error, pending, progress]);

  if (!operations.length) {
    return null;
  }

  const label =
    operations.length > 1
      ? t('common_savingCount', { count: operations.length })
      : active?.label || t('common_saving');

  const barColor = error ? theme.colors.error : theme.colors.primary;

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Portal>
      <View style={[styles.container, { top: 0 }]}> 
        <View style={[styles.inner, { paddingTop: insets.top }]}> 
          <View style={styles.metaRow}>
            <Text style={[styles.label, { color: theme.colors.onSurface }]}> {label} </Text>
            {operations.length > 1 ? (
              <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}> 
                <Text style={styles.badgeText}>{operations.length}</Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.barBackground, { backgroundColor: 'rgba(0,0,0,0.08)' }]}> 
            <Animated.View style={[styles.barFill, { width: progressWidth, backgroundColor: barColor }]} />
          </View>
        </View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  inner: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    minWidth: 24,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  barBackground: {
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  barFill: {
    height: '100%',
  },
});
