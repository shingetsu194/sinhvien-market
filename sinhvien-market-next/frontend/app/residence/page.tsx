"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Clock,
  FileCheck2,
  Send,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
import {
  DateFieldVi,
  KtxPageHeader,
  formatIsoDateVi,
} from "@/components/residence/KtxPageHeader";
import {
  getResidenceApplications,
  getResidenceContracts,
  getStudentDormProfile,
  submitResidenceApplication,
  updateStudentDormProfile,
  type ResidenceApplication,
  type ResidenceContract,
  type StudentDormProfile,
} from "@/lib/api/residence";
import { ApiError } from "@/lib/api/types";
import { cn } from "@/lib/cn";

type EditableStudentProfile = Omit<StudentDormProfile, "userId" | "email">;

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-medium text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const APPLICATION_STATUS_META: Record<
  ResidenceApplication["status"],
  { label: string; cls: string }
> = {
  submitted: {
    label: "Chờ xét duyệt",
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  },
  under_review: {
    label: "Đang thẩm định",
    cls: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  },
  approved: {
    label: "Đã duyệt",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  },
  rejected: {
    label: "Từ chối",
    cls: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  },
  withdrawn: {
    label: "Đã rút đơn",
    cls: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  },
};

const CONTRACT_STATUS_META: Record<
  ResidenceContract["status"],
  { label: string; cls: string }
> = {
  pending_assignment: {
    label: "Chờ xếp phòng / giường",
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  },
  active: {
    label: "Đang hiệu lực lưu trú",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  },
  expired: {
    label: "Đã hết hạn",
    cls: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  },
  terminated: {
    label: "Đã chấm dứt",
    cls: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  },
};

const ROOM_TYPE_LABELS: Record<ResidenceApplication["preferredRoomType"], string> = {
  any: "Không yêu cầu (Tùy Ban quản lý xếp)",
  standard: "Phòng tiêu chuẩn 4 sinh viên",
  private: "Phòng dịch vụ chất lượng cao",
  accessible: "Phòng tầng thấp hỗ trợ tiếp cận",
};

function ResidenceContent() {
  const { user, loadingUser } = useMainShell();
  const [profile, setProfile] = useState<StudentDormProfile | null>(null);
  const [applications, setApplications] = useState<ResidenceApplication[]>([]);
  const [contracts, setContracts] = useState<ResidenceContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [savingProfile, setSavingProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [period, setPeriod] = useState({
    startDate: "",
    endDate: "",
    preferredRoomType: "any" as ResidenceApplication["preferredRoomType"],
    note: "",
  });

  useEffect(() => {
    if (loadingUser || !user) return;
    const activeUser = user;
    let active = true;
    async function loadResidenceData() {
      try {
        const [nextProfile, nextApplications, nextContracts] =
          await Promise.all([
            getStudentDormProfile(activeUser),
            getResidenceApplications(activeUser),
            getResidenceContracts(activeUser),
          ]);
        if (!active) return;
        setProfile(nextProfile);
        setApplications(nextApplications);
        setContracts(nextContracts);
      } catch (cause) {
        if (!active) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Không tải được dữ liệu lưu trú.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadResidenceData();
    return () => {
      active = false;
    };
  }, [loadingUser, reloadKey, user]);

  function updateProfile<K extends keyof EditableStudentProfile>(
    key: K,
    value: EditableStudentProfile[K],
  ) {
    setProfile((current) =>
      current ? { ...current, [key]: value } : current,
    );
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !profile) return;
    setSavingProfile(true);
    setError("");
    setNotice("");
    try {
      const saved = await updateStudentDormProfile(user, {
        name: profile.name.trim(),
        phone: profile.phone.trim(),
        studentNumber: profile.studentNumber.trim(),
        university: profile.university.trim(),
        faculty: profile.faculty.trim(),
        program: profile.program.trim(),
        academicYear: profile.academicYear.trim(),
        dateOfBirth: profile.dateOfBirth,
        emergencyContactName: profile.emergencyContactName.trim(),
        emergencyContactPhone: profile.emergencyContactPhone.trim(),
      });
      setProfile(saved);
      setNotice("Đã cập nhật hồ sơ sinh viên thành công.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không lưu được hồ sơ.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await submitResidenceApplication(period, user);
      setPeriod({
        startDate: "",
        endDate: "",
        preferredRoomType: "any",
        note: "",
      });
      setNotice("Đã gửi hồ sơ đăng ký lưu trú đến Ban quản lý KTX.");
      setReloadKey((current) => current + 1);
    } catch (cause) {
      setError(
        cause instanceof ApiError || cause instanceof Error
          ? cause.message
          : "Không gửi được hồ sơ lưu trú.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const profileReady = Boolean(
    profile?.studentNumber?.trim() && profile?.university?.trim(),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <KtxPageHeader
        title="Hồ sơ & Hợp đồng Lưu trú KTX"
        description="Cập nhật thông tin sinh viên nội trú, gửi đơn đăng ký phòng ở theo học kỳ và theo dõi tiến độ xét duyệt hợp đồng trực tuyến."
      />

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-600 dark:text-rose-300"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600 dark:text-emerald-300"
        >
          {notice}
        </div>
      )}

      {loadingUser || (user && loading) ? (
        <div className="rounded-3xl border border-border bg-surface p-8 text-sm text-muted">
          Đang tải hồ sơ lưu trú…
        </div>
      ) : !user ? (
        <div className="rounded-3xl border border-border bg-surface p-8 text-center">
          <p className="text-lg font-extrabold text-fg">
            Đăng nhập để tiếp tục
          </p>
          <p className="mt-1.5 text-sm text-muted">
            Hồ sơ lưu trú chỉ dành cho tài khoản sinh viên KTX.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white"
          >
            Đăng nhập ngay
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted">
                    Hồ sơ sinh viên
                  </p>
                  <p className="text-sm font-extrabold text-fg">
                    {profileReady
                      ? `MSSV: ${profile?.studentNumber}`
                      : "Chưa đủ MSSV / Trường"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted">
                    Hồ sơ đăng ký đã gửi
                  </p>
                  <p className="text-sm font-extrabold text-fg">
                    {applications.length} đơn đăng ký
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted">
                    Hợp đồng nội trú
                  </p>
                  <p className="text-sm font-extrabold text-fg">
                    {contracts.length > 0
                      ? `${contracts.length} hợp đồng`
                      : "Chờ duyệt hồ sơ"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <section className="rounded-3xl border border-border bg-surface p-5 shadow-xs sm:p-7">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-extrabold text-fg">
                    Thông tin sinh viên
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    Mã số sinh viên và trường học cần được điền đầy đủ trước khi gửi đơn đăng ký lưu trú.
                  </p>
                </div>
                {profileReady && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Đủ điều kiện nộp đơn
                  </span>
                )}
              </div>

              <form
                onSubmit={saveProfile}
                className="mt-5 grid gap-4 sm:grid-cols-2"
              >
                <label className="text-xs font-bold text-muted">
                  Họ và tên
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    className={fieldClass}
                    value={profile?.name ?? ""}
                    onChange={(e) => updateProfile("name", e.target.value)}
                  />
                </label>
                <label className="text-xs font-bold text-muted">
                  Số điện thoại
                  <input
                    className={fieldClass}
                    value={profile?.phone ?? ""}
                    onChange={(e) => updateProfile("phone", e.target.value)}
                  />
                </label>
                <label className="text-xs font-bold text-muted">
                  Mã số sinh viên
                  <input
                    maxLength={30}
                    className={fieldClass}
                    value={profile?.studentNumber ?? ""}
                    onChange={(e) =>
                      updateProfile("studentNumber", e.target.value)
                    }
                  />
                </label>
                <label className="text-xs font-bold text-muted">
                  Trường / đại học
                  <input
                    maxLength={200}
                    className={fieldClass}
                    value={profile?.university ?? ""}
                    onChange={(e) =>
                      updateProfile("university", e.target.value)
                    }
                  />
                </label>
                <label className="text-xs font-bold text-muted">
                  Khoa
                  <input
                    maxLength={150}
                    placeholder="VD: Công nghệ Thông tin"
                    className={fieldClass}
                    value={profile?.faculty ?? ""}
                    onChange={(e) => updateProfile("faculty", e.target.value)}
                  />
                </label>
                <label className="text-xs font-bold text-muted">
                  Ngành / chương trình
                  <input
                    maxLength={150}
                    placeholder="VD: Kỹ thuật Phần mềm"
                    className={fieldClass}
                    value={profile?.program ?? ""}
                    onChange={(e) => updateProfile("program", e.target.value)}
                  />
                </label>
                <label className="text-xs font-bold text-muted">
                  Năm học / Khóa
                  <input
                    maxLength={20}
                    className={fieldClass}
                    placeholder="Ví dụ: 2026–2027"
                    value={profile?.academicYear ?? ""}
                    onChange={(e) =>
                      updateProfile("academicYear", e.target.value)
                    }
                  />
                </label>
                <DateFieldVi
                  label="Ngày sinh"
                  value={profile?.dateOfBirth ?? ""}
                  onChange={(val) => updateProfile("dateOfBirth", val || null)}
                />
                <label className="text-xs font-bold text-muted">
                  Người liên hệ khẩn cấp
                  <input
                    maxLength={100}
                    placeholder="Họ tên phụ huynh / người giám hộ"
                    className={fieldClass}
                    value={profile?.emergencyContactName ?? ""}
                    onChange={(e) =>
                      updateProfile("emergencyContactName", e.target.value)
                    }
                  />
                </label>
                <label className="text-xs font-bold text-muted">
                  Điện thoại liên hệ khẩn cấp
                  <input
                    placeholder="SĐT liên hệ khi cần thiết"
                    className={fieldClass}
                    value={profile?.emergencyContactPhone ?? ""}
                    onChange={(e) =>
                      updateProfile("emergencyContactPhone", e.target.value)
                    }
                  />
                </label>
                <div className="pt-1 sm:col-span-2">
                  <button
                    disabled={savingProfile}
                    className="cursor-pointer rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-white shadow-xs transition hover:bg-primary-dark disabled:opacity-60"
                  >
                    {savingProfile ? "Đang lưu…" : "Lưu hồ sơ sinh viên"}
                  </button>
                </div>
              </form>
            </section>

            <div className="space-y-6">
              <section className="rounded-3xl border border-border bg-surface p-5 shadow-xs sm:p-7">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-fg">
                      Đăng ký lưu trú
                    </h2>
                    <p className="text-xs text-muted">
                      Chọn thời gian lưu trú mong muốn. Khi Ban quản lý duyệt đơn, hợp đồng nội trú sẽ được khởi tạo tự động.
                    </p>
                  </div>
                </div>

                <form onSubmit={submitApplication} className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DateFieldVi
                      label="Ngày bắt đầu"
                      required
                      value={period.startDate}
                      onChange={(val) =>
                        setPeriod({ ...period, startDate: val })
                      }
                    />
                    <DateFieldVi
                      label="Ngày kết thúc"
                      required
                      value={period.endDate}
                      onChange={(val) => setPeriod({ ...period, endDate: val })}
                    />
                  </div>
                  <label className="block text-xs font-bold text-muted">
                    Loại phòng mong muốn
                    <select
                      aria-label="Loại phòng mong muốn"
                      className={fieldClass}
                      value={period.preferredRoomType}
                      onChange={(e) =>
                        setPeriod({
                          ...period,
                          preferredRoomType: e.target
                            .value as typeof period.preferredRoomType,
                        })
                      }
                    >
                      <option value="any">Không yêu cầu</option>
                      <option value="standard">Tiêu chuẩn</option>
                      <option value="private">Phòng riêng</option>
                      <option value="accessible">Phòng hỗ trợ tiếp cận</option>
                    </select>
                  </label>
                  <label className="block text-xs font-bold text-muted">
                    Ghi chú nguyện vọng (tòa nhà, bạn cùng phòng...)
                    <textarea
                      maxLength={1000}
                      rows={3}
                      placeholder="VD: Nguyện vọng ở Tòa B2 cùng nhóm học tập khoa CNTT..."
                      className={fieldClass}
                      value={period.note}
                      onChange={(e) =>
                        setPeriod({ ...period, note: e.target.value })
                      }
                    />
                  </label>
                  <button
                    disabled={submitting || !profileReady}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-white shadow-xs transition hover:bg-primary-dark disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? "Đang gửi…" : "Gửi hồ sơ đăng ký"}
                  </button>
                </form>
              </section>

              <section className="rounded-3xl border border-border bg-surface p-5 shadow-xs sm:p-7">
                <h2 className="text-lg font-extrabold text-fg">
                  Hồ sơ đã gửi ({applications.length})
                </h2>
                {applications.length === 0 ? (
                  <p className="mt-3 rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted">
                    Chưa có hồ sơ đăng ký lưu trú nào.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {applications.map((application) => {
                      const meta = APPLICATION_STATUS_META[
                        application.status
                      ] ?? {
                        label: application.status,
                        cls: "bg-surface-2 text-muted",
                      };
                      return (
                        <li
                          key={application.id}
                          className="rounded-2xl border border-border bg-bg p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <strong className="text-sm font-extrabold text-fg">
                              {application.applicationNumber}
                            </strong>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "rounded-full px-2.5 py-0.5 text-xs font-bold",
                                  meta.cls,
                                )}
                              >
                                {meta.label}
                              </span>
                            </div>
                          </div>
                          <p className="mt-2 text-xs font-semibold text-fg">
                            Thời hạn đăng ký:{" "}
                            <span className="text-primary">
                              {formatIsoDateVi(application.startDate)} –{" "}
                              {formatIsoDateVi(application.endDate)}
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            Loại phòng:{" "}
                            {ROOM_TYPE_LABELS[application.preferredRoomType]}
                          </p>
                          {application.decisionNote && (
                            <p className="mt-2 rounded-xl bg-surface p-2.5 text-xs text-muted">
                              💬 Phản hồi Ban quản lý:{" "}
                              {application.decisionNote}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="rounded-3xl border border-border bg-surface p-5 shadow-xs sm:p-7">
                <h2 className="text-lg font-extrabold text-fg">
                  Hợp đồng lưu trú ({contracts.length})
                </h2>
                {contracts.length === 0 ? (
                  <p className="mt-3 rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted">
                    Hợp đồng nội trú sẽ hiển thị tại đây ngay sau khi hồ sơ được duyệt.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {contracts.map((contract) => {
                      const meta = CONTRACT_STATUS_META[contract.status] ?? {
                        label: contract.status,
                        cls: "bg-surface-2 text-muted",
                      };
                      return (
                        <li
                          key={contract.id}
                          className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-fg">
                              <ShieldCheck className="h-4 w-4 text-blue-500" />
                              {contract.contractNumber}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-xs font-bold",
                                meta.cls,
                              )}
                            >
                              {meta.label}
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-semibold text-muted">
                            Hiệu lực hợp đồng:{" "}
                            <span className="text-fg">
                              {formatIsoDateVi(contract.startDate)} –{" "}
                              {formatIsoDateVi(contract.endDate)}
                            </span>
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ResidencePage() {
  return (
    <MainShell>
      <ResidenceContent />
    </MainShell>
  );
}
