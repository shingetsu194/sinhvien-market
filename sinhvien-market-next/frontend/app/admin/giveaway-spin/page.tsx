"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Dices,
  ExternalLink,
  FastForward,
  Gift,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { AdminShell, useAdminShell } from "@/components/admin/AdminShell";
import { Modal } from "@/components/admin/Modal";
import {
  getAdminGiveawayById,
  getAdminGiveaways,
  saveGiveawayWinner,
} from "@/lib/api/admin";
import type { AdminGiveaway, GiveawayParticipant } from "@/lib/types/admin";
import { cn } from "@/lib/cn";
import { formatDateTimeVi } from "@/lib/validation/admin";

const CARD_WIDTH = 184;
const CARD_GAP = 12;
const CARD_STRIDE = CARD_WIDTH + CARD_GAP;
const TARGET_SLOT_INDEX = 38;
const TOTAL_SLOTS = 52;
const SPIN_DURATION_MS = 6000;

const CONFETTI_PIECES = Array.from({ length: 28 }, (_, idx) => ({
  id: idx,
  left: `${(idx * 37) % 100}%`,
  delay: `${(idx % 7) * 0.12}s`,
  color: [
    "bg-amber-400",
    "bg-sky-500",
    "bg-blue-500",
    "bg-emerald-400",
    "bg-cyan-400",
  ][idx % 5],
}));

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "SV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function GiveawaySpinInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useAdminShell();

  const rawId = searchParams.get("id");
  const parsedId = rawId ? Number(rawId) : NaN;

  const [loading, setLoading] = useState(true);
  const [allGiveaways, setAllGiveaways] = useState<AdminGiveaway[]>([]);
  const [giveaway, setGiveaway] = useState<AdminGiveaway | null>(null);

  const [spinning, setSpinning] = useState(false);
  const [trackOffsetPx, setTrackOffsetPx] = useState(0);
  const [transitionMs, setTransitionMs] = useState(0);
  const [stripItems, setStripItems] = useState<GiveawayParticipant[]>([]);
  const [winnerModalPlayer, setWinnerModalPlayer] =
    useState<GiveawayParticipant | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWinnerRef = useRef<GiveawayParticipant | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let active = true;
    getAdminGiveaways()
      .then(async (list) => {
        if (!active) return;
        setAllGiveaways(list);

        const targetId =
          !Number.isNaN(parsedId) && parsedId > 0
            ? parsedId
            : (list.find((g) => g.status === "active")?.id ?? list[0]?.id);

        if (!targetId) {
          setGiveaway(null);
          return;
        }

        const detail = await getAdminGiveawayById(targetId);
        if (!active) return;
        setGiveaway(detail);

        if (detail.participants.length > 0) {
          const initialStrip = Array.from(
            { length: TOTAL_SLOTS },
            (_, idx) => detail.participants[idx % detail.participants.length],
          );
          setStripItems(initialStrip);
        } else {
          setStripItems([]);
        }
        setTrackOffsetPx(0);
        setTransitionMs(0);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Không thể tải thông tin vòng quay.";
        showToast(msg, "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [parsedId, showToast]);

  const finishSpinWithWinner = async (
    currentGiveaway: AdminGiveaway,
    winner: GiveawayParticipant,
  ) => {
    if (spinTimerRef.current) {
      clearTimeout(spinTimerRef.current);
      spinTimerRef.current = null;
    }

    try {
      const res = await saveGiveawayWinner({
        id: currentGiveaway.id,
        winnerId: winner.id,
      });
      const updated: AdminGiveaway = {
        ...currentGiveaway,
        status: "ended",
        winnerId: winner.id,
        winnerName: winner.name,
      };
      setGiveaway(updated);
      setAllGiveaways((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setWinnerModalPlayer(winner);
      setShowConfetti(true);
      showToast(res.message, "success");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Không thể lưu kết quả quay số.";
      showToast(msg, "error");
    } finally {
      setSpinning(false);
      pendingWinnerRef.current = null;
    }
  };

  const handleStartSpin = () => {
    if (!giveaway || spinning) return;
    const participants = giveaway.participants;
    if (participants.length === 0) {
      showToast("Chưa có sinh viên nào đăng ký tham gia sự kiện này!", "warning");
      return;
    }

    const winnerIndex = Math.floor(Math.random() * participants.length);
    const chosenWinner = participants[winnerIndex];
    pendingWinnerRef.current = chosenWinner;

    const nextStrip = Array.from({ length: TOTAL_SLOTS }, (_, idx) => {
      if (idx === TARGET_SLOT_INDEX) return chosenWinner;
      return participants[idx % participants.length];
    });

    setStripItems(nextStrip);
    setTransitionMs(0);
    setTrackOffsetPx(0);
    setSpinning(true);
    setShowConfetti(false);

    const viewportWidth = viewportRef.current?.clientWidth ?? 760;
    const targetCenter = TARGET_SLOT_INDEX * CARD_STRIDE + CARD_WIDTH / 2;
    const finalOffset = Math.max(0, targetCenter - viewportWidth / 2);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTransitionMs(SPIN_DURATION_MS);
        setTrackOffsetPx(finalOffset);
      });
    });

    spinTimerRef.current = setTimeout(() => {
      void finishSpinWithWinner(giveaway, chosenWinner);
    }, SPIN_DURATION_MS + 150);
  };

  const handleFastForward = () => {
    if (!giveaway || !spinning || !pendingWinnerRef.current) return;
    setTransitionMs(250);
    void finishSpinWithWinner(giveaway, pendingWinnerRef.current);
  };

  const winnerParticipant = useMemo(() => {
    if (!giveaway || !giveaway.winnerId) return null;
    return (
      giveaway.participants.find((p) => p.id === giveaway.winnerId) ?? {
        id: giveaway.winnerId,
        name: giveaway.winnerName ?? "Sinh viên may mắn",
        email: "—",
        joinedAt: giveaway.endTime,
      }
    );
  }, [giveaway]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-2xl bg-white dark:bg-slate-900" />
        <div className="h-72 animate-pulse rounded-2xl bg-white dark:bg-slate-900" />
        <div className="h-64 animate-pulse rounded-2xl bg-white dark:bg-slate-900" />
      </div>
    );
  }

  if (!giveaway) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <Gift className="mx-auto mb-3 h-12 w-12 text-slate-400" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Không tìm thấy sự kiện Giveaway
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Sự kiện này không tồn tại hoặc đã bị xóa khỏi hệ thống.
        </p>
        <Link
          href="/admin/giveaways"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách Giveaways
        </Link>
      </div>
    );
  }

  const isEnded = giveaway.status === "ended";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/giveaways"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Danh sách Giveaways
        </Link>

        {allGiveaways.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Chọn sự kiện:
            </span>
            <select
              aria-label="Chọn sự kiện Giveaway"
              value={giveaway.id}
              disabled={spinning}
              onChange={(e) =>
                router.push(`/admin/giveaway-spin?id=${e.target.value}`)
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {allGiveaways.map((item) => (
                <option key={item.id} value={item.id}>
                  #{item.id} — {item.title} (
                  {item.status === "active" ? "Đang mở" : "Đã kết thúc"})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {giveaway.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={giveaway.imageUrl}
                alt={giveaway.title}
                className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200 object-cover dark:border-slate-700"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-sky-500 text-white shadow-md">
                <Gift className="h-8 w-8" />
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  GIVEAWAY #{giveaway.id}
                </span>
                {isEnded ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                    <Trophy className="h-3.5 w-3.5" />
                    Đã tìm thấy chủ nhân
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    Sẵn sàng quay thưởng
                  </span>
                )}
              </div>

              <h2 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">
                {giveaway.title}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {giveaway.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 dark:border-slate-800 dark:bg-slate-800/60">
              <span className="block text-[11px] text-slate-400">
                Hạn đăng ký
              </span>
              <span className="mt-0.5 inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                {formatDateTimeVi(giveaway.endTime)}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 dark:border-slate-800 dark:bg-slate-800/60">
              <span className="block text-[11px] text-slate-400">
                Danh sách hợp lệ
              </span>
              <span className="mt-0.5 inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                <Users className="h-3.5 w-3.5" />
                {giveaway.participants.length} sinh viên
              </span>
            </div>
          </div>
        </div>
      </div>

      {isEnded && winnerParticipant && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400/80 bg-linear-to-r from-amber-50 via-yellow-50 to-orange-50 p-6 shadow-md dark:border-amber-500/50 dark:from-amber-950/40 dark:via-slate-900 dark:to-orange-950/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                <Trophy className="h-8 w-8" />
              </div>
              <div>
                <span className="text-xs font-extrabold tracking-wider text-amber-700 uppercase dark:text-amber-400">
                  🎉 Chúc mừng sinh viên trúng thưởng
                </span>
                <h3 className="mt-0.5 text-xl font-black text-slate-900 dark:text-white">
                  {winnerParticipant.name}
                </h3>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Email: {winnerParticipant.email} • Mã SV tham gia: #{winnerParticipant.id}
                </p>
              </div>
            </div>

            <Link
              href={`/admin/users/detail?id=${winnerParticipant.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-xs transition hover:bg-amber-400"
            >
              Xem hồ sơ người trúng giải
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-xl">
        {showConfetti && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {CONFETTI_PIECES.map((piece) => (
              <span
                key={piece.id}
                style={{ left: piece.left, animationDelay: piece.delay }}
                className={cn(
                  "absolute top-2 h-3 w-2 animate-bounce rounded-xs opacity-80",
                  piece.color,
                )}
              />
            ))}
          </div>
        )}

        <div className="mb-5 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-300">
            <Dices className="h-3.5 w-3.5" />
            Bàn quay ngẫu nhiên công bằng (6 giây)
          </span>
          <h3 className="mt-2 text-lg font-extrabold text-white">
            {spinning
              ? "Đang quay số... Chờ kim chỉ dừng lại!"
              : isEnded
                ? "Sự kiện đã hoàn tất quay số"
                : "Nhấn nút Quay số để chọn ngẫu nhiên 1 sinh viên may mắn"}
          </h3>
        </div>

        {giveaway.participants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 py-12 text-center text-slate-400">
            Chưa có sinh viên nào đăng ký tham gia sự kiện này.
          </div>
        ) : (
          <div
            ref={viewportRef}
            className="relative mx-auto overflow-hidden rounded-2xl border-2 border-blue-500/40 bg-slate-900/90 py-6 shadow-inner"
          >
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-linear-to-r from-slate-950 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-slate-950 to-transparent" />

            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center justify-between">
              <div className="h-0 w-0 border-x-10 border-t-14 border-x-transparent border-t-amber-400 drop-shadow-md" />
              <div className="h-full w-0.5 bg-amber-400/70" />
              <div className="h-0 w-0 border-x-10 border-b-14 border-x-transparent border-b-amber-400 drop-shadow-md" />
            </div>

            <div
              style={{
                transform: `translate3d(-${trackOffsetPx}px, 0, 0)`,
                transitionProperty: "transform",
                transitionDuration: `${transitionMs}ms`,
                transitionTimingFunction: "cubic-bezier(0.12, 0.8, 0.18, 1)",
              }}
              className="flex items-center gap-3 px-4"
            >
              {stripItems.map((player, idx) => {
                const isWinnerCard =
                  isEnded && giveaway.winnerId === player.id && idx === TARGET_SLOT_INDEX;
                return (
                  <div
                    key={`${player.id}-${idx}`}
                    style={{ width: `${CARD_WIDTH}px` }}
                    className={cn(
                      "shrink-0 rounded-xl border p-3.5 text-center transition",
                      isWinnerCard
                        ? "border-amber-400 bg-amber-500/20 shadow-lg"
                        : "border-slate-800 bg-slate-900/90",
                    )}
                  >
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-sky-600 text-sm font-extrabold text-white shadow-sm">
                      {getInitials(player.name)}
                    </div>
                    <p className="mt-2.5 truncate text-sm font-bold text-white">
                      {player.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {player.email}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {!isEnded && (
            <button
              type="button"
              disabled={spinning || giveaway.participants.length === 0}
              onClick={handleStartSpin}
              className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-amber-400 via-orange-500 to-sky-500 px-7 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Dices className={cn("h-5 w-5", spinning && "animate-spin")} />
              {spinning ? "Đang quay thưởng..." : "Bắt đầu Quay số!"}
            </button>
          )}

          {spinning && (
            <button
              type="button"
              onClick={handleFastForward}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
            >
              <FastForward className="h-4 w-4 text-amber-400" />
              Hiện kết quả ngay
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Danh sách sinh viên đăng ký tham gia ({giveaway.participants.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tất cả tài khoản hợp lệ được đưa vào dải băng chuyền quay số ngẫu nhiên
          </p>
        </div>

        {giveaway.participants.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Chưa có người tham gia.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">STT</th>
                  <th className="px-4 py-3">Sinh viên</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Thời gian đăng ký</th>
                  <th className="px-4 py-3 text-right">Kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {giveaway.participants.map((p, index) => {
                  const isWinner = giveaway.winnerId === p.id;
                  return (
                    <tr
                      key={p.id}
                      className={cn(
                        "transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40",
                        isWinner && "bg-amber-50/60 dark:bg-amber-500/10",
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">
                        #{index + 1}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        <Link
                          href={`/admin/users/detail?id=${p.id}`}
                          className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {p.name}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {p.email}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {formatDateTimeVi(p.joinedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isWinner ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                            <Trophy className="h-3 w-3 text-amber-500" />
                            Trúng thưởng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            Đã đăng ký
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(winnerModalPlayer)}
        onClose={() => setWinnerModalPlayer(null)}
        title="🎉 Chúc mừng người chiến thắng!"
        subtitle={`Kết quả quay thưởng sự kiện "${giveaway.title}" đã được ghi nhận vào hệ thống.`}
        icon={<Trophy className="h-6 w-6" />}
        tone="amber"
      >
        {winnerModalPlayer && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-amber-400 to-orange-500 text-white shadow-lg">
              <Trophy className="h-10 w-10" />
            </div>

            <div>
              <p className="text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                Sinh viên may mắn trúng giải
              </p>
              <h4 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                {winnerModalPlayer.name}
              </h4>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {winnerModalPlayer.email}
              </p>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWinnerModalPlayer(null)}
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function AdminGiveawaySpinPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <AdminShell
      title="Vòng quay may mắn"
      onResetMock={() => setRefreshKey((k) => k + 1)}
    >
      <Suspense
        fallback={
          <div className="h-72 animate-pulse rounded-2xl bg-white dark:bg-slate-900" />
        }
      >
        <GiveawaySpinInner key={refreshKey} />
      </Suspense>
    </AdminShell>
  );
}
