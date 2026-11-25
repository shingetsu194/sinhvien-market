"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  LoaderCircle,
  MessageCircle,
  PackageOpen,
  Send,
} from "lucide-react";
import { useMainShell } from "@/components/layout/MainShell";
import {
  FlowAlert,
  UserFlowApp,
  UserFlowLayout,
} from "@/components/flows/FlowFrame";
import { Button } from "@/components/ui/Button";
import {
  getConversationMessages,
  getConversations,
  respondToChatOffer,
  sendChatOffer,
  sendChatMessage,
  type ChatMessage,
  type ConversationSummary,
} from "@/lib/api/user-flows";

function formatMessageTime(value: string): string {
  if (/^\d{1,2}:\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", { timeStyle: "short" }).format(date);
}

const OFFER_STATUS_VI: Record<string, string> = {
  pending: "đang chờ",
  accepted: "đã chấp nhận",
  rejected: "đã từ chối",
};

/** How often an open conversation fetches new messages (the other side's replies, the auto-reply bot). */
const POLL_MS = 5000;

function ConversationContent() {
  const { user, loadingUser } = useMainShell();
  const params = useParams<{ id: string }>();
  const conversationId = Number(params.id);
  const validId = Number.isSafeInteger(conversationId) && conversationId > 0;
  const [conversation, setConversation] = useState<ConversationSummary | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [offerDraft, setOfferDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !validId) return;
    setLoading(true);
    try {
      const conversations = await getConversations(user);
      const match = conversations.find((item) => item.id === conversationId);
      setConversation(match ?? null);
      if (!match) {
        setError("Không tìm thấy cuộc trò chuyện.");
        setMessages([]);
        return;
      }
      setMessages(await getConversationMessages(conversationId));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được tin nhắn.");
    } finally {
      setLoading(false);
    }
  }, [conversationId, user, validId]);

  useEffect(() => {
    if (loadingUser || !user) return;
    void Promise.resolve().then(refresh);
  }, [loadingUser, refresh, user]);

  // Poll while the tab is visible so replies appear without reloading the page.
  useEffect(() => {
    if (!user || !conversation) return;
    let active = true;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      getConversationMessages(conversation.id)
        .then((next) => {
          if (!active) return;
          setMessages((current) => {
            const changed =
              next.length !== current.length ||
              next.some((m, i) => m.id !== current[i]?.id || m.offerStatus !== current[i]?.offerStatus);
            return changed ? next : current;
          });
        })
        .catch(() => {
          // Transient network error: keep the current messages and try again next tick.
        });
    }, POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [user, conversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Only the buyer can make an offer (the API rejects it from the seller).
  const isSeller = conversation?.myRole === "seller";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !conversation || sending) return;
    setSending(true);
    setError("");
    try {
      const message = await sendChatMessage(user, conversation.id, draft);
      setMessages((current) => [...current, message]);
      setConversation((current) =>
        current
          ? {
              ...current,
              lastMessage: message.body,
              updatedAt: message.createdAt,
            }
          : current,
      );
      setDraft("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gửi tin nhắn thất bại.");
    } finally {
      setSending(false);
    }
  }

  async function submitOffer() {
    if (!user || !conversation || sending) return;
    const offerPrice = Number(offerDraft);
    setSending(true);
    setError("");
    try {
      await sendChatOffer(user, conversation.id, offerPrice);
      setOfferDraft("");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gửi đề nghị giá thất bại.");
    } finally {
      setSending(false);
    }
  }

  async function respondToOffer(message: ChatMessage, status: "accepted" | "rejected") {
    if (!user || !conversation || sending) return;
    setSending(true);
    setError("");
    try {
      await respondToChatOffer(user, conversation.id, message.id, status);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể phản hồi đề nghị.");
    } finally {
      setSending(false);
    }
  }

  if (!validId) {
    return (
      <UserFlowLayout title="Tin nhắn" description="Mã cuộc trò chuyện không hợp lệ.">
        <FlowAlert error="Mã cuộc trò chuyện không hợp lệ." />
      </UserFlowLayout>
    );
  }

  return (
    <UserFlowLayout
      title={conversation?.otherUserName ?? "Cuộc trò chuyện"}
      description={conversation?.productTitle ?? "Trao đổi về sản phẩm"}
    >
      <FlowAlert error={error} />
      <section className="flex h-[min(70vh,720px)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Link
            href="/chat"
            className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-primary"
            aria-label="Quay lại tin nhắn"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-black text-primary">
            {conversation?.otherUserName.charAt(0) ?? "?"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-fg">
              {conversation?.otherUserName ?? "Đang tải..."}
            </p>
            <p className="flex items-center gap-1 truncate text-xs text-muted">
              <PackageOpen className="h-3 w-3" />
              {conversation?.productTitle ?? "Sản phẩm"}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-bg/50 p-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted">
              <LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Đang tải tin nhắn...
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              <MessageCircle className="mx-auto mb-2 h-7 w-7 text-muted/50" />
              Bắt đầu cuộc trò chuyện bằng lời chào nhé.
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[70%] ${
                    message.isMine
                      ? "rounded-br-md bg-primary text-white"
                      : "rounded-bl-md bg-surface-2 text-fg"
                  }`}
                >
                  {!message.isMine && (
                    <p className="mb-1 text-[11px] font-bold opacity-70">
                      {message.senderName}
                    </p>
                  )}
                  {message.type === "offer" && (
                    <p className="mb-1 text-xs font-extrabold">Đề nghị giá</p>
                  )}
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {message.body}
                  </p>
                  {message.offerPrice !== null && (
                    <p className="mt-1 font-black">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                        maximumFractionDigits: 0,
                      }).format(message.offerPrice)}
                      {message.offerStatus && (
                        <span className="ml-2 text-xs font-semibold opacity-75">
                          ({OFFER_STATUS_VI[message.offerStatus] ?? message.offerStatus})
                        </span>
                      )}
                    </p>
                  )}
                  {message.type === "offer" &&
                    !message.isMine &&
                    message.offerStatus === "pending" && (
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="button"
                          disabled={sending}
                          onClick={() => void respondToOffer(message, "accepted")}
                        >
                          Chấp nhận
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={sending}
                          onClick={() => void respondToOffer(message, "rejected")}
                        >
                          Từ chối
                        </Button>
                      </div>
                    )}
                    <p className="mt-1 text-right text-[10px] opacity-70">
                      {formatMessageTime(message.createdAt)}
                    </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={submit}
          className="space-y-2 border-t border-border p-3"
        >
          {!isSeller && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-40 flex-1 text-xs font-bold text-muted">
              Đề nghị giá (₫)
              <input
                type="number"
                min={1}
                step={1000}
                aria-label="Giá đề nghị"
                className="mt-1 block w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm font-normal text-fg outline-none focus:border-primary"
                value={offerDraft}
                onChange={(event) => setOfferDraft(event.target.value)}
                disabled={!conversation || loading}
              />
            </label>
            <Button
              type="button"
              variant="secondary"
              disabled={!offerDraft || Number(offerDraft) <= 0 || sending || !conversation}
              onClick={() => void submitOffer()}
            >
              Đề nghị giá
            </Button>
          </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              maxLength={1000}
              aria-label="Nội dung tin nhắn"
              placeholder="Nhập tin nhắn..."
              className="min-h-11 flex-1 resize-none rounded-xl border border-border bg-bg px-4 py-3 text-sm text-fg outline-none focus:border-primary"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends, Shift+Enter adds a new line.
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              disabled={!conversation || loading}
            />
            <Button
              type="submit"
              disabled={!draft.trim() || sending || !conversation}
              aria-label="Gửi tin nhắn"
            >
              {sending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Gửi
            </Button>
          </div>
        </form>
      </section>
    </UserFlowLayout>
  );
}

export default function ConversationPage() {
  return (
    <UserFlowApp>
      <ConversationContent />
    </UserFlowApp>
  );
}
