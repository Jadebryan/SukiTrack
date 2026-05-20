import { getDefaultHeaderHeight } from '@react-navigation/elements';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppToastBanner } from '@/components/AppToastBanner';

const ToastContext = createContext(null);

function normalizeToastOpts(opts) {
  if (typeof opts === 'string') {
    return {
      message: opts,
      type: 'info',
      actionLabel: null,
      onAction: null,
      durationMs: null,
    };
  }
  const t =
    opts?.type === 'success' ||
    opts?.type === 'error' ||
    opts?.type === 'info' ||
    opts?.type === 'warning'
      ? opts.type
      : 'info';
  const actionLabel =
    typeof opts?.actionLabel === 'string' && opts.actionLabel.trim()
      ? opts.actionLabel.trim()
      : null;
  const onAction = typeof opts?.onAction === 'function' ? opts.onAction : null;
  const rawDur = Number(opts?.durationMs);
  const durationMs =
    Number.isFinite(rawDur) && rawDur > 0 ? Math.min(rawDur, 120_000) : null;
  return { message: opts?.message ?? '', type: t, actionLabel, onAction, durationMs };
}

export function ToastProvider({ children, isDark = false }) {
  const insets = useSafeAreaInsets();
  const layout = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [actionLabel, setActionLabel] = useState(null);
  const [hasActionButton, setHasActionButton] = useState(false);
  const [durationMs, setDurationMs] = useState(null);
  const onActionRef = useRef(null);

  const hide = useCallback(() => {
    setVisible(false);
    setActionLabel(null);
    setHasActionButton(false);
    setDurationMs(null);
    onActionRef.current = null;
  }, []);

  const showToast = useCallback((opts) => {
    const {
      message: msg,
      type: nextType,
      actionLabel: al,
      onAction,
      durationMs: dm,
    } = normalizeToastOpts(opts);
    setMessage(msg);
    setType(nextType);
    setActionLabel(al);
    setDurationMs(dm);
    const canAction = Boolean(al && onAction);
    setHasActionButton(canAction);
    onActionRef.current = canAction ? onAction : null;
    setVisible(true);
  }, []);

  const handleActionPress = useCallback(() => {
    try {
      onActionRef.current?.();
    } finally {
      hide();
    }
  }, [hide]);

  useEffect(() => {
    if (!visible) return undefined;
    const fallback = type === 'error' ? 5500 : 3800;
    const ms = durationMs != null ? durationMs : fallback;
    const id = setTimeout(hide, ms);
    return () => clearTimeout(id);
  }, [visible, type, durationMs, hide]);

  const value = useMemo(
    () => ({ showToast, hideToast: hide }),
    [showToast, hide]
  );

  const headerTotal = getDefaultHeaderHeight(
    { width: layout.width, height: layout.height },
    false,
    insets.top
  );
  const toastTop = headerTotal + 6;
  const padLeft = Math.max(insets.left, 12);
  const maxToastWidth = Math.min(layout.width - padLeft - 12, 420);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {visible ? (
        <Portal>
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              top: toastTop,
              left: padLeft,
              right: 12,
              maxWidth: maxToastWidth,
              alignSelf: 'flex-start',
              zIndex: 9999,
            }}
          >
            <AppToastBanner
              type={type}
              message={message}
              onDismiss={hide}
              isDark={isDark}
              actionLabel={actionLabel}
              onActionPress={hasActionButton ? handleActionPress : null}
              durationMs={durationMs}
            />
          </View>
        </Portal>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
