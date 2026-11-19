"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Clock3,
  ExternalLink,
  LoaderCircle,
  MapPin,
  PackageOpen,
  ShieldCheck,
  Star,
} from "lucide-react";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import { getPublicProfile, type PublicProfile } from "@/lib/api/profile";

function PublicProfilePageContent() {
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);
  const validUserId = Number.isSafeInteger(userId) && userId > 0;
  const { user } = useMainShell();
  const isOwnProfile = user?.id === userId;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!validUserId) return;
    let active = true;
    getPublicProfile(userId)
      .then((result) => {
        if (active) setProfile(result);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Không tải được hồ sơ người bán.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId, validUserId]);

  if (!validUserId) {
    return <ProfileMessage message="Đường dẫn hồ sơ không hợp lệ." />;
  }
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-muted">
        <LoaderCircle className="mx-auto mb-3 h-7 w-7 animate-spin" />
        Đang tải hồ sơ người bán...
      </div>
    );
  }
  if (error || !profile) {
    return (
      <ProfileMessage
        message={error || "Không tìm thấy hồ sơ sinh viên này."}
      />
    );
  }

  const sortedReviews = [...profile.reviews].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <Link
        href="/products"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại sản phẩm
      </Link>

      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
        <div className="h-28 bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-500 sm:h-36" />
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
            <div className="flex items-end gap-4">
              <ProfileAvatar name={profile.name} src={profile.avatarDataUrl} />
              <div className="pb-1">
                <h1 className="text-xl font-black text-fg sm:text-2xl">
                  {profile.name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {profile.studentVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Sinh viên đã xác thực
                    </span>
                  ) : isOwnProfile ? (
                    // Only the owner sees how to earn the badge; other visitors
                    // see nothing, so a Gmail account is not flagged as suspicious.
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white shadow-sm ring-2 ring-primary/30">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Đăng nhập bằng email trường để nhận tích xanh sinh viên
                    </span>
                  ) : null}
                  <span className="text-xs text-muted">
                    Thành viên từ {formatDate(profile.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <RatingStat
                icon={<Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                value={
                  profile.ratingCount > 0
                    ? profile.averageRating.toFixed(1)
                    : "Mới"
                }
                label={`${profile.ratingCount} đánh giá`}
              />
              <RatingStat
                icon={<PackageOpen className="h-4 w-4 text-indigo-500" />}
                value={String(profile.activeProducts.length)}
                label="tin đang bán"
              />
            </div>
          </div>

          <div className="mt-7 grid gap-6 border-t border-border pt-6 md:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <h2 className="font-extrabold text-fg">Giới thiệu</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">
                {profile.bio || "Người bán chưa thêm phần giới thiệu."}
              </p>
            </div>
            <div className="space-y-3 rounded-2xl bg-surface-2 p-4 text-sm">
              {profile.university && (
                <InfoRow
                  icon={<BadgeCheck className="h-4 w-4" />}
                  value={profile.university}
                />
              )}
              {profile.dormitoryAddress && (
                <InfoRow
                  icon={<MapPin className="h-4 w-4" />}
                  value={profile.dormitoryAddress}
                />
              )}
              {profile.availableTime && (
                <InfoRow
                  icon={<Clock3 className="h-4 w-4" />}
                  value={`Thường online: ${profile.availableTime}`}
                />
              )}
              <InfoRow
                icon={<CalendarDays className="h-4 w-4" />}
                value={`Tham gia ${formatDate(profile.createdAt)}`}
              />
              {profile.socialContact && (
                <a
                  href={contactHref(profile.socialContact)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 font-bold text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  Liên hệ người bán
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-fg">Sản phẩm đang bán</h2>
            <p className="mt-1 text-sm text-muted">
              Tin đang hoạt động của {profile.name}
            </p>
          </div>
          <span className="text-sm font-bold text-muted">
            {profile.activeProducts.length} tin
          </span>
        </div>
        {profile.activeProducts.length === 0 ? (
          <EmptyState message="Người bán hiện chưa có tin đang hoạt động." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.activeProducts.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
              >
                <div className="flex h-32 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500/10 to-fuchsia-500/10 text-primary">
                  <PackageOpen className="h-10 w-10" />
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <h3 className="font-extrabold text-fg group-hover:text-primary">
                    {product.title}
                  </h3>
                  <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {product.categoryName} · {conditionLabel(product.condition)}
                </p>
                <p className="mt-3 font-black text-primary">
                  {formatPrice(product.price)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-fg">Đánh giá người bán</h2>
            <p className="mt-1 text-sm text-muted">
              Nhận xét sau các giao dịch đã hoàn tất
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-sm font-extrabold text-amber-700 dark:text-amber-300">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {profile.ratingCount ? profile.averageRating.toFixed(1) : "—"}
          </span>
        </div>
        {sortedReviews.length === 0 ? (
          <EmptyState message="Chưa có đánh giá công khai." />
        ) : (
          <div className="space-y-3">
            {sortedReviews.map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border border-border bg-surface p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-fg">{review.raterName}</h3>
                    <p className="mt-1 text-xs text-muted">
                      Giao dịch: {review.productTitle}
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className="flex gap-0.5"
                      aria-label={`${review.stars} trên 5 sao`}
                    >
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          className={`h-4 w-4 ${
                            index < review.stars
                              ? "fill-amber-400 text-amber-400"
                              : "text-border"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {formatDate(review.createdAt)}
                    </p>
                  </div>
                </div>
                {review.comment && (
                  <p className="mt-4 whitespace-pre-line text-sm leading-6 text-muted">
                    “{review.comment}”
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProfileMessage({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p role="alert" className="font-semibold text-muted">
        {message}
      </p>
      <Link
        href="/products"
        className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
      >
        Khám phá sản phẩm
      </Link>
    </div>
  );
}

function ProfileAvatar({ name, src }: { name: string; src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Ảnh đại diện ${name}`}
      className="h-24 w-24 rounded-2xl border-4 border-surface bg-surface object-cover shadow-md sm:h-28 sm:w-28"
    />
  ) : (
    <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-surface bg-linear-to-br from-indigo-500 to-fuchsia-600 text-3xl font-black text-white shadow-md sm:h-28 sm:w-28">
      {name.trim().charAt(0).toLocaleUpperCase("vi") || "U"}
    </div>
  );
}

function RatingStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="min-w-24 rounded-xl border border-border bg-surface px-3 py-2 text-center">
      <div className="flex items-center justify-center gap-1.5">
        {icon}
        <span className="font-black text-fg">{value}</span>
      </div>
      <p className="mt-0.5 text-[11px] font-semibold text-muted">{label}</p>
    </div>
  );
}

function InfoRow({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: string;
}) {
  return (
    <p className="flex items-start gap-2.5 text-muted">
      <span className="mt-0.5 shrink-0 text-primary">{icon}</span>
      <span>{value}</span>
    </p>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
      {message}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function formatPrice(price: number | null) {
  if (price === null) return "Liên hệ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function conditionLabel(condition: string) {
  const labels: Record<string, string> = {
    new: "Mới",
    like_new: "Như mới",
    used: "Đã sử dụng",
  };
  return labels[condition] ?? condition;
}

function contactHref(contact: string) {
  const value = contact.trim();
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export default function PublicProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-14 text-center text-muted">
          Đang tải hồ sơ người bán...
        </div>
      }
    >
      <MainShell>
        <PublicProfilePageContent />
      </MainShell>
    </Suspense>
  );
}
