"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { BadgeCheck, CircleAlert, Crown, Star, Trophy } from "lucide-react";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import {
  getMarketplaceLeaderboard,
  type LeaderboardData,
  type LeaderboardSeller,
} from "@/lib/api/marketplace";

const rankStyles: Record<number, { label: string; tone: string }> = {
  1: { label: "Hạng 1", tone: "border-amber-400 bg-amber-400/15 text-amber-500" },
  2: { label: "Hạng 2", tone: "border-slate-400 bg-slate-400/15 text-slate-500" },
  3: { label: "Hạng 3", tone: "border-orange-500 bg-orange-500/15 text-orange-600" },
};

function SellerAvatar({
  seller,
  size = "h-14 w-14",
}: {
  seller: LeaderboardSeller;
  size?: string;
}) {
  return seller.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={seller.avatarUrl}
      alt=""
      className={`${size} rounded-full border-2 border-border object-cover`}
    />
  ) : (
    <div
      aria-hidden="true"
      className={`${size} flex items-center justify-center rounded-full border-2 border-border bg-gradient-to-br from-blue-500 to-sky-600 font-black text-white`}
    >
      {seller.name.trim().charAt(0).toUpperCase()}
    </div>
  );
}

function SellerLink({
  seller,
  children,
  className,
}: {
  seller: LeaderboardSeller;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={`/users/${seller.id}`} className={className}>
      {children}
    </Link>
  );
}

function LeaderboardContent() {
  const { user, loadingUser } = useMainShell();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getMarketplaceLeaderboard()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Không tải được bảng xếp hạng.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const topThree = data?.topSellers ?? [];
  const podium = [topThree[1], topThree[0], topThree[2]].filter(
    (seller): seller is LeaderboardSeller => Boolean(seller),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <header className="relative mb-8 overflow-hidden rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-600 via-blue-700 to-sky-600 px-6 py-10 text-center text-white shadow-lg sm:py-14 dark:border-blue-500/30">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-sky-300/20 blur-3xl"
        />
        <div className="relative">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-white shadow-sm">
            <Trophy className="h-7 w-7 text-sky-200" />
          </div>
          <h1 className="text-3xl font-black sm:text-4xl">Bảng xếp hạng Sinh viên</h1>
          <p className="mt-2 text-sm text-blue-50/90 sm:text-base">
            Tôn vinh những người bán uy tín và đóng góp tích cực trong cộng đồng KTX
          </p>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-300 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
        >
          <CircleAlert className="mr-2 inline h-4 w-4" />
          {error}
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-border bg-surface py-16 text-center text-sm text-muted">
          Đang tải bảng xếp hạng...
        </div>
      ) : data.topSellers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <Trophy className="mx-auto mb-3 h-11 w-11 text-amber-400" />
          <h2 className="text-xl font-bold text-fg">Chưa có dữ liệu xếp hạng</h2>
          <p className="mt-2 text-sm text-muted">
            Hãy là người đầu tiên đăng sản phẩm để xuất hiện trên bảng xếp hạng.
          </p>
          <Link
            href="/products/create"
            className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
          >
            Đăng bán ngay
          </Link>
        </div>
      ) : (
        <>
          <section
            aria-label="Ba người bán dẫn đầu"
            className="mb-6 grid items-end gap-4 sm:grid-cols-3 sm:gap-5"
          >
            {podium.map((seller) => {
              const rank = topThree.findIndex((entry) => entry.id === seller.id) + 1;
              const rankStyle = rankStyles[rank];
              return (
                <SellerLink
                  key={seller.id}
                  seller={seller}
                  className={`flex h-full flex-col items-center rounded-3xl border bg-surface p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                    rank === 1
                      ? "border-amber-400/60 sm:min-h-64"
                      : "border-border sm:min-h-56"
                  }`}
                >
                  {rank === 1 && (
                    <Crown className="mb-2 h-6 w-6 text-amber-400" />
                  )}
                  <div className="relative">
                    <SellerAvatar
                      seller={seller}
                      size={rank === 1 ? "h-20 w-20" : "h-16 w-16"}
                    />
                    <span
                      className={`absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface text-xs font-black ${rankStyle.tone}`}
                    >
                      {rank}
                    </span>
                  </div>
                  <span className="mt-3 flex items-center gap-1 font-extrabold text-fg">
                    <span className="max-w-40 truncate">{seller.name}</span>
                    {seller.isStudentVerified && (
                      <BadgeCheck
                        className="h-4 w-4 shrink-0 text-sky-500"
                        aria-label="Sinh viên đã xác thực"
                      />
                    )}
                  </span>
                  <span className="mt-1 text-xs text-muted">
                    <Star className="mr-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {seller.avgRating.toFixed(1)} · {seller.soldCount} đã bán
                  </span>
                  <span className="mt-auto pt-4 text-xs font-bold uppercase tracking-wider text-muted">
                    {rankStyle.label}
                  </span>
                </SellerLink>
              );
            })}
          </section>

          {data.topSellers.length > 3 && (
            <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface">
              <h2 className="border-b border-border px-5 py-4 font-extrabold text-fg">
                Các thứ hạng tiếp theo
              </h2>
              <ol start={4} className="divide-y divide-border">
                {data.topSellers.slice(3).map((seller, index) => (
                  <li key={seller.id}>
                    <SellerLink
                      seller={seller}
                      className="flex items-center gap-3 px-5 py-4 transition hover:bg-surface-2 sm:gap-4"
                    >
                      <span className="w-7 shrink-0 text-center font-black text-muted">
                        {index + 4}
                      </span>
                      <SellerAvatar seller={seller} size="h-11 w-11" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 truncate text-sm font-bold text-fg">
                          {seller.name}
                          {seller.isStudentVerified && (
                            <BadgeCheck className="h-4 w-4 shrink-0 text-sky-500" />
                          )}
                        </span>
                        <span className="mt-1 block text-xs text-muted">
                          {seller.productCount} tin đăng · {seller.soldCount} đã bán
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-bold text-fg">
                          {seller.avgRating.toFixed(1)} ★
                        </span>
                        <span className="text-xs text-muted">
                          {seller.ratingCount} đánh giá
                        </span>
                      </span>
                    </SellerLink>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {!loadingUser && user && (
            <section className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-blue-500/30 bg-blue-500/5 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-2xl">
                🎯
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-extrabold text-fg">Thứ hạng của tôi</h2>
                {data.myStats ? (
                  <p className="mt-1 text-xs text-muted">
                    {data.myStats.soldCount} đã bán · ⭐{" "}
                    {data.myStats.avgRating.toFixed(1)} ·{" "}
                    {data.myStats.productCount} tin đăng
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted">
                    Bạn chưa có thứ hạng. Hãy đăng bán và hoàn thành giao dịch.
                  </p>
                )}
              </div>
              {data.myRank > 0 ? (
                <span className="text-3xl font-black text-primary">
                  #{data.myRank}
                </span>
              ) : (
                <Link
                  href="/products/create"
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
                >
                  Đăng bán ngay
                </Link>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <MainShell>
      <LeaderboardContent />
    </MainShell>
  );
}
