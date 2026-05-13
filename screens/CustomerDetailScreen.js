import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useLayoutEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Image } from 'react-native';
import {
  Appbar,
  Button,
  Card,
  Divider,
  IconButton,
  List,
  Menu,
  Text,
  useTheme,
} from 'react-native-paper';
import { AppChoiceDialog } from '@/components/AppChoiceDialog';
import { AppConfirmDialog } from '@/components/AppConfirmDialog';
import { CustomerDetailSkeleton } from '@/components/Skeleton';
import { EditCustomerModal } from '@/components/EditCustomerModal';
import { EditUtangEntryModal } from '@/components/EditUtangEntryModal';
import { TransactionFormModal } from '@/components/TransactionFormModal';
import { VerifyPinModal } from '@/components/VerifyPinModal';
import { font } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { useShopData } from '@/contexts/ShopDataContext';
import { useCustomer } from '@/hooks/useCustomer';
import { useCustomerPages } from '@/hooks/useTransactions';
import { deleteCustomer } from '@/services/customersService';
import { clearCustomerRecords } from '@/services/customersService';
import { isOnline } from '@/services/networkStatus';
import * as pinService from '@/services/pinService';
import { toastSavedOnDeviceAware } from '@/services/offlineUi';
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

const UTANG_LIST_NESTED_SCROLL_THRESHOLD = 8;
const UTANG_LIST_NESTED_MAX_HEIGHT = 300;
const CLEAR_UNDO_MAX_LINES = 400;

function countClearUndoLines(snapshot) {
  return snapshot.reduce(
    (n, p) => n + (p.items?.length || 0) + (p.payments?.length || 0),
    0
  );
}

function UtangPageItemsPaymentsTotals({
  page,
  t,
  styles,
  inventory = [],
  onEditItem,
  onDeleteItem,
  onEditPayment,
  onDeletePayment,
}) {
  const imageByDesc = useMemo(() => {
    const m = new Map();
    for (const row of inventory || []) {
      const key = String(row.name || '')
        .toLowerCase()
        .trim();
      if (!key) continue;
      const uri = row.imageUrl || row.imageLocalUri;
      if (uri) m.set(key, uri);
    }
    return m;
  }, [inventory]);

  const items = page.items || [];
  const payments = page.payments || [];
  const itemsLong = items.length > UTANG_LIST_NESTED_SCROLL_THRESHOLD;
  const paysLong = payments.length > UTANG_LIST_NESTED_SCROLL_THRESHOLD;
  const showLongHint = itemsLong || paysLong;

  const itemNodes = items.map((it) => {
    const descKey = String(it.description || '')
      .toLowerCase()
      .trim();
    const thumbUri = descKey ? imageByDesc.get(descKey) : null;
    return (
      <List.Item
        key={it.id}
        title={it.description || t('common_item')}
        description={`${formatDateTime(it.createdAt)}${
          it.note ? ` · ${it.note}` : ''
        }`}
        left={
          thumbUri
            ? (iconProps) => (
                <View style={[styles.itemStickerWrap, iconProps.style]}>
                  <Image
                    source={{ uri: thumbUri }}
                    style={styles.itemStickerImg}
                    resizeMode="cover"
                    accessibilityIgnoresInvertColors
                  />
                </View>
              )
            : undefined
        }
        right={() => (
          <View style={styles.rowRight}>
            <Text variant="titleSmall" style={styles.itemAmt}>
              {formatPeso(it.amount)}
            </Text>
            <IconButton
              icon="pencil-outline"
              size={18}
              style={styles.rowIconBtn}
              onPress={() => onEditItem?.(it)}
            />
            <IconButton
              icon="trash-can-outline"
              size={18}
              style={styles.rowIconBtn}
              iconColor="#ef4444"
              onPress={() => onDeleteItem?.(it)}
            />
          </View>
        )}
      />
    );
  });

  const paymentNodes = payments.map((p) => (
    <List.Item
      key={p.id}
      title={
        p.note ? t('cd_payWithNote', { note: p.note }) : t('cd_payLine')
      }
      description={formatDateTime(p.createdAt)}
      left={(props) => <List.Icon {...props} icon="cash-check" />}
      right={() => (
        <View style={styles.rowRight}>
          <Text variant="titleSmall" style={styles.itemAmt}>
            {formatPeso(p.amount)}
          </Text>
          <IconButton
            icon="pencil-outline"
            size={18}
            style={styles.rowIconBtn}
            onPress={() => onEditPayment?.(p)}
          />
          <IconButton
            icon="trash-can-outline"
            size={18}
            style={styles.rowIconBtn}
            iconColor="#ef4444"
            onPress={() => onDeletePayment?.(p)}
          />
        </View>
      )}
    />
  ));

  return (
    <>
      {showLongHint ? (
        <Text variant="bodySmall" style={styles.longSheetHint}>
          {t('cd_longSheetScrollHint')}
        </Text>
      ) : null}

      <Text variant="labelLarge" style={styles.blockLabel}>
        {t('cd_items')}
      </Text>
      {items.length === 0 ? (
        <Text style={styles.muted}>{t('cd_noItemsYet')}</Text>
      ) : itemsLong ? (
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          style={[styles.utangScrollBox, { maxHeight: UTANG_LIST_NESTED_MAX_HEIGHT }]}
        >
          {itemNodes}
        </ScrollView>
      ) : (
        itemNodes
      )}

      <Divider style={styles.div} />

      <Text variant="labelLarge" style={styles.blockLabel}>
        {t('cd_payments')}
      </Text>
      {payments.length === 0 ? (
        <Text style={styles.muted}>{t('cd_noPaymentsYet')}</Text>
      ) : paysLong ? (
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          style={[styles.utangScrollBox, { maxHeight: UTANG_LIST_NESTED_MAX_HEIGHT }]}
        >
          {paymentNodes}
        </ScrollView>
      ) : (
        paymentNodes
      )}

      <View style={styles.totals}>
        <View style={styles.totRow}>
          <Text variant="bodyMedium">{t('cd_subtotalItems')}</Text>
          <Text variant="titleMedium" style={styles.totEm}>
            {formatPeso(page.itemsTotal)}
          </Text>
        </View>
        <View style={styles.totRow}>
          <Text variant="bodyMedium">{t('cd_paidSoFar')}</Text>
          <Text variant="titleMedium">{formatPeso(page.paidTotal)}</Text>
        </View>
        <View style={styles.totRow}>
          <Text variant="titleSmall" style={styles.dueLabel}>
            {t('cd_due')}
          </Text>
          <Text variant="titleLarge" style={styles.dueVal}>
            {formatPeso(page.due)}
          </Text>
        </View>
      </View>
    </>
  );
}

export function CustomerDetailScreen() {
  const { id } = useLocalSearchParams();
  const customerId = Array.isArray(id) ? id[0] : id;
  const navigation = useNavigation();
  const router = useRouter();
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const theme = useTheme();
  const { user } = useAuth();
  const { refresh, inventory } = useShopData();
  const { customer, loading } = useCustomer(user?.ownerId, customerId);
  const { pages } = useCustomerPages(user?.ownerId, customerId);
  const bal = Number(customer?.balance) || 0;
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('utang');
  const [saving, setSaving] = useState(false);
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
  const [deletePinOpen, setDeletePinOpen] = useState(false);
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitleAlign: 'center',
      headerTitle: customer?.name?.trim()
        ? customer.name.trim()
        : t('nav_customer'),
      headerTitleStyle: {
        fontFamily: font.extraBold,
        fontSize: 18,
        color: theme.colors.onSurface,
      },
      headerRight: () =>
        user?.ownerId && customer ? (
          <Menu
            visible={customerMenuOpen}
            onDismiss={() => setCustomerMenuOpen(false)}
            anchorPosition="bottom"
            anchor={
              <Appbar.Action
                icon="dots-vertical"
                onPress={() => setCustomerMenuOpen(true)}
                accessibilityLabel={t('cd_headerMenuA11y')}
              />
            }
          >
            <Menu.Item
              leadingIcon="pencil-outline"
              title={t('cd_editTitle')}
              onPress={() => {
                setCustomerMenuOpen(false);
                setEditCustomerOpen(true);
              }}
            />
            <Menu.Item
              leadingIcon="delete-outline"
              title={t('cd_deleteConfirm')}
              titleStyle={{ color: theme.colors.error }}
              onPress={() => {
                setCustomerMenuOpen(false);
                void (async () => {
                  if (await pinService.hasPin()) setDeletePinOpen(true);
                  else setDeleteOpen(true);
                })();
              }}
            />
            <Menu.Item
              leadingIcon="broom"
              title={t('cd_clearRecords')}
              titleStyle={{ color: theme.colors.error }}
              onPress={() => {
                setCustomerMenuOpen(false);
                setClearOpen(true);
              }}
            />
          </Menu>
        ) : null,
    });
  }, [
    navigation,
    customer,
    user?.ownerId,
    customerId,
    router,
    refresh,
    t,
    locale,
    theme,
    showToast,
    customerMenuOpen,
  ]);

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
    setSaving(true);
    try {
      if (payload.type === 'utang') {
        await addPageItem(user.ownerId, customerId, {
          amount: payload.amount,
          description:
            (payload.note && String(payload.note).trim()) || t('common_item'),
          note: '',
        });
      } else {
        const prevDue =
          openPage != null ? Math.max(0, Number(openPage.due) || 0) : 0;
        const paidAmt = payload.amount;
        await addPagePayment(user.ownerId, customerId, {
          amount: paidAmt,
          note: payload.note ? String(payload.note).trim() : '',
        });
        await refresh();
        setModalOpen(false);
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
        } else {
          showToast({
            type: 'success',
            message: t('toast_txPaymentAdded'),
          });
        }
        return;
      }
      await refresh();
      setModalOpen(false);
      await toastSavedOnDeviceAware(showToast, t, 'toast_txUtangAdded');
    } catch (e) {
      showToast({
        type: 'error',
        message: e?.message || t('cd_saveErr'),
      });
    } finally {
      setSaving(false);
    }
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
    return <CustomerDetailSkeleton />;
  }

  if (!customer) {
    return (
      <View style={styles.center}>
        <Text variant="bodyLarge">{t('cd_notFound')}</Text>
      </View>
    );
  }

  const canPay =
    Boolean(openPage) && (openPage.items || []).length > 0 && openPage.due > 0;

  return (
    <View style={styles.flex}>
      <Card mode="elevated" style={styles.hero}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.muted}>
            {t('cd_balanceNow')}
          </Text>
          <Text variant="displaySmall" style={styles.balance}>
            {formatPeso(bal)}
          </Text>
          <Text variant="bodySmall" style={styles.heroMeta}>
            {t('cd_lastActivity')}{' '}
            {customer.lastTransactionAt
              ? formatDateTime(customer.lastTransactionAt)
              : t('cd_lastActivityNone')}
          </Text>
          {customer.updatedAt ? (
            <Text variant="bodySmall" style={styles.heroMetaMuted}>
              {t('cd_recordUpdated')}: {formatDateTime(customer.updatedAt)}
            </Text>
          ) : null}
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button
          mode="contained"
          icon="plus-circle-outline"
          onPress={openUtang}
          style={styles.half}
          contentStyle={styles.btnTall}
        >
          {t('cd_addItem')}
        </Button>
        <Button
          mode="contained-tonal"
          icon="cash"
          onPress={openPayment}
          style={styles.half}
          contentStyle={styles.btnTall}
          disabled={!canPay}
        >
          {t('cd_pay')}
        </Button>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Text variant="titleLarge" style={styles.section}>
          {t('cd_activePage')}
        </Text>
        <Text variant="bodySmall" style={styles.hint}>
          {t('cd_activeHint')}
        </Text>

        {openPage ? (
          <Card mode="outlined" style={styles.pageCard}>
            <Card.Content>
              <View style={styles.pageHeader}>
                <Text variant="titleMedium" style={styles.pageTitle}>
                  {t('cd_listTitle')}
                </Text>
                <IconButton
                  icon="printer-outline"
                  size={22}
                  onPress={() => onPrintPage(openPage)}
                  accessibilityLabel={t('cd_printPageA11y')}
                />
              </View>
              <Text variant="bodySmall" style={styles.muted}>
                {t('cd_startedPrefix')} {formatDateTime(openPage.createdAt)}
              </Text>

              <UtangPageItemsPaymentsTotals
                page={openPage}
                inventory={inventory}
                t={t}
                styles={styles}
                onEditItem={(it) => openEdit('item', it)}
                onDeleteItem={(it) => askDelete('item', it)}
                onEditPayment={(p) => openEdit('payment', p)}
                onDeletePayment={(p) => askDelete('payment', p)}
              />
            </Card.Content>
          </Card>
        ) : (
          <Text style={styles.empty}>{t('cd_noOpenPage')}</Text>
        )}

        {paidPages.length > 0 ? (
          <>
            <Text variant="titleMedium" style={styles.archiveHeading}>
              {t('cd_archiveTitle')}
            </Text>
            <Text variant="bodySmall" style={styles.archiveHint}>
              {t('cd_archiveHint')}
            </Text>
            {paidPages.map((p) => {
              const expanded = Boolean(expandedPaidIds[p.id]);
              return (
                <Card key={p.id} mode="outlined" style={styles.archiveCard}>
                  <Card.Content>
                    <View style={styles.pageHeader}>
                      <View style={styles.flex1}>
                        <Text variant="titleSmall" style={styles.lunas}>
                          {t('cd_paid')}
                        </Text>
                        <Text variant="bodySmall" style={styles.muted}>
                          {formatDateTime(p.paidAt)}
                          {' · '}
                          {formatPeso(p.itemsTotal)}
                        </Text>
                      </View>
                      <IconButton
                        icon="printer-outline"
                        size={22}
                        onPress={() => onPrintPage(p)}
                        accessibilityLabel={t('cd_printReceiptA11y')}
                      />
                    </View>
                    <Text variant="bodySmall" style={styles.muted}>
                      {t('cd_archiveMeta', {
                        itemCount: (p.items || []).length,
                        payCount: (p.payments || []).length,
                      })}
                    </Text>
                    <Button
                      mode="text"
                      compact
                      icon={expanded ? 'chevron-up' : 'chevron-down'}
                      onPress={() =>
                        setExpandedPaidIds((prev) => ({
                          ...prev,
                          [p.id]: !prev[p.id],
                        }))
                      }
                      style={styles.expandBtn}
                      contentStyle={styles.expandBtnContent}
                    >
                      {expanded
                        ? t('cd_paidHideDetails')
                        : t('cd_paidExpandDetails')}
                    </Button>
                    {expanded ? (
                      <>
                        <Text variant="bodySmall" style={styles.muted}>
                          {t('cd_startedPrefix')}{' '}
                          {formatDateTime(p.createdAt)}
                        </Text>
                        <UtangPageItemsPaymentsTotals
                          page={p}
                          inventory={inventory}
                          t={t}
                          styles={styles}
                        />
                      </>
                    ) : null}
                  </Card.Content>
                </Card>
              );
            })}
          </>
        ) : null}

        <Card mode="outlined" style={styles.profileCard}>
          <Card.Content>
            <View style={styles.profileHeader}>
              <Text variant="titleMedium" style={styles.profileHeading}>
                {t('cd_profileTitle')}
              </Text>
              <Button
                mode="text"
                compact
                icon="pencil-outline"
                onPress={() => setEditCustomerOpen(true)}
              >
                {t('cd_editDetails')}
              </Button>
            </View>
            <View style={styles.profileRow}>
              <Text variant="bodySmall" style={styles.muted}>
                {t('cd_profileName')}
              </Text>
              <Text variant="bodyLarge" style={styles.profileValue}>
                {customer.name?.trim()
                  ? customer.name.trim()
                  : t('cd_profileEmpty')}
              </Text>
            </View>
            <View style={styles.profileRow}>
              <Text variant="bodySmall" style={styles.muted}>
                {t('cd_profilePhone')}
              </Text>
              <Text variant="bodyLarge" style={styles.profileValue}>
                {String(customer.phone || '').trim()
                  ? String(customer.phone).trim()
                  : t('cd_profileEmpty')}
              </Text>
            </View>
            <View style={styles.profileRow}>
              <Text variant="bodySmall" style={styles.muted}>
                {t('cd_profileAddress')}
              </Text>
              <Text variant="bodyLarge" style={styles.profileValue}>
                {String(customer.address || '').trim()
                  ? String(customer.address).trim()
                  : t('cd_profileEmpty')}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <TransactionFormModal
        visible={modalOpen}
        onDismiss={() => setModalOpen(false)}
        initialType={modalType}
        onSubmit={onSubmitTx}
        submitting={saving}
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
        busy={saving}
        onSave={async (payload) => {
          if (!user?.ownerId || !customerId || !editInitial?.id) return;
          setSaving(true);
          try {
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
            await toastSavedOnDeviceAware(
              showToast,
              t,
              editKind === 'item' ? 'toast_txItemUpdated' : 'toast_txPaymentUpdated'
            );
            setEditEntryOpen(false);
          } catch (e) {
            showToast({
              type: 'error',
              message: e?.message || t('cd_saveErr'),
            });
          } finally {
            setSaving(false);
          }
        }}
      />

      <AppConfirmDialog
        visible={deleteEntryOpen}
        title={deleteEntryKind === 'payment' ? t('common_payment') : t('common_item')}
        message={t('cd_deleteMsg')}
        confirmText={t('cd_deleteConfirm')}
        cancelText={t('common_no')}
        destructive
        onCancel={() => {
          setDeleteEntryOpen(false);
          setDeleteEntry(null);
        }}
        onConfirm={async () => {
          if (!user?.ownerId || !customerId || !deleteEntry?.id) return;
          const snap = {
            kind: deleteEntryKind,
            amount: deleteEntry.amount,
            description:
              deleteEntry.description != null
                ? String(deleteEntry.description).trim()
                : '',
            note: deleteEntry.note != null ? String(deleteEntry.note).trim() : '',
          };
          setSaving(true);
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
            setSaving(false);
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
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          setDeleteOpen(false);
          try {
            if (!user?.ownerId) return;
            await deleteCustomer(user.ownerId, customerId);
            await refresh();
            await toastSavedOnDeviceAware(showToast, t, 'toast_customerDeleted');
            router.back();
          } catch (e) {
            showToast({
              type: 'error',
              message: e?.message || t('cd_deleteErr'),
            });
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
        onConfirmed={async () => {
          if (!user?.ownerId) return;
          setSaving(true);
          try {
            await deleteCustomer(user.ownerId, customerId);
            await refresh();
            await toastSavedOnDeviceAware(showToast, t, 'toast_customerDeleted');
            router.back();
          } catch (e) {
            showToast({
              type: 'error',
              message: e?.message || t('cd_deleteErr'),
            });
          } finally {
            setSaving(false);
          }
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
        onConfirmed={async () => {
          if (!user?.ownerId) return;
          const snapshot = cloneClearUndoSnapshot(pages);
          const lineCount = countClearUndoLines(snapshot);
          setSaving(true);
          try {
            await clearCustomerRecords(user.ownerId, customerId);
            await refresh();
            const online = await isOnline();
            if (lineCount > CLEAR_UNDO_MAX_LINES) {
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
                    snapshot,
                    t('common_item')
                  );
                  await refresh();
                  showToast({ type: 'success', message: t('cd_undoClearRestored') });
                } catch {
                  showToast({ type: 'error', message: t('cd_undoClearFailed') });
                }
              },
            });
          } catch (e) {
            showToast({ type: 'error', message: e?.message || t('common_error') });
          } finally {
            setSaving(false);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flex1: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { margin: 16, borderRadius: 16 },
  profileCard: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
    borderRadius: 12,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  profileHeading: { fontFamily: font.extraBold, flex: 1 },
  profileRow: { marginTop: 10 },
  profileValue: { marginTop: 2, fontFamily: font.medium },
  muted: { opacity: 0.75 },
  balance: { marginTop: 6, fontFamily: font.extraBold },
  heroMeta: { marginTop: 12, opacity: 0.85, lineHeight: 20 },
  heroMetaMuted: { marginTop: 4, opacity: 0.65, lineHeight: 18 },
  // print modal moved into AppChoiceDialog
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  half: { flex: 1, borderRadius: 12 },
  btnTall: { paddingVertical: 8 },
  section: { paddingHorizontal: 16, marginTop: 8, fontFamily: font.extraBold },
  hint: {
    paddingHorizontal: 16,
    marginBottom: 8,
    opacity: 0.65,
    lineHeight: 18,
  },
  pageCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: { fontFamily: font.extraBold },
  blockLabel: { marginTop: 12, marginBottom: 4, opacity: 0.8 },
  longSheetHint: {
    fontSize: 12,
    opacity: 0.72,
    lineHeight: 16,
    marginBottom: 4,
  },
  utangScrollBox: {
    marginBottom: 2,
  },
  itemAmt: { alignSelf: 'center', fontFamily: font.bold },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rowIconBtn: { margin: 0 },
  itemStickerWrap: {
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 6,
  },
  itemStickerImg: {
    width: 44,
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(45,138,78,0.22)',
    backgroundColor: 'rgba(244,247,245,0.9)',
  },
  div: { marginVertical: 12 },
  totals: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(128,128,128,0.08)',
  },
  totRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  totEm: { fontFamily: font.extraBold },
  dueLabel: { fontFamily: font.bold, marginTop: 4 },
  dueVal: { fontFamily: font.extraBold, marginTop: 4 },
  archiveHeading: {
    paddingHorizontal: 16,
    marginTop: 20,
    fontFamily: font.extraBold,
  },
  archiveHint: {
    paddingHorizontal: 16,
    marginBottom: 8,
    opacity: 0.65,
    lineHeight: 18,
  },
  archiveCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 12 },
  expandBtn: { marginTop: 4, alignSelf: 'flex-start' },
  expandBtnContent: { flexDirection: 'row-reverse' },
  lunas: { fontFamily: font.extraBold, color: '#0a7' },
  list: { paddingBottom: 32 },
  empty: { padding: 24, textAlign: 'center', opacity: 0.7 },
});
