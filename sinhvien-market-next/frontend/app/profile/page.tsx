"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Clock3,
  CreditCard,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Save,
  ShieldCheck,
  UserRound,
  UserRoundCheck,
  Camera,
} from "lucide-react";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import { Button } from "@/components/ui/Button";
import {
  changeProfilePassword,
  getOwnProfile,
  getSecurityQuestionLabel,
  updateOwnProfile,
  updateProfileAvatar,
  updateProfileBank,
  updateProfileSecurityQuestion,
  type BankAccountProfile,
  type OwnProfile,
  type OwnProfileUpdate,
} from "@/lib/api/profile";
import { ApiError } from "@/lib/api/types";
import { mockUpdateCurrentUserName } from "@/lib/api/mock/auth";
import {
  SECURITY_QUESTIONS,
  type SecurityQuestionId,
} from "@/lib/constants/auth";

type ProfileTab = "info" | "security" | "bank";

const TABS: Array<{
  id: ProfileTab;
  label: string;
  icon: typeof UserRound;
}> = [
  { id: "info", label: "Thông tin cá nhân", icon: UserRound },
  { id: "security", label: "Bảo mật & tài khoản", icon: LockKeyhole },
  { id: "bank", label: "Tài khoản ngân hàng", icon: CreditCard },
];

const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-fg outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const labelClass = "block text-sm font-bold text-fg";

function ProfileContent() {
  const { user, loadingUser, refreshUser } = useMainShell();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabValue = searchParams.get("tab");
  const tab: ProfileTab =
    tabValue === "security" || tabValue === "bank" ? tabValue : "info";

  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [draft, setDraft] = useState<OwnProfileUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [bankDraft, setBankDraft] = useState<BankAccountProfile>({
    bankName: "",
    bankCode: "",
    accountNo: "",
    accountName: "",
  });
  const [question, setQuestion] = useState<SecurityQuestionId>("q1");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    if (loadingUser || !user) return;

    let active = true;
    getOwnProfile(user)
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setDraft({
          name: result.name,
          phone: result.phone,
          university: result.university,
          studentId: result.studentId,
          dormitoryAddress: result.dormitoryAddress,
          socialContact: result.socialContact,
          bio: result.bio,
          availableTime: result.availableTime,
        });
        setBankDraft(
          result.bankAccount ?? {
            bankName: "",
            bankCode: "",
            accountNo: "",
            accountName: "",
          },
        );
        setQuestion(result.securityQuestion ?? "q1");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof Error ? cause.message : "Không tải được hồ sơ.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadingUser, user]);

  function showError(cause: unknown) {
    setError(
      cause instanceof ApiError || cause instanceof Error
        ? cause.message
        : "Đã có lỗi xảy ra. Vui lòng thử lại.",
    );
    setNotice("");
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !draft) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateOwnProfile(user, draft);
      await mockUpdateCurrentUserName(updated.name);
      setProfile(updated);
      setDraft({
        name: updated.name,
        phone: updated.phone,
        university: updated.university,
        studentId: updated.studentId,
        dormitoryAddress: updated.dormitoryAddress,
        socialContact: updated.socialContact,
        bio: updated.bio,
        availableTime: updated.availableTime,
      });
      refreshUser();
      setNotice("Đã lưu thông tin hồ sơ.");
    } catch (cause) {
      showError(cause);
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Chỉ nhận ảnh JPG, PNG hoặc WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Ảnh không được vượt quá 10MB.");
      return;
    }

    setAvatarSaving(true);
    setError("");
    setNotice("");
    try {
      const imageUrl = await compressAvatar(file);
      await updateProfileAvatar(user.id, imageUrl);
      setProfile((current) =>
        current ? { ...current, avatarDataUrl: imageUrl } : current,
      );
      setNotice("Đã cập nhật ảnh đại diện (bản xem thử).");
    } catch (cause) {
      showError(cause);
    } finally {
      setAvatarSaving(false);
    }
  }

  async function saveBank(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await updateProfileBank(user.id, {
        ...bankDraft,
        accountName: bankDraft.accountName.trim().toLocaleUpperCase("vi"),
      });
      setProfile((current) =>
        current
          ? {
              ...current,
              bankAccount: {
                ...bankDraft,
                accountName: bankDraft.accountName.trim().toLocaleUpperCase("vi"),
              },
            }
          : current,
      );
      setNotice("Đã lưu thông tin ngân hàng (bản xem thử).");
    } catch (cause) {
      showError(cause);
    } finally {
      setSaving(false);
    }
  }

  async function saveSecurityQuestion(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await updateProfileSecurityQuestion(user.id, question, answer);
      setProfile((current) =>
        current ? { ...current, securityQuestion: question } : current,
      );
      setAnswer("");
      setNotice("Đã cập nhật câu hỏi bảo mật (bản xem thử).");
    } catch (cause) {
      showError(cause);
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await changeProfilePassword(password);
      setPassword({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setNotice("Đã đổi mật khẩu (bản xem thử).");
    } catch (cause) {
      showError(cause);
    } finally {
      setSaving(false);
    }
  }

  if (loadingUser || (user && loading)) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-14 text-center text-muted">
        <LoaderCircle className="mx-auto mb-3 h-7 w-7 animate-spin" />
        Đang tải hồ sơ...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <LockKeyhole className="mx-auto mb-4 h-10 w-10 text-primary" />
        <h1 className="text-2xl font-black text-fg">Đăng nhập để xem hồ sơ</h1>
        <p className="mt-2 text-sm text-muted">
          Hồ sơ cá nhân chỉ hiển thị với tài khoản đang đăng nhập.
        </p>
        <Link
          href="/login-role"
          className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
        >
          Đến cổng đăng nhập
        </Link>
      </div>
    );
  }

  if (!profile || !draft) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p role="alert" className="text-sm font-semibold text-rose-600">
          {error || "Không thể tải hồ sơ."}
        </p>
      </div>
    );
  }

  const updateDraft = <K extends keyof OwnProfileUpdate>(
    key: K,
    value: OwnProfileUpdate[K],
  ) => setDraft((current) => (current ? { ...current, [key]: value } : current));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Về trang chủ
      </Link>

      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-fg sm:text-3xl">
            Hồ sơ cá nhân
          </h1>
          <p className="mt-1 text-sm text-muted">
            Quản lý thông tin, bảo mật và thanh toán của bạn.
          </p>
        </div>
        <Link
          href={`/users/${user.id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-bold text-fg transition hover:border-primary hover:text-primary"
        >
          <UserRoundCheck className="h-4 w-4" />
          Xem hồ sơ công khai
        </Link>
      </header>

      {(error || notice) && (
        <div
          role={error ? "alert" : "status"}
          className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${
            error
              ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
              : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="h-fit overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border p-5 text-center">
            <Avatar
              name={profile.name}
              src={profile.avatarDataUrl}
              size="large"
            />
            <h2 className="mt-3 font-extrabold text-fg">{profile.name}</h2>
            <p className="mt-0.5 truncate text-xs text-muted">{profile.email}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              {profile.rankName}
            </span>
          </div>
          <nav aria-label="Điều hướng hồ sơ" className="p-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => router.replace(`/profile?tab=${id}`)}
                aria-current={tab === id ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${
                  tab === id
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
          <div className="mx-4 mb-4 rounded-xl bg-amber-500/10 p-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <Banknote className="mb-1 inline h-4 w-4" /> {profile.coins} xu
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          {tab === "info" && (
            <>
              <section className="rounded-2xl border border-border bg-surface">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="font-extrabold text-fg">Ảnh đại diện</h2>
                  <p className="mt-1 text-xs text-muted">
                    JPG, PNG hoặc WEBP, tối đa 10MB.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-4 p-5 sm:flex-row">
                  <Avatar
                    name={profile.name}
                    src={profile.avatarDataUrl}
                    size="large"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary hover:text-white">
                    {avatarSaving ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    {avatarSaving ? "Đang lưu..." : "Chọn ảnh"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={avatarSaving}
                      onChange={onAvatarChange}
                    />
                  </label>
                  <p className="text-xs text-muted">
                    Ảnh sẽ được thu nhỏ và lưu cục bộ trong chế độ xem thử.
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-surface">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="font-extrabold text-fg">Chi tiết hồ sơ</h2>
                  <p className="mt-1 text-xs text-muted">
                    Email đăng nhập không thể thay đổi tại đây.
                  </p>
                </div>
                <form className="space-y-6 p-5" onSubmit={saveProfile}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Họ tên *">
                      <input
                        required
                        minLength={2}
                        maxLength={100}
                        className={inputClass}
                        value={draft.name}
                        onChange={(event) =>
                          updateDraft("name", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Email">
                      <input
                        disabled
                        className={`${inputClass} cursor-not-allowed opacity-60`}
                        value={profile.email}
                      />
                    </Field>
                    <Field label="Số điện thoại">
                      <input
                        className={inputClass}
                        value={draft.phone}
                        onChange={(event) =>
                          updateDraft("phone", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Trường / Khoa">
                      <input
                        className={inputClass}
                        placeholder="Ví dụ: ĐH KHTN - Khoa CNTT"
                        value={draft.university}
                        onChange={(event) =>
                          updateDraft("university", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Mã số sinh viên">
                      <input
                        className={inputClass}
                        value={draft.studentId}
                        onChange={(event) =>
                          updateDraft("studentId", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Ký túc xá / địa chỉ giao nhận">
                      <input
                        className={inputClass}
                        value={draft.dormitoryAddress}
                        onChange={(event) =>
                          updateDraft("dormitoryAddress", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Liên kết Zalo / Facebook">
                      <input
                        className={inputClass}
                        placeholder="zalo.me/..."
                        value={draft.socialContact}
                        onChange={(event) =>
                          updateDraft("socialContact", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Thời gian thường online">
                      <input
                        className={inputClass}
                        placeholder="Buổi tối / Cuối tuần"
                        value={draft.availableTime}
                        onChange={(event) =>
                          updateDraft("availableTime", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Giới thiệu bản thân" className="sm:col-span-2">
                      <textarea
                        rows={4}
                        maxLength={500}
                        className={inputClass}
                        value={draft.bio}
                        onChange={(event) =>
                          updateDraft("bio", event.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Lưu thay đổi
                    </Button>
                  </div>
                </form>
              </section>
            </>
          )}

          {tab === "security" && (
            <>
              <section className="rounded-2xl border border-border bg-surface">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="font-extrabold text-fg">Thay đổi mật khẩu</h2>
                  <p className="mt-1 text-xs text-muted">
                    Dùng mật khẩu hiện tại để xác nhận thay đổi.
                  </p>
                </div>
                <form className="space-y-4 p-5" onSubmit={savePassword}>
                  <Field label="Mật khẩu hiện tại">
                    <input
                      required
                      type="password"
                      autoComplete="current-password"
                      className={inputClass}
                      value={password.currentPassword}
                      onChange={(event) =>
                        setPassword((current) => ({
                          ...current,
                          currentPassword: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Mật khẩu mới">
                      <input
                        required
                        minLength={8}
                        type="password"
                        autoComplete="new-password"
                        className={inputClass}
                        value={password.newPassword}
                        onChange={(event) =>
                          setPassword((current) => ({
                            ...current,
                            newPassword: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Xác nhận mật khẩu mới">
                      <input
                        required
                        minLength={8}
                        type="password"
                        autoComplete="new-password"
                        className={inputClass}
                        value={password.confirmPassword}
                        onChange={(event) =>
                          setPassword((current) => ({
                            ...current,
                            confirmPassword: event.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>
                  <p className="text-xs text-muted">
                    Tối thiểu 8 ký tự, có ít nhất một chữ hoa và một chữ số.
                  </p>
                  <Button type="submit" disabled={saving}>
                    <KeyRound className="h-4 w-4" />
                    Đổi mật khẩu
                  </Button>
                </form>
              </section>

              <section className="rounded-2xl border border-border bg-surface">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="font-extrabold text-fg">Câu hỏi bảo mật</h2>
                  <p className="mt-1 text-xs text-muted">
                    Dùng để khôi phục tài khoản khi quên mật khẩu.
                  </p>
                </div>
                <form className="space-y-4 p-5" onSubmit={saveSecurityQuestion}>
                  {profile.securityQuestion && (
                    <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                      Đã thiết lập:{" "}
                      {getSecurityQuestionLabel(profile.securityQuestion)}
                    </p>
                  )}
                  <Field label="Chọn câu hỏi">
                    <select
                      className={inputClass}
                      value={question}
                      onChange={(event) =>
                        setQuestion(event.target.value as SecurityQuestionId)
                      }
                    >
                      {SECURITY_QUESTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Câu trả lời mới">
                    <input
                      required
                      className={inputClass}
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value)}
                    />
                  </Field>
                  <Button type="submit" disabled={saving}>
                    <ShieldCheck className="h-4 w-4" />
                    Lưu câu hỏi bảo mật
                  </Button>
                </form>
              </section>

              <section className="rounded-2xl border border-border bg-surface">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div>
                    <h2 className="font-extrabold text-fg">Lịch sử đăng nhập</h2>
                    <p className="mt-1 text-xs text-muted">
                      Dữ liệu mẫu để xem trước giao diện mock
                    </p>
                  </div>
                  <Clock3 className="h-5 w-5 text-primary" />
                </div>
                {profile.loginHistory.length === 0 ? (
                  <p className="p-5 text-sm text-muted">
                    Chưa có dữ liệu phiên đăng nhập trong bản xem thử.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {profile.loginHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-wrap justify-between gap-3 px-5 py-4 text-sm"
                      >
                        <div>
                          <p className="font-bold text-fg">
                            {formatDate(entry.loggedAt)}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {entry.deviceInfo} · {entry.ipAddress}
                          </p>
                        </div>
                        <span className="h-fit rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                          {entry.isCurrent ? "Phiên hiện tại" : "Đăng nhập"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {tab === "bank" && (
            <section className="rounded-2xl border border-border bg-surface">
              <div className="border-b border-border px-5 py-4">
                <h2 className="font-extrabold text-fg">
                  Cài đặt thanh toán VietQR
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Thông tin này dùng để nhận thanh toán khi bán hàng.
                </p>
              </div>
              <form className="space-y-4 p-5" onSubmit={saveBank}>
                <Field label="Tên ngân hàng *">
                  <input
                    required
                    className={inputClass}
                    value={bankDraft.bankName}
                    onChange={(event) =>
                      setBankDraft((current) => ({
                        ...current,
                        bankName: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Mã ngân hàng / BIN *">
                  <input
                    required
                    className={inputClass}
                    placeholder="VCB, TCB, MB, BIDV..."
                    value={bankDraft.bankCode}
                    onChange={(event) =>
                      setBankDraft((current) => ({
                        ...current,
                        bankCode: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Số tài khoản *">
                  <input
                    required
                    className={inputClass}
                    value={bankDraft.accountNo}
                    onChange={(event) =>
                      setBankDraft((current) => ({
                        ...current,
                        accountNo: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Tên chủ tài khoản *">
                  <input
                    required
                    className={inputClass}
                    value={bankDraft.accountName}
                    onChange={(event) =>
                      setBankDraft((current) => ({
                        ...current,
                        accountName: event.target.value.toLocaleUpperCase("vi"),
                      }))
                    }
                  />
                </Field>
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4" />
                  Lưu thông tin ngân hàng
                </Button>
              </form>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function Avatar({
  name,
  src,
  size = "normal",
}: {
  name: string;
  src: string | null;
  size?: "normal" | "large";
}) {
  const sizeClass =
    size === "large" ? "h-24 w-24 text-3xl" : "h-14 w-14 text-lg";
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Ảnh đại diện ${name}`}
      className={`${sizeClass} rounded-full border-4 border-white object-cover shadow-md dark:border-slate-800`}
    />
  ) : (
    <span
      className={`${sizeClass} inline-flex items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-sky-600 font-black text-white shadow-md`}
    >
      {name.trim().charAt(0).toLocaleUpperCase("vi") || "U"}
    </span>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`${labelClass} ${className}`}>
      {label}
      {children}
    </label>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function compressAvatar(file: File): Promise<string> {
  const image = new Image();
  const source = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Không đọc được ảnh đã chọn."));
      image.src = source;
    });
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 512 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(source);
  }
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-14 text-center text-muted">
          Đang tải hồ sơ...
        </div>
      }
    >
      <MainShell>
        <ProfileContent />
      </MainShell>
    </Suspense>
  );
}
