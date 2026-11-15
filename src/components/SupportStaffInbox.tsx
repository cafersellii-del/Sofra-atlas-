import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bike,
  MessageSquare,
  Search,
  Send,
  Utensils,
  X,
} from 'lucide-react';
import {
  registerOrderSupportMetadata,
  useSupportInbox,
} from '../hooks/useSupportChat';
import { useLanguage } from '../i18n/LanguageContext';
import type { Order, SupportChatChannel } from '../types/food';
import {
  type AdminRegionScope,
  isTurkeyCityId,
  isTurkeyProvinceName,
} from '../utils/adminScope';

interface SupportStaffInboxProps {
  orders: Order[];
  enabled?: boolean;
  initialOrderId?: string | null;
  compactHeightClass?: string;
  regionScope?: AdminRegionScope | null;
}

function formatMessageTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function SupportStaffInbox({
  orders,
  enabled = true,
  initialOrderId = null,
  compactHeightClass = 'h-[480px]',
  regionScope = 'all',
}: SupportStaffInboxProps) {
  const { t } = useLanguage();
  const { threads, loading, sending, sendStaffReply, markThreadReadByStaff } =
    useSupportInbox(enabled);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    initialOrderId
  );
  const [replyRole, setReplyRole] = useState<'restaurant' | 'courier'>(
    'restaurant'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scopedThreads = useMemo(() => {
    if (regionScope !== 'non_turkey') return threads;
    return threads.filter((th) => {
      if (th.cityId) return !isTurkeyCityId(th.cityId);
      return !isTurkeyProvinceName(th.cityName);
    });
  }, [threads, regionScope]);

  // Sync active local/Firestore orders into server inbox metadata when inbox opens
  useEffect(() => {
    if (!enabled) return;
    const eligibleOrders =
      regionScope === 'non_turkey'
        ? orders.filter((ord) => !isTurkeyCityId(ord.cityId))
        : orders;
    eligibleOrders.slice(0, 15).forEach((ord) => {
      void registerOrderSupportMetadata(ord);
    });
  }, [enabled, orders, regionScope]);

  useEffect(() => {
    if (initialOrderId) {
      setSelectedOrderId(initialOrderId);
    }
  }, [initialOrderId]);

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr');
    if (!q) return scopedThreads;
    return scopedThreads.filter((th) => {
      const hay =
        `${th.orderId} ${th.restaurantName} ${th.courierName} ${th.customerName} ${th.cityName}`.toLocaleLowerCase(
          'tr'
        );
      return hay.includes(q);
    });
  }, [scopedThreads, searchQuery]);

  const activeThread = useMemo(() => {
    if (selectedOrderId) {
      const match = scopedThreads.find((th) => th.orderId === selectedOrderId);
      if (match) return match;
    }
    return filteredThreads[0] ?? scopedThreads[0] ?? null;
  }, [selectedOrderId, scopedThreads, filteredThreads]);

  useEffect(() => {
    if (!activeThread || activeThread.unreadForStaff === 0) return;
    void markThreadReadByStaff(activeThread.orderId);
  }, [activeThread?.orderId, activeThread?.unreadForStaff, markThreadReadByStaff]);

  const channelMessages = useMemo(() => {
    if (!activeThread) return [];
    const targetChannel: SupportChatChannel = replyRole;
    return activeThread.messages.filter((m) => m.channel === targetChannel);
  }, [activeThread, replyRole]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages.length, activeThread?.orderId, replyRole]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !draft.trim() || sending) return;
    const text = draft.trim();
    setDraft('');
    const senderName =
      replyRole === 'restaurant'
        ? activeThread.restaurantName
        : activeThread.courierName;
    await sendStaffReply({
      orderId: activeThread.orderId,
      channel: replyRole,
      senderRole: replyRole,
      senderName,
      text,
    });
  };

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-12 border border-[#E6E4DF] rounded-xl overflow-hidden bg-white ${compactHeightClass}`}
    >
      {/* Left Thread List */}
      <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-[#E6E4DF] flex flex-col bg-[#FAF9F7] min-h-0">
        <div className="p-3 border-b border-[#E6E4DF] bg-white">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#575550] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sipariş no, müşteri veya kurye ara..."
              className="w-full pl-8 pr-3 py-2 min-h-[36px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#E6E4DF]">
          {loading && filteredThreads.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#575550]">
              Aktif sipariş sohbetleri yükleniyor...
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#575550]">
              Henüz kayıtlı sipariş sohbeti bulunmuyor.
            </div>
          ) : (
            filteredThreads.map((th) => {
              const selected = activeThread?.orderId === th.orderId;
              const lastMsg = th.messages[th.messages.length - 1];
              return (
                <button
                  key={th.orderId}
                  type="button"
                  onClick={() => setSelectedOrderId(th.orderId)}
                  className={`w-full text-left p-3.5 transition-colors cursor-pointer ${
                    selected ? 'bg-white border-l-2 border-l-[#D9043D]' : 'hover:bg-white/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono tabular-nums text-[11px] font-semibold text-[#D9043D]">
                      #{th.orderId}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {th.unreadForStaff > 0 && (
                        <span className="font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#D9043D] text-white">
                          {th.unreadForStaff}
                        </span>
                      )}
                      {lastMsg && (
                        <span className="font-mono tabular-nums text-[10px] text-[#8A8780]">
                          {formatMessageTime(lastMsg.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-[#141413] truncate mt-1">
                    {th.customerName} · {th.cityName}
                  </p>
                  <p className="text-[11px] text-[#575550] truncate mt-0.5">
                    {lastMsg
                      ? `${lastMsg.senderName}: ${lastMsg.text}`
                      : `${th.restaurantName} · Kurye: ${th.courierName}`}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Active Thread Conversation */}
      <div className="md:col-span-7 flex flex-col bg-white min-h-0">
        {!activeThread ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-[#575550]">
            <MessageSquare className="w-6 h-6 text-[#D9043D] mb-2" />
            <p>Yanıtlamak için soldan bir sipariş seçin.</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-[#E6E4DF] flex flex-wrap items-center justify-between gap-2 bg-white shrink-0">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#141413] truncate">
                  #{activeThread.orderId} · {activeThread.customerName}
                </p>
                <p className="text-[11px] text-[#575550] truncate">
                  {activeThread.restaurantName} · Kurye: {activeThread.courierName}
                </p>
              </div>

              {/* Responder Role Switcher */}
              <div className="inline-flex items-center gap-1 p-1 bg-[#EFECE6] rounded-lg">
                <button
                  type="button"
                  onClick={() => setReplyRole('restaurant')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    replyRole === 'restaurant'
                      ? 'bg-white text-[#D9043D] shadow-xs'
                      : 'text-[#575550] hover:text-[#141413]'
                  }`}
                >
                  <Utensils className="w-3 h-3" />
                  <span>{t.replyAsRestaurant}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReplyRole('courier')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    replyRole === 'courier'
                      ? 'bg-white text-[#D9043D] shadow-xs'
                      : 'text-[#575550] hover:text-[#141413]'
                  }`}
                >
                  <Bike className="w-3 h-3" />
                  <span>{t.replyAsCourier}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#FAF9F7]">
              {channelMessages.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#575550]">
                  Bu kanalda ({replyRole === 'restaurant' ? 'Restoran' : 'Kurye'}) henüz mesaj yok. Müşteriye bilgi gönderebilirsiniz.
                </div>
              ) : (
                channelMessages.map((msg) => {
                  const isStaff = msg.senderRole !== 'customer';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isStaff ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5 px-1">
                        <span className="text-[10px] font-medium text-[#575550]">
                          {msg.senderName}
                        </span>
                        <span className="font-mono tabular-nums text-[10px] text-[#8A8780]">
                          {formatMessageTime(msg.createdAt)}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed border ${
                          isStaff
                            ? 'bg-[#141413] text-white border-[#141413] rounded-tr-xs'
                            : 'bg-white text-[#141413] border-[#E6E4DF] rounded-tl-xs'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={handleSendReply}
              className="p-3 border-t border-[#E6E4DF] bg-white flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  replyRole === 'restaurant'
                    ? `${activeThread.restaurantName} olarak yanıt yazın...`
                    : `${activeThread.courierName} olarak yanıt yazın...`
                }
                maxLength={500}
                className="flex-1 px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-xs"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-lg bg-[#D9043D] text-white text-xs font-semibold hover:bg-[#B80032] disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t.sendMessageBtn}</span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

interface SupportStaffInboxModalProps {
  isOpen: boolean;
  orders: Order[];
  initialOrderId?: string | null;
  onClose: () => void;
}

export function SupportStaffInboxModal({
  isOpen,
  orders,
  initialOrderId = null,
  onClose,
}: SupportStaffInboxModalProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-inbox-title"
    >
      <div
        className="w-full max-w-4xl bg-white border border-[#E6E4DF] rounded-xl overflow-hidden flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#E6E4DF] flex items-center justify-between gap-3">
          <div>
            <h2
              id="staff-inbox-title"
              className="font-display text-lg font-semibold text-[#141413]"
            >
              {t.staffInboxTitle}
            </h2>
            <p className="text-xs text-[#575550]">
              Müşterilerden gelen sipariş mesajlarını restoran veya kurye olarak anlık yanıtlayın
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Restoran ve kurye canlı destek masasını kapat"
            className="w-9 h-9 rounded-lg border border-[#E6E4DF] flex items-center justify-center text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 sm:p-5 bg-[#FAF9F7]">
          <SupportStaffInbox
            orders={orders}
            enabled={isOpen}
            initialOrderId={initialOrderId}
            compactHeightClass="h-[68vh] max-h-[560px]"
          />
        </div>
      </div>
    </div>
  );
}
