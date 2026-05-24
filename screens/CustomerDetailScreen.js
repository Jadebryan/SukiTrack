import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, View, Pressable, Text } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';
import { AppChoiceDialog } from '@/components/AppChoiceDialog';
import { AppConfirmDialog } from '@/components/AppConfirmDialog';
import { CustomerDetailActionRow } from '@/components/customer/CustomerDetailActionRow';
import { CustomerDetailBalanceCard } from '@/components/customer/CustomerDetailBalanceCard';
import { CustomerDetailHeader } from '@/components/customer/CustomerDetailHeader';
import { CustomerDetailProfileCard } from '@/components/customer/CustomerDetailProfileCard';
import { CustomerUtangPageBlock } from '@/components/customer/CustomerUtangPageBlock';
import { HomeSectionHeader } from '@/components/home/HomeSectionHeader';
import { CustomerDetailSkeleton } from '@/components/Skeleton';
import { EditCustomerModal } from '@/components/EditCustomerModal';
import { EditUtangEntryModal } from '@/components/EditUtangEntryModal';
import { TransactionFormModal } from '@/components/TransactionFormModal';
import { VerifyPinModal } from '@/components/VerifyPinModal';
import { getCustomerDetailPalette } from '@/constants/customerDetailPalette';
import { font } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useSaveOperation } from '@/hooks/useSaveOperation';
import { useToast } from '@/contexts/ToastContext';
import { useShopData } from '@/contexts/ShopDataContext';
import { useCustomer } from '@/hooks/useCustomer';
import { useCustomerPages } from '@/hooks/useTransactions';
import { deleteCustomer } from '@/services/customersService';
import { clearCustomerRecords } from '@/services/customersService';
import { isOnline } from '@/services/networkStatus';
import * as pinService from '@/services/pinService';
import { toastSavedOnDeviceAware } from '@/services/offlineUi';
import { pushRecentCustomerId } from '@/services/preferencesService';
import {
  addPageItem,
  addPagePayment,
  deletePageItem,
  deletePagePayment,
  updatePageItem,
  updatePagePayment,
} from '@/services/pagesService';
import { printUtangPageReceipt } from '@/services/receiptService';
import { formatPeso } from '@/utils/currency';
import { safeRouterBack } from '@/utils/safeRouterBack';
import { formatDateTime } from '@/utils/date';

function cloneClearUndoSnapshot(rawPages) {
  return (rawPages || []).map((p) => ({
    items: (p.items || []).map((i) => ({
      amount: Number(i.amount) || 0,
      description: i.description != null ? String(i.description).trim() : '',
      note: i.note != null ? String(i.note).trim() : '',
      createdAt: i.createdAt,
    })),
    payments: (p.payments || []).map((x) => ({
      amount: Number(x.amount) || 0,
      note: x.note != null ? String(x.note).trim() : '',
      createdAt: x.createdAt,
    })),
  }));
}

async function replayClearUndoSnapshot(ownerId, customerId, snapshot, itemFallbackLabel) {
  const items = snapshot
    .flatMap((p) => p.items || [])
    .sort(
      (a, b) =>
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
  const pays = snapshot
    .flatMap((p) => p.payments || [])
    .sort(
      (a, b) =>
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
  for (const it of items) {
    const desc = it.description?.trim() || itemFallbackLabel;
    await addPageItem(ownerId, customerId, {
      amount: it.amount,
      description: desc,
      note: it.note,
    });
  }
  for (const pay of pays) {
    await addPagePayment(ownerId, customerId, {
      amount: pay.amount,
      note: pay.note,
    });
  }
}

const CLEAR_UNDO_MAX_LINES = 400;

function countClearUndoLines(snapshot) {
  return snapshot.reduce(
    (n, p) => n + (p.items?.length || 0) + (p.payments?.length || 0),
    0
  );
}

export function CustomerDetailScreen() {
  const { id } = useLocalSearchParams();
  const customerId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { showToast } = useToast();
  const { save, isSaving } = useSaveOperation();
  const [transactionSubmitting, setTransactionSubmitting] = useState(false);
  const theme = useTheme();
  const { isDark } = useAppTheme();
  const colors = useMemo(() => getCustomerDetailPalette(isDark), [isDark]);
  const { user } = useAuth();
  const { refresh, inventory } = useShopData();
  const { customer, loading } = useCustomer(user?.ownerId, customerId);
  const { pages } = useCustomerPages(user?.ownerId, customerId);
  const bal = Number(customer?.balance) || 0;
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('utang');
  const [expandedPaidIds, setExpandedPaidIds] = useState({});
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printPage, setPrintPage] = useState(null);
  const [printVariant, setPrintVariant] = useState('full');
  const [editEntryOpen, setEditEntryOpen] = useState(false);
  const [editKind, setEditKind] = useState('item'); // item | payment
  const [editInitial, setEditInitial] = useState(null);
  const [deleteEntryOpen, setDeleteEntryOpen] = useState(false);
  const [deleteEntryKind, setDeleteEntryKind] = useState('item');
  const [deleteEntry, setDeleteEntry] = useState(null);
  const [deletingEntry, setDeletingEntry] = useState(false);
  const [deletePinOpen, setDeletePinOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const openPage = useMemo(
    () => pages.find((p) => p.status === 'open'),
    [pages]
  );
  const paidPages = useMemo(
    () =>
      pages
        .filter((p) => p.status === 'paid')
        .sort(
          (a, b) =>
            new Date(b.paidAt || b.updatedAt || 0).getTime() -
            new Date(a.paidAt || a.updatedAt || 0).getTime()
        ),
    [pages]
  );

  useFocusEffect(
    useCallback(() => {
      if (!user?.ownerId || !customerId || !customer) return undefined;
      void pushRecentCustomerId(user.ownerId, customerId);
      return undefined;
    }, [user?.ownerId, customerId, customer])
  );

  const openUtang = () => {
    setModalType('utang');
    setModalOpen(true);
  };
  const openPayment = () => {
    setModalType('payment');
    setModalOpen(true);
  };

  const onSubmitTx = async (payload) => {
    if (!user?.ownerId) {
      showToast({
        type: 'error',
        message: `${t('cd_session')}: ${t('cd_sessionMsg')}`,
      });
      return;
    }
    setModalOpen(false);
    setTransactionSubmitting(true);

    const opPromise = save({
      label: t('common_saving'),
      task: async () => {
        if (payload.type === 'utang') {
          if (Array.isArray(payload.items)) {
            for (const item of payload.items) {
              await addPageItem(user.ownerId, customerId, {
                amount: item.amount,
                description: item.description || t('common_item'),
                note: '',
              });
            }
          } else {
            await addPageItem(user.ownerId, customerId, {
              amount: payload.amount,
              description:
                (payload.note && String(payload.note).trim()) || t('common_item'),
              note: '',
            });
          }
          await refresh();
          return;
        }

        const prevDue =
          openPage != null ? Math.max(0, Number(openPage.due) || 0) : 0;
        const paidAmt = payload.amount;
        await addPagePayment(user.ownerId, customerId, {
          amount: paidAmt,
          note: payload.note ? String(payload.note).trim() : '',
        });
        await refresh();
        const online = await isOnline();
        if (!online) {
          await toastSavedOnDeviceAware(showToast, t, 'toast_txPaymentAdded');
          return;
        }
        const stillDue = Math.max(0, prevDue - paidAmt);
        if (stillDue > 0.005) {
          showToast({
            type: 'success',
            message: t('toast_txPaymentPartial', {
              remaining: formatPeso(stillDue),
            }),
          });
          return;
        }
        showToast({ type: 'success', message: t('toast_txPaymentAdded') });
      },
      onSuccess: async () => {
        if (payload.type === 'utang') {
          await toastSavedOnDeviceAware(showToast, t, 'toast_txUtangAdded');
        }
      },
      toastErrorMessage: t('cd_saveErr'),
      retryLabel: t('common_retry'),
    });

    opPromise.finally(() => {
      setTransactionSubmitting(false);
    });
  };

  const openEdit = (kind, row) => {
    setEditKind(kind);
    setEditInitial(row);
    setEditEntryOpen(true);
  };

  const askDelete = (kind, row) => {
    setDeleteEntryKind(kind);
    setDeleteEntry(row);
    setDeleteEntryOpen(true);
  };

  const runPrint = async (page, variant) => {
    try {
      await printUtangPageReceipt({ customer, page, variant });
    } catch (e) {
      showToast({
        type: 'error',
        message: `${t('cd_printErr')}: ${e?.message || t('cd_printErrMsg')}`,
      });
    }
  };

  const onPrintPage = (page) => {
    setPrintPage(page);
    setPrintVariant('full');
    setPrintOpen(true);
  };

  if (loading && !customer) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.bg }]}>
        <CustomerDetailSkeleton />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[styles.notFound, { color: colors.text }]}>{t('cd_notFound')}</Text>
      </View>
    );
  }

  const canPay =
    Boolean(openPage) && (openPage.items || []).length > 0 && openPage.due > 0;
  const customerName = customer.name?.trim() || '';

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        contentContainerStyle={[styles.list, { paddingTop: insets.top }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <CustomerDetailHeader
          colors={colors}
          t={t}
          customerName={customerName}
          menuOpen={customerMenuOpen}
          onMenuOpen={() => setCustomerMenuOpen(true)}
          onMenuClose={() => setCustomerMenuOpen(false)}
          onBack={() => safeRouterBack(router, '/(tabs)')}
          showMenu={Boolean(user?.ownerId)}
          onEdit={() => {
            setCustomerMenuOpen(false);
            setEditCustomerOpen(true);
          }}
          onDelete={() => {
            setCustomerMenuOpen(false);
            void (async () => {
              if (await pinService.hasPin()) setDeletePinOpen(true);
              else setDeleteOpen(true);
            })();
          }}
          onClearRecords={() => {
            setCustomerMenuOpen(false);
            setClearOpen(true);
          }}
        />

        <CustomerDetailBalanceCard
          colors={colors}
          t={t}
          balance={bal}
          lastActivityAt={customer.lastTransactionAt}
          updatedAt={customer.updatedAt}
        />

        <CustomerDetailActionRow
          colors={colors}
          t={t}
          onAddItem={openUtang}
          onPay={openPayment}
          payDisabled={!canPay}
        />

        <HomeSectionHeader colors={colors} title={t('cd_activePage')} />
        <Text style={[styles.sectionHint, { color: colors.textFaint }]}>
          {t('cd_activeHint')}
        </Text>

        {openPage ? (
          <View
            style={[
              styles.pageCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View style={styles.pageHeader}>
              <View style={styles.flex1}>
                <Text style={[styles.pageTitle, { color: colors.text }]}>
                  {t('cd_listTitle')}
                </Text>
                <Text style={[styles.pageMeta, { color: colors.textFaint }]}>
                  {t('cd_startedPrefix')} {formatDateTime(openPage.createdAt)}
                </Text>
              </View>
              <Pressable
                onPress={() => onPrintPage(openPage)}
                style={({ pressed }) => [
                  styles.iconBtn,
                  { backgroundColor: colors.iconBtnBg, borderColor: colors.border },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('cd_printPageA11y')}
              >
                <MaterialCommunityIcons
                  name="printer-outline"
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            <CustomerUtangPageBlock
              page={openPage}
              colors={colors}
              inventory={inventory}
              t={t}
              onEditItem={(it) => openEdit('item', it)}
              onDeleteItem={(it) => askDelete('item', it)}
              onEditPayment={(p) => openEdit('payment', p)}
              onDeletePayment={(p) => askDelete('payment', p)}
            />
          </View>
        ) : (
          <Text style={[styles.empty, { color: colors.textFaint }]}>{t('cd_noOpenPage')}</Text>
        )}

        {paidPages.length > 0 ? (
          <>
            <HomeSectionHeader colors={colors} title={t('cd_archiveTitle')} />
            <Text style={[styles.sectionHint, { color: colors.textFaint }]}>
              {t('cd_archiveHint')}
            </Text>
            {paidPages.map((p) => {
              const expanded = Boolean(expandedPaidIds[p.id]);
              return (
                <View
                  key={p.id}
                  style={[
                    styles.pageCard,
                    styles.archiveCard,
                    { backgroundColor: colors.cardBg, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.pageHeader}>
                    <View style={styles.flex1}>
                      <Text style={[styles.paidBadge, { color: colors.green600 }]}>
                        {t('cd_paid')}
                      </Text>
                      <Text style={[styles.pageMeta, { color: colors.textFaint }]}>
                        {formatDateTime(p.paidAt)} · {formatPeso(p.itemsTotal)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => onPrintPage(p)}
                      style={({ pressed }) => [
                        styles.iconBtn,
                        { backgroundColor: colors.iconBtnBg, borderColor: colors.border },
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={t('cd_printReceiptA11y')}
                    >
                      <MaterialCommunityIcons
                        name="printer-outline"
                        size={20}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  </View>
                  <Text style={[styles.archiveMeta, { color: colors.textFaint }]}>
                    {t('cd_archiveMeta', {
                      itemCount: (p.items || []).length,
                      payCount: (p.payments || []).length,
                    })}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setExpandedPaidIds((prev) => ({
                        ...prev,
                        [p.id]: !prev[p.id],
                      }))
                    }
                    style={({ pressed }) => [styles.expandBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                  >
                    <MaterialCommunityIcons
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.green600}
                    />
                    <Text style={[styles.expandText, { color: colors.green700 }]}>
                      {expanded ? t('cd_paidHideDetails') : t('cd_paidExpandDetails')}
                    </Text>
                  </Pressable>
                  {expanded ? (
                    <>
                      <Text style={[styles.pageMeta, { color: colors.textFaint, marginBottom: 8 }]}>
                        {t('cd_startedPrefix')} {formatDateTime(p.createdAt)}
                      </Text>
                      <CustomerUtangPageBlock
                        page={p}
                        colors={colors}
                        inventory={inventory}
                        t={t}
                        readOnly
                      />
                    </>
                  ) : null}
                </View>
              );
            })}
          </>
        ) : null}

        <HomeSectionHeader colors={colors} title={t('cd_profileTitle')} />
        <CustomerDetailProfileCard
          colors={colors}
          t={t}
          customer={customer}
          onEdit={() => setEditCustomerOpen(true)}
        />
      </ScrollView>

      <TransactionFormModal
        visible={modalOpen}
        onDismiss={() => setModalOpen(false)}
        initialType={modalType}
        onSubmit={onSubmitTx}
        submitting={transactionSubmitting}
        inventoryItems={inventory}
        sheetDue={
          modalOpen && modalType === 'payment' && openPage
            ? Math.max(0, Number(openPage.due) || 0)
            : null
        }
      />
      <EditCustomerModal
        visible={editCustomerOpen}
        onDismiss={() => setEditCustomerOpen(false)}
        customer={customer}
      />

      <EditUtangEntryModal
        visible={editEntryOpen}
        onDismiss={() => setEditEntryOpen(false)}
        kind={editKind}
        initial={editInitial || { id: '', amount: 0, description: '', note: '' }}
        busy={isSaving}
        onSave={(payload) => {
          if (!user?.ownerId || !customerId || !editInitial?.id) return;
          setEditEntryOpen(false);

          void save({
            label: editKind === 'item' ? t('common_item') : t('common_payment'),
            task: async () => {
              if (editKind === 'item') {
                await updatePageItem(user.ownerId, customerId, editInitial.id, {
                  amount: payload.amount,
                  description: payload.description,
                  note: payload.note,
                });
              } else {
                await updatePagePayment(user.ownerId, customerId, editInitial.id, {
                  amount: payload.amount,
                  note: payload.note,
                });
              }
              await refresh();
            },
            onSuccess: async () => {
              await toastSavedOnDeviceAware(
                showToast,
                t,
                editKind === 'item' ? 'toast_txItemUpdated' : 'toast_txPaymentUpdated'
              );
            },
            toastErrorMessage: t('cd_saveErr'),
            retryLabel: t('common_retry'),
          });
        }}
      />

      <AppConfirmDialog
        visible={deleteEntryOpen}
        title={deleteEntryKind === 'payment' ? t('common_payment') : t('common_item')}
        message={t('cd_deleteMsg')}
        confirmText={t('cd_deleteConfirm')}
        cancelText={t('common_no')}
        destructive
        confirmLoading={deletingEntry}
        onCancel={() => {
          setDeleteEntryOpen(false);
          setDeleteEntry(null);
        }}
        onConfirm={async () => {
          if (deletingEntry || !user?.ownerId || !customerId || !deleteEntry?.id) return;
          const snap = {
            kind: deleteEntryKind,
            amount: deleteEntry.amount,
            description:
              deleteEntry.description != null
                ? String(deleteEntry.description).trim()
                : '',
            note: deleteEntry.note != null ? String(deleteEntry.note).trim() : '',
          };
          setDeletingEntry(true);
          try {
            if (deleteEntryKind === 'item') {
              await deletePageItem(user.ownerId, customerId, deleteEntry.id);
            } else {
              await deletePagePayment(user.ownerId, customerId, deleteEntry.id);
            }
            await refresh();
            const online = await isOnline();
            const deletedMsgKey =
              deleteEntryKind === 'item' ? 'toast_txItemDeleted' : 'toast_txPaymentDeleted';
            showToast({
              type: online ? 'success' : 'warning',
              message: t(online ? deletedMsgKey : 'toast_editsQueued'),
              durationMs: 12_000,
              actionLabel: t('common_undo'),
              onAction: async () => {
                try {
                  if (snap.kind === 'item') {
                    await addPageItem(user.ownerId, customerId, {
                      amount: snap.amount,
                      description: snap.description || t('common_item'),
                      note: snap.note,
                    });
                  } else {
                    await addPagePayment(user.ownerId, customerId, {
                      amount: snap.amount,
                      note: snap.note,
                    });
                  }
                  await refresh();
                  showToast({ type: 'success', message: t('cd_undoTxRestored') });
                } catch {
                  showToast({ type: 'error', message: t('cd_undoTxFailed') });
                }
              },
            });
          } catch (e) {
            showToast({ type: 'error', message: e?.message || t('common_error') });
          } finally {
            setDeletingEntry(false);
            setDeleteEntryOpen(false);
            setDeleteEntry(null);
          }
        }}
      />

      <AppConfirmDialog
        visible={deleteOpen}
        title={t('cd_deleteTitle')}
        message={t('cd_deleteMsg')}
        confirmText={t('cd_deleteConfirm')}
        cancelText={t('common_no')}
        destructive
        confirmLoading={deletingCustomer}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          if (deletingCustomer) return;
          setDeletingCustomer(true);
          try {
            if (!user?.ownerId) return;
            await deleteCustomer(user.ownerId, customerId);
            await refresh();
            await toastSavedOnDeviceAware(showToast, t, 'toast_customerDeleted');
            safeRouterBack(router, '/(tabs)');
          } catch (e) {
            showToast({
              type: 'error',
              message: e?.message || t('cd_deleteErr'),
            });
          } finally {
            setDeletingCustomer(false);
          }
        }}
      />

      <VerifyPinModal
        visible={deletePinOpen}
        onDismiss={() => setDeletePinOpen(false)}
        title={t('cd_deletePinTitle')}
        message={t('cd_deletePinMsg')}
        cancelText={t('common_cancel')}
        confirmText={t('cd_deleteConfirm')}
        onConfirmed={() => {
          if (!user?.ownerId) return;
          void save({
            label: t('toast_customerDeleted'),
            task: async () => {
              await deleteCustomer(user.ownerId, customerId);
              await refresh();
            },
            onSuccess: async () => {
              await toastSavedOnDeviceAware(showToast, t, 'toast_customerDeleted');
              safeRouterBack(router, '/(tabs)');
            },
            toastErrorMessage: t('cd_deleteErr'),
            retryLabel: t('common_retry'),
          });
        }}
      />

      <AppChoiceDialog
        visible={printOpen}
        title={t('cd_printChooseTitle')}
        message={t('cd_printChooseMsg')}
        choices={[
          {
            id: 'summary',
            title: t('cd_printSummary'),
            subtitle: t('receipt_summaryNote'),
            icon: 'receipt-text-outline',
            iconBg: '#f0f4f1',
            iconColor: '#5a7060',
          },
          {
            id: 'full',
            title: t('cd_printFull'),
            subtitle: `${t('cd_items')} + ${t('cd_payments')}`,
            icon: 'receipt-outline',
            iconBg: '#e8f5ed',
            iconColor: '#2d8a4e',
          },
        ]}
        value={printVariant}
        onChange={(id) => setPrintVariant(id === 'summary' ? 'summary' : 'full')}
        cancelText={t('common_cancel')}
        confirmText={t('common_ok')}
        onCancel={() => {
          setPrintOpen(false);
          setPrintPage(null);
        }}
        onConfirm={async () => {
          const p = printPage;
          const v = printVariant;
          setPrintOpen(false);
          setPrintPage(null);
          if (p) await runPrint(p, v);
        }}
      />

      <VerifyPinModal
        visible={clearOpen}
        onDismiss={() => setClearOpen(false)}
        title={t('cd_clearRecordsPinTitle')}
        message={t('cd_clearRecordsMsg')}
        cancelText={t('common_cancel')}
        confirmText={t('cd_clearRecords')}
        onConfirmed={() => {
          if (!user?.ownerId) return;
          const snapshot = cloneClearUndoSnapshot(pages);
          const lineCount = countClearUndoLines(snapshot);
          void save({
            label: t('cd_clearRecords'),
            task: async () => {
              await clearCustomerRecords(user.ownerId, customerId);
              await refresh();
              return { snapshot, lineCount, online: await isOnline() };
            },
            onSuccess: async ({ snapshot: snap, lineCount: lines, online }) => {
              if (lines > CLEAR_UNDO_MAX_LINES) {
                await toastSavedOnDeviceAware(showToast, t, 'cd_clearRecordsDone');
                return;
              }
              showToast({
                type: online ? 'success' : 'warning',
                message: t(online ? 'cd_clearRecordsDone' : 'toast_editsQueued'),
                durationMs: 16_000,
                actionLabel: t('common_undo'),
                onAction: async () => {
                  try {
                    await replayClearUndoSnapshot(
                      user.ownerId,
                      customerId,
                      snap,
                      t('common_item')
                    );
                    await refresh();
                    showToast({ type: 'success', message: t('cd_undoClearRestored') });
                  } catch {
                    showToast({ type: 'error', message: t('cd_undoClearFailed') });
                  }
                },
              });
            },
            toastErrorMessage: t('common_error'),
            retryLabel: t('common_retry'),
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flex1: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: {
    fontFamily: font.medium,
    fontSize: 16,
  },
  list: { paddingBottom: 32 },
  sectionHint: {
    fontFamily: font.medium,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 16,
    marginTop: -4,
    marginBottom: 10,
  },
  pageCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  archiveCard: { marginBottom: 10 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  pageTitle: {
    fontFamily: font.semiBold,
    fontSize: 15,
  },
  pageMeta: {
    fontFamily: font.medium,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidBadge: {
    fontFamily: font.semiBold,
    fontSize: 14,
  },
  archiveMeta: {
    fontFamily: font.medium,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingVertical: 4,
  },
  expandText: {
    fontFamily: font.medium,
    fontSize: 13,
  },
  empty: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    textAlign: 'center',
    fontFamily: font.medium,
    fontSize: 14,
  },
  pressed: { opacity: 0.88 },
});
