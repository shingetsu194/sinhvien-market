"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { MainShell, useMainShell } from "@/components/layout/MainShell";
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

type EditableStudentProfile = Omit<StudentDormProfile, "userId" | "email">;

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-fg outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";

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
        const [nextProfile, nextApplications, nextContracts] = await Promise.all([
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
          cause instanceof Error ? cause.message : "Không tải được dữ liệu lưu trú.",
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
      setNotice("Đã cập nhật hồ sơ sinh viên.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được hồ sơ.");
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
      setPeriod({ startDate: "", endDate: "", preferredRoomType: "any", note: "" });
      setNotice("Đã gửi hồ sơ đăng ký lưu trú.");
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Dịch vụ ký túc xá
          </p>
          <h1 className="mt-2 text-3xl font-black text-fg">Hồ sơ lưu trú</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Hoàn thiện thông tin sinh viên, gửi đăng ký lưu trú và theo dõi xét
            duyệt, hợp đồng trên cùng một trang.
          </p>
        </div>
        {(user?.role === "admin" || user?.roles?.includes("dorm_manager")) && (
          <Link
            href="/admin/residence"
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-fg hover:border-primary"
          >
            Quản lý hồ sơ
          </Link>
        )}
        {user && (
          <div className="flex flex-wrap gap-2">
            <Link href="/residence/announcements" className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-fg hover:border-primary">
              Thông báo & nội quy
            </Link>
            <Link href="/residence/finance" className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-fg hover:border-primary">
              Hóa đơn
            </Link>
            {(user.role === "admin" || user.roles?.includes("dorm_manager")) && (
              <Link href="/admin/residence/finance" className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-fg hover:border-primary">
                Quản lý tài chính
              </Link>
            )}
            <Link href="/residence/services" className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-fg hover:border-primary">
              Yêu cầu dịch vụ
            </Link>
            {(user.role === "admin" || user.roles?.includes("tenant")) && (
              <Link href="/rentals" className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-fg hover:border-primary">
                Mặt bằng cho thuê
              </Link>
            )}
          </div>
        )}
      </header>

      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="mb-5 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {loadingUser || (user && loading) ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-sm text-muted">
          Đang tải hồ sơ lưu trú…
        </div>
      ) : !user ? (
        <div className="rounded-2xl border border-border bg-surface p-8">
          <p className="font-bold text-fg">Đăng nhập để tiếp tục</p>
          <p className="mt-2 text-sm text-muted">
            Hồ sơ lưu trú chỉ dành cho tài khoản sinh viên.
          </p>
          <Link href="/login" className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">
            Đăng nhập
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
            <h2 className="text-xl font-extrabold text-fg">Thông tin sinh viên</h2>
            <p className="mt-1 text-sm text-muted">
              Mã số sinh viên và trường học cần có trước khi gửi đăng ký.
            </p>
            <form onSubmit={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-fg">
                Họ và tên
                <input required minLength={2} maxLength={100} className={fieldClass} value={profile?.name ?? ""} onChange={(e) => updateProfile("name", e.target.value)} />
              </label>
              <label className="text-sm font-semibold text-fg">
                Số điện thoại
                <input className={fieldClass} value={profile?.phone ?? ""} onChange={(e) => updateProfile("phone", e.target.value)} />
              </label>
              <label className="text-sm font-semibold text-fg">
                Mã số sinh viên
                <input maxLength={30} className={fieldClass} value={profile?.studentNumber ?? ""} onChange={(e) => updateProfile("studentNumber", e.target.value)} />
              </label>
              <label className="text-sm font-semibold text-fg">
                Trường / đại học
                <input maxLength={200} className={fieldClass} value={profile?.university ?? ""} onChange={(e) => updateProfile("university", e.target.value)} />
              </label>
              <label className="text-sm font-semibold text-fg">
                Khoa
                <input maxLength={150} className={fieldClass} value={profile?.faculty ?? ""} onChange={(e) => updateProfile("faculty", e.target.value)} />
              </label>
              <label className="text-sm font-semibold text-fg">
                Ngành / chương trình
                <input maxLength={150} className={fieldClass} value={profile?.program ?? ""} onChange={(e) => updateProfile("program", e.target.value)} />
              </label>
              <label className="text-sm font-semibold text-fg">
                Năm học
                <input maxLength={20} className={fieldClass} placeholder="Ví dụ: 2026–2027" value={profile?.academicYear ?? ""} onChange={(e) => updateProfile("academicYear", e.target.value)} />
              </label>
              <label className="text-sm font-semibold text-fg">
                Ngày sinh
                <input type="date" className={fieldClass} value={profile?.dateOfBirth ?? ""} onChange={(e) => updateProfile("dateOfBirth", e.target.value || null)} />
              </label>
              <label className="text-sm font-semibold text-fg">
                Người liên hệ khẩn cấp
                <input maxLength={100} className={fieldClass} value={profile?.emergencyContactName ?? ""} onChange={(e) => updateProfile("emergencyContactName", e.target.value)} />
              </label>
              <label className="text-sm font-semibold text-fg">
                Điện thoại liên hệ khẩn cấp
                <input className={fieldClass} value={profile?.emergencyContactPhone ?? ""} onChange={(e) => updateProfile("emergencyContactPhone", e.target.value)} />
              </label>
              <div className="sm:col-span-2">
                <button disabled={savingProfile} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                  {savingProfile ? "Đang lưu…" : "Lưu hồ sơ sinh viên"}
                </button>
              </div>
            </form>
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
              <h2 className="text-xl font-extrabold text-fg">Đăng ký lưu trú</h2>
              <p className="mt-1 text-sm text-muted">
                Hồ sơ được gửi đến ban quản lý. Duyệt hồ sơ sẽ tạo hợp đồng chờ
                phân phòng.
              </p>
              <form onSubmit={submitApplication} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-fg">
                    Ngày bắt đầu
                    <input required type="date" className={fieldClass} value={period.startDate} onChange={(e) => setPeriod({ ...period, startDate: e.target.value })} />
                  </label>
                  <label className="text-sm font-semibold text-fg">
                    Ngày kết thúc
                    <input required type="date" className={fieldClass} value={period.endDate} onChange={(e) => setPeriod({ ...period, endDate: e.target.value })} />
                  </label>
                </div>
                <label className="block text-sm font-semibold text-fg">
                  Loại phòng mong muốn
                  <select className={fieldClass} value={period.preferredRoomType} onChange={(e) => setPeriod({ ...period, preferredRoomType: e.target.value as typeof period.preferredRoomType })}>
                    <option value="any">Không yêu cầu</option>
                    <option value="standard">Tiêu chuẩn</option>
                    <option value="private">Phòng riêng</option>
                    <option value="accessible">Phòng hỗ trợ tiếp cận</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold text-fg">
                  Ghi chú
                  <textarea maxLength={1000} rows={3} className={fieldClass} value={period.note} onChange={(e) => setPeriod({ ...period, note: e.target.value })} />
                </label>
                <button disabled={submitting || !profile?.studentNumber || !profile?.university} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
                  {submitting ? "Đang gửi…" : "Gửi hồ sơ đăng ký"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
              <h2 className="text-xl font-extrabold text-fg">Hồ sơ đã gửi</h2>
              {applications.length === 0 ? (
                <p className="mt-4 text-sm text-muted">Chưa có hồ sơ lưu trú.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {applications.map((application) => (
                    <li key={application.id} className="rounded-xl border border-border p-4">
                      <div className="flex flex-wrap justify-between gap-2">
                        <strong className="text-sm text-fg">{application.applicationNumber}</strong>
                        <span className="text-xs font-bold uppercase text-primary">{application.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-muted">{application.startDate} – {application.endDate}</p>
                      {application.decisionNote && <p className="mt-2 text-sm text-muted">Ghi chú xét duyệt: {application.decisionNote}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
              <h2 className="text-xl font-extrabold text-fg">Hợp đồng lưu trú</h2>
              {contracts.length === 0 ? (
                <p className="mt-4 text-sm text-muted">Hợp đồng sẽ xuất hiện sau khi hồ sơ được duyệt.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {contracts.map((contract) => (
                    <li key={contract.id} className="rounded-xl border border-border p-4">
                      <strong className="text-sm text-fg">{contract.contractNumber}</strong>
                      <p className="mt-2 text-sm text-muted">{contract.startDate} – {contract.endDate}</p>
                      <p className="mt-1 text-xs font-bold uppercase text-primary">{contract.status.replaceAll("_", " ")}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
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
