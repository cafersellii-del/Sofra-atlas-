import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bike,
  Clock,
  Headphones,
  MessageSquare,
  Send,
  Utensils,
  X,
} from 'lucide-react';
import { useOrderSupportChat } from '../hooks/useSupportChat';
import { useLanguage } from '../i18n/LanguageContext';
import type { Order, OrderStatus, SupportChatChannel } from '../types/food';

interface LiveSupportChatModalProps {
  order: Order | null;
  initialChannel?: SupportChatChannel;
  onClose: () => void;
  onOpenStaffInbox?: (orderId: string) => void;
}

const STATUS_BADGE_MAP: Record<OrderStatus, string> = {
  received: 'Sipariş Alındı',
  preparing: 'Mutfakta Hazırlanıyor',
  on_the_way: 'Kurye Yolda',
  delivered: 'Teslim Edildi',
};

const QUICK_PROMPTS: Record<SupportChatChannel, string[]> = {
  restaurant: [
    'Siparişim ne durumda?',
    'Ekstra sos ve peçete ekleyebilir misiniz?',
    'Paketleme sıcaklığa uygun hazırlanabilir mi?',
  ],
  courier: [
    'Yaklaştığınızda haber verebilir misiniz?',
    'Zili çalmadan kapıya bırakabilirsiniz.',
    'Kapı girişindeyim, sizi bekliyorum.',
  ],
};

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

export function LiveSupportChatModal({
  order,
  initialChannel = 'restaurant',
  onClose,
  onOpenStaffInbox,
}: LiveSupportChatModalProps) {
  const { t } = useLanguage();
  const [channel, setChannel] = useState<SupportChatChannel>(initialChannel);
  const [draft, setDraft] = useState('');
  const scrollBottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  const isOpen = Boolean(order);
  const {
    messages,
    loading,
    sending,
    error,
    typingPeer,
    sendMessage,
    sendTyping,
    markRead,
  } = useOrderSupportChat(order, isOpen);

  useEffect(() => {
    setChannel(initialChannel);
  }, [initialChannel, order?.id]);

  useEffect(() => {
    if (!isOpen) return;
    void markRead('customer');
  }, [isOpen, messages.length, markRead]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const restaurantName =
    order?.items[0]?.restaurantName || 'Sofra Atlas Mutfağı';

  const channelMessages = useMemo(
    () => messages.filter((m) => m.channel === channel),
    [messages, channel]
  );

  const restaurantMsgCount = useMemo(
    () => messages.filter((m) => m.channel === 'restaurant').length,
    [messages]
  );
  const courierMsgCount = useMemo(
    () => messages.filter((m) => m.channel === 'courier').length,
    [messages]
  );

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages.length, channel]);

  if (!order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    sendTyping(channel, false, 'customer');
    await sendMessage(channel, text, 'customer', order.customerName);
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    sendTyping(channel, value.trim().length > 0, 'customer');
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      sendTyping(channel, false, 'customer');
    }, 1800);
  };

  const handleQuickPrompt = async (promptText: string) => {
    if (sending) return;
    await sendMessage(channel, promptText, 'customer', order.customerName);
  };

  const peerTypingActive =
    typingPeer &&
    typingPeer.channel === channel &&
    typingPeer.senderRole !== 'customer';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-support-title"
    >
      <div
        className="w-full max-w-xl h-[86vh] max-h-[720px] bg-white border border-[#E6E4DF] rounded-xl overflow-hidden flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E6E4DF] bg-white flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-[11px] font-semibold text-[#D9043D] bg-[#FAF9F7] border border-[#E6E4DF] px-2 py-0.5 rounded-md">
                <Headphones className="w-3.5 h-3.5" />
                #{order.id}
              </span>
              <span className="text-[11px] font-medium text-[#141413] bg-[#EFECE6] px-2 py-0.5 rounded-md">
                {STATUS_BADGE_MAP[order.status]}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-[#575550]">
                <Clock className="w-3 h-3 text-[#D9043D]" />
                {order.estimatedArrival}
              </span>
            </div>
            <h2
              id="live-support-title"
              className="font-display text-lg font-semibold text-[#141413] mt-1.5"
            >
              {t.liveSupportTitle}
            </h2>
            <p className="text-xs text-[#575550]">{t.liveSupportSubtitle}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenStaffInbox && (
              <button
                type="button"
                onClick={() => onOpenStaffInbox(order.id)}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[34px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-[11px] font-medium text-[#575550] hover:text-[#141413] hover:border-[#D9043D] cursor-pointer whitespace-nowrap"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#D9043D]" />
                <span>{t.staffInboxBtn}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Canlı destek sohbetini kapat"
              className="w-9 h-9 rounded-lg border border-[#E6E4DF] flex items-center justify-center text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Channel Switcher: Restaurant vs Courier */}
        <div className="px-5 py-3 bg-[#FAF9F7] border-b border-[#E6E4DF] grid grid-cols-2 gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setChannel('restaurant')}
            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
              channel === 'restaurant'
                ? 'bg-white border-[#D9043D] shadow-xs'
                : 'bg-white/60 border-[#E6E4DF] hover:bg-white'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                channel === 'restaurant'
                  ? 'bg-[#D9043D] text-white'
                  : 'bg-[#EFECE6] text-[#575550]'
              }`}
            >
              <Utensils className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#141413] truncate">
                {t.chatWithRestaurant}
              </p>
              <p className="text-[11px] text-[#575550] truncate">
                {restaurantName}
              </p>
            </div>
            {restaurantMsgCount > 0 && (
              <span className="font-mono tabular-nums text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#EFECE6] text-[#141413]">
                {restaurantMsgCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setChannel('courier')}
            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
              channel === 'courier'
                ? 'bg-white border-[#D9043D] shadow-xs'
                : 'bg-white/60 border-[#E6E4DF] hover:bg-white'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                channel === 'courier'
                  ? 'bg-[#D9043D] text-white'
                  : 'bg-[#EFECE6] text-[#575550]'
              }`}
            >
              <Bike className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#141413] truncate">
                {t.chatWithCourier}
              </p>
              <p className="text-[11px] text-[#575550] truncate">
                {order.courierName}
              </p>
            </div>
            {courierMsgCount > 0 && (
              <span className="font-mono tabular-nums text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#EFECE6] text-[#141413]">
                {courierMsgCount}
              </span>
            )}
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-[#FAF9F7]">
          {loading && channelMessages.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#575550]">
              Sohbet geçmişi yükleniyor...
            </div>
          ) : channelMessages.length === 0 ? (
            <div className="bg-white border border-[#E6E4DF] rounded-xl p-6 text-center space-y-2 my-6">
              <div className="w-10 h-10 rounded-full bg-[#FAF9F7] border border-[#E6E4DF] flex items-center justify-center mx-auto text-[#D9043D]">
                {channel === 'restaurant' ? (
                  <Utensils className="w-4 h-4" />
                ) : (
                  <Bike className="w-4 h-4" />
                )}
              </div>
              <p className="font-display text-sm font-semibold text-[#141413]">
                {channel === 'restaurant' ? restaurantName : order.courierName}
              </p>
              <p className="text-xs text-[#575550] max-w-xs mx-auto leading-relaxed">
                {t.noMessagesYet}
              </p>
            </div>
          ) : (
            channelMessages.map((msg) => {
              const isCustomer = msg.senderRole === 'customer';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isCustomer ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[11px] font-medium text-[#575550]">
                      {isCustomer ? 'Siz' : msg.senderName}
                    </span>
                    <span className="font-mono tabular-nums text-[10px] text-[#8A8780]">
                      {formatMessageTime(msg.createdAt)}
                    </span>
                  </div>
                  <div
                    className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed border ${
                      isCustomer
                        ? 'bg-[#D9043D] text-white border-[#D9043D] rounded-tr-xs'
                        : 'bg-white text-[#141413] border-[#E6E4DF] rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}

          {peerTypingActive && (
            <div className="flex items-center gap-2 text-xs text-[#575550] px-1">
              <span className="w-2 h-2 rounded-full bg-[#D9043D] animate-pulse" />
              <span>
                {typingPeer.senderName ||
                  (channel === 'restaurant' ? restaurantName : order.courierName)}{' '}
                yazıyor...
              </span>
            </div>
          )}

          <div ref={scrollBottomRef} />
        </div>

        {/* Quick Prompts + Composer */}
        <div className="bg-white border-t border-[#E6E4DF] px-5 py-3.5 space-y-3 shrink-0">
          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
              {error}
            </p>
          )}

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {QUICK_PROMPTS[channel].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void handleQuickPrompt(prompt)}
                disabled={sending}
                className="px-2.5 py-1.5 rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-[11px] font-medium text-[#141413] hover:border-[#D9043D] hover:text-[#D9043D] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              placeholder={
                channel === 'restaurant'
                  ? `${restaurantName}: ${t.chatPlaceholder}`
                  : `${order.courierName}: ${t.chatPlaceholder}`
              }
              maxLength={500}
              className="flex-1 px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-sm text-[#141413] placeholder:text-[#8A8780] focus:outline-none focus:border-[#D9043D]"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[42px] rounded-lg bg-[#D9043D] text-white text-xs font-semibold hover:bg-[#B80032] transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t.sendMessageBtn}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
