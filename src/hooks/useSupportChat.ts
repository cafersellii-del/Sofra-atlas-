import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Order,
  SupportChatChannel,
  SupportChatMessage,
  SupportSenderRole,
  SupportThreadSummary,
} from '../types/food';

export interface OrderMetaPayload {
  restaurantName?: string;
  courierName?: string;
  customerName?: string;
  cityId?: string;
  cityName?: string;
  neighborhood?: string;
  orderStatus?: Order['status'];
}

export function buildOrderMeta(order: Order): OrderMetaPayload {
  return {
    restaurantName: order.items[0]?.restaurantName || 'Sofra Atlas Mutfağı',
    courierName: order.courierName,
    customerName: order.customerName,
    cityId: order.cityId,
    cityName: order.cityName,
    neighborhood: order.neighborhood,
    orderStatus: order.status,
  };
}

export async function registerOrderSupportMetadata(order: Order): Promise<void> {
  try {
    await fetch(`/api/support-chats/${encodeURIComponent(order.id)}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildOrderMeta(order)),
    });
  } catch {
    // Non-blocking background sync
  }
}

function buildWsUrl(query: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws/support?${query}`;
}

function mergeMessages(
  existing: SupportChatMessage[],
  incoming: SupportChatMessage
): SupportChatMessage[] {
  const idx = existing.findIndex(
    (m) =>
      m.id === incoming.id ||
      (Boolean(incoming.clientMessageId) &&
        m.clientMessageId === incoming.clientMessageId)
  );
  if (idx >= 0) {
    const next = [...existing];
    next[idx] = incoming;
    return next;
  }
  return [...existing, incoming];
}

export interface TypingState {
  channel: SupportChatChannel;
  senderRole: SupportSenderRole;
  senderName: string;
}

export function useOrderSupportChat(
  order: Order | null,
  enabled: boolean
) {
  const [thread, setThread] = useState<SupportThreadSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [typingPeer, setTypingPeer] = useState<TypingState | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const orderId = order?.id ?? null;

  useEffect(() => {
    if (!enabled || !orderId || !order) {
      setThread(null);
      setTypingPeer(null);
      return;
    }

    let cancelled = false;
    let reconnectTimer: number | null = null;
    let pingTimer: number | null = null;
    let reconnectAttempt = 0;

    setLoading(true);
    setError('');

    const orderMeta = buildOrderMeta(order);

    // Register metadata & fetch initial thread snapshot over REST immediately
    void fetch(`/api/support-chats/${encodeURIComponent(orderId)}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderMeta),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { thread?: SupportThreadSummary } | null) => {
        if (!cancelled && data?.thread) {
          setThread(data.thread);
        }
      })
      .catch(() => {
        // Fallback handled by WebSocket snapshot
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const connect = () => {
      if (cancelled) return;
      try {
        const ws = new WebSocket(
          buildWsUrl(`orderId=${encodeURIComponent(orderId)}`)
        );
        wsRef.current = ws;

        ws.onopen = () => {
          reconnectAttempt = 0;
          if (pingTimer) window.clearInterval(pingTimer);
          pingTimer = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 20000);
        };

        ws.onmessage = (evt) => {
          try {
            const payload = JSON.parse(String(evt.data)) as {
              type?: string;
              thread?: SupportThreadSummary;
              message?: SupportChatMessage;
              channel?: SupportChatChannel;
              senderRole?: SupportSenderRole;
              senderName?: string;
              isTyping?: boolean;
              error?: string;
            };

            if (payload.type === 'thread:snapshot' && payload.thread) {
              setThread(payload.thread);
              setLoading(false);
              return;
            }

            if (
              (payload.type === 'message:new' || payload.type === 'message:ack') &&
              payload.message
            ) {
              const committed = payload.message;
              setThread((prev) => {
                if (payload.thread) {
                  return {
                    ...payload.thread,
                    messages: mergeMessages(
                      payload.thread.messages,
                      committed
                    ),
                  };
                }
                if (!prev) return prev;
                return {
                  ...prev,
                  lastMessageAt: committed.createdAt,
                  messages: mergeMessages(prev.messages, committed),
                };
              });
              setTypingPeer(null);
              return;
            }

            if (payload.type === 'thread:updated' && payload.thread) {
              setThread(payload.thread);
              return;
            }

            if (payload.type === 'typing' && payload.senderRole) {
              if (payload.isTyping) {
                setTypingPeer({
                  channel: payload.channel ?? 'restaurant',
                  senderRole: payload.senderRole,
                  senderName: payload.senderName ?? '',
                });
                if (typingTimeoutRef.current) {
                  window.clearTimeout(typingTimeoutRef.current);
                }
                typingTimeoutRef.current = window.setTimeout(() => {
                  setTypingPeer(null);
                }, 3000);
              } else {
                setTypingPeer(null);
              }
              return;
            }

            if (payload.type === 'error' && payload.error) {
              setError(payload.error);
            }
          } catch {
            // Ignore malformed socket frames
          }
        };

        ws.onclose = () => {
          if (pingTimer) {
            window.clearInterval(pingTimer);
            pingTimer = null;
          }
          if (wsRef.current === ws) wsRef.current = null;
          if (!cancelled) {
            const delay = Math.min(8000, 1000 * Math.pow(1.6, reconnectAttempt));
            reconnectAttempt += 1;
            reconnectTimer = window.setTimeout(connect, delay);
          }
        };
      } catch {
        // Fallback continues via HTTP POST/GET
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (pingTimer) window.clearInterval(pingTimer);
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, orderId]);

  const sendMessage = useCallback(
    async (
      channel: SupportChatChannel,
      text: string,
      senderRole: SupportSenderRole = 'customer',
      senderNameOverride?: string
    ): Promise<boolean> => {
      if (!order) return false;
      const trimmed = text.trim();
      if (!trimmed) return false;

      setError('');
      setSending(true);

      const clientMessageId = `cli_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      const senderName =
        senderNameOverride ||
        (senderRole === 'customer'
          ? order.customerName
          : senderRole === 'courier'
            ? order.courierName
            : order.items[0]?.restaurantName || 'Restoran');

      const optimistic: SupportChatMessage = {
        id: clientMessageId,
        clientMessageId,
        orderId: order.id,
        channel,
        senderRole,
        senderName,
        text: trimmed,
        createdAt: new Date().toISOString(),
      };

      setThread((prev) =>
        prev
          ? {
              ...prev,
              lastMessageAt: optimistic.createdAt,
              messages: mergeMessages(prev.messages, optimistic),
            }
          : {
              orderId: order.id,
              restaurantName:
                order.items[0]?.restaurantName || 'Sofra Atlas Mutfağı',
              courierName: order.courierName,
              customerName: order.customerName,
              cityName: order.cityName,
              neighborhood: order.neighborhood,
              orderStatus: order.status,
              lastMessageAt: optimistic.createdAt,
              unreadForCustomer: 0,
              unreadForStaff: 0,
              messages: [optimistic],
            }
      );

      const orderMeta = buildOrderMeta(order);

      try {
        // Always persist via REST API cleanly AND let server broadcast to all WS peers (or send over WS if open)
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'message:send',
              orderId: order.id,
              channel,
              senderRole,
              senderName,
              text: trimmed,
              clientMessageId,
              orderMeta,
            })
          );
          return true;
        }

        const resp = await fetch(
          `/api/support-chats/${encodeURIComponent(order.id)}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channel,
              senderRole,
              senderName,
              text: trimmed,
              clientMessageId,
              orderMeta,
            }),
          }
        );

        const data = (await resp.json()) as {
          error?: string;
          thread?: SupportThreadSummary;
        };

        if (!resp.ok) {
          setError(data.error || 'Mesaj gönderilemedi.');
          return false;
        }
        if (data.thread) {
          setThread(data.thread);
        }
        return true;
      } catch {
        setError('Bağlantı kesintisi nedeniyle mesaj gönderilemedi.');
        return false;
      } finally {
        setSending(false);
      }
    },
    [order]
  );

  const sendTyping = useCallback(
    (
      channel: SupportChatChannel,
      isTyping: boolean,
      senderRole: SupportSenderRole = 'customer'
    ) => {
      const ws = wsRef.current;
      if (!order || !ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          type: 'typing',
          orderId: order.id,
          channel,
          senderRole,
          senderName: order.customerName,
          isTyping,
        })
      );
    },
    [order]
  );

  const markRead = useCallback(
    async (readerRole: 'customer' | 'staff' = 'customer') => {
      if (!orderId) return;
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'thread:read',
            orderId,
            readerRole,
          })
        );
        return;
      }
      try {
        await fetch(`/api/support-chats/${encodeURIComponent(orderId)}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ readerRole }),
        });
      } catch {
        // Ignore silent read update failures
      }
    },
    [orderId]
  );

  return {
    thread,
    messages: thread?.messages ?? [],
    loading,
    sending,
    error,
    typingPeer,
    sendMessage,
    sendTyping,
    markRead,
  };
}

export function useSupportInbox(enabled: boolean) {
  const [threads, setThreads] = useState<SupportThreadSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let reconnectTimer: number | null = null;
    let pingTimer: number | null = null;
    let reconnectAttempt = 0;

    setLoading(true);

    void fetch('/api/support-chats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { threads?: SupportThreadSummary[] } | null) => {
        if (!cancelled && Array.isArray(data?.threads)) {
          setThreads(data.threads);
        }
      })
      .catch(() => {
        // WS snapshot will supply threads
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const upsertThread = (incoming: SupportThreadSummary) => {
      setThreads((prev) => {
        const filtered = prev.filter((t) => t.orderId !== incoming.orderId);
        return [incoming, ...filtered].sort((a, b) =>
          b.lastMessageAt.localeCompare(a.lastMessageAt)
        );
      });
    };

    const connect = () => {
      if (cancelled) return;
      try {
        const ws = new WebSocket(buildWsUrl('scope=inbox'));
        wsRef.current = ws;

        ws.onopen = () => {
          reconnectAttempt = 0;
          if (pingTimer) window.clearInterval(pingTimer);
          pingTimer = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 20000);
        };

        ws.onmessage = (evt) => {
          try {
            const payload = JSON.parse(String(evt.data)) as {
              type?: string;
              threads?: SupportThreadSummary[];
              thread?: SupportThreadSummary;
            };
            if (payload.type === 'inbox:snapshot' && Array.isArray(payload.threads)) {
              setThreads(payload.threads);
              setLoading(false);
              return;
            }
            if (
              (payload.type === 'message:new' ||
                payload.type === 'message:ack' ||
                payload.type === 'thread:updated') &&
              payload.thread
            ) {
              upsertThread(payload.thread);
            }
          } catch {
            // Ignore malformed socket frames
          }
        };

        ws.onclose = () => {
          if (pingTimer) {
            window.clearInterval(pingTimer);
            pingTimer = null;
          }
          if (wsRef.current === ws) wsRef.current = null;
          if (!cancelled) {
            const delay = Math.min(8000, 1000 * Math.pow(1.6, reconnectAttempt));
            reconnectAttempt += 1;
            reconnectTimer = window.setTimeout(connect, delay);
          }
        };
      } catch {
        // Ignore WS init failures
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (pingTimer) window.clearInterval(pingTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled]);

  const sendStaffReply = useCallback(
    async (params: {
      orderId: string;
      channel: SupportChatChannel;
      senderRole: 'restaurant' | 'courier';
      senderName: string;
      text: string;
    }): Promise<boolean> => {
      const trimmed = params.text.trim();
      if (!trimmed) return false;
      setSending(true);
      const clientMessageId = `stf_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}`;

      try {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'message:send',
              orderId: params.orderId,
              channel: params.channel,
              senderRole: params.senderRole,
              senderName: params.senderName,
              text: trimmed,
              clientMessageId,
            })
          );
          return true;
        }

        const resp = await fetch(
          `/api/support-chats/${encodeURIComponent(params.orderId)}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channel: params.channel,
              senderRole: params.senderRole,
              senderName: params.senderName,
              text: trimmed,
              clientMessageId,
            }),
          }
        );
        if (!resp.ok) return false;
        const data = (await resp.json()) as { thread?: SupportThreadSummary };
        if (data.thread) {
          const updated = data.thread;
          setThreads((prev) => {
            const rest = prev.filter((t) => t.orderId !== updated.orderId);
            return [updated, ...rest].sort((a, b) =>
              b.lastMessageAt.localeCompare(a.lastMessageAt)
            );
          });
        }
        return true;
      } catch {
        return false;
      } finally {
        setSending(false);
      }
    },
    []
  );

  const markThreadReadByStaff = useCallback(async (orderId: string) => {
    try {
      await fetch(`/api/support-chats/${encodeURIComponent(orderId)}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readerRole: 'staff' }),
      });
    } catch {
      // Ignore
    }
  }, []);

  return {
    threads,
    loading,
    sending,
    sendStaffReply,
    markThreadReadByStaff,
  };
}
