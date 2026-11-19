import { USE_MOCK } from "@/lib/config";
import { apiRequest } from "./client";
import {
  ApiError,
  type AuthUser,
  type ForgotAnswerResult,
  type LockInfo,
  type LoginRequest,
  type LoginResult,
  type MessageResult,
  type OtpSession,
  type RegisterRequest,
  type RegisterResult,
  type ResendOtpResult,
  type ResetPasswordRequest,
  type SecurityQuestionResult,
  type VerifyOtpResult,
} from "./types";

const loadMock = () => import("./mock/auth");

export async function login(input: LoginRequest): Promise<LoginResult> {
  if (USE_MOCK) return (await loadMock()).mockLogin(input);
  return apiRequest<LoginResult>("/auth/login", { method: "POST", body: input });
}

export async function register(input: RegisterRequest): Promise<RegisterResult> {
  if (USE_MOCK) return (await loadMock()).mockRegister(input);
  return apiRequest<RegisterResult>("/auth/register", {
    method: "POST",
    body: input,
  });
}

export async function getOtpSession(): Promise<OtpSession> {
  if (USE_MOCK) return (await loadMock()).mockGetOtpSession();
  return apiRequest<OtpSession>("/auth/otp/session");
}

export async function verifyOtp(otp: string): Promise<VerifyOtpResult> {
  if (USE_MOCK) return (await loadMock()).mockVerifyOtp(otp);
  return apiRequest<VerifyOtpResult>("/auth/otp/verify", {
    method: "POST",
    body: { otp },
  });
}

export async function resendOtp(): Promise<ResendOtpResult> {
  if (USE_MOCK) return (await loadMock()).mockResendOtp();
  return apiRequest<ResendOtpResult>("/auth/otp/resend", { method: "POST" });
}

export async function getSecurityQuestion(
  email: string,
): Promise<SecurityQuestionResult> {
  if (USE_MOCK) return (await loadMock()).mockGetSecurityQuestion(email);
  return apiRequest<SecurityQuestionResult>("/auth/password/forgot/question", {
    method: "POST",
    body: { email },
  });
}

export async function answerSecurityQuestion(input: {
  email: string;
  securityAnswer: string;
}): Promise<ForgotAnswerResult> {
  if (USE_MOCK) return (await loadMock()).mockAnswerSecurityQuestion(input);
  return apiRequest<ForgotAnswerResult>("/auth/password/forgot/answer", {
    method: "POST",
    body: input,
  });
}

export async function resetPassword(
  input: ResetPasswordRequest,
): Promise<MessageResult> {
  if (USE_MOCK) return (await loadMock()).mockResetPassword(input);
  return apiRequest<MessageResult>("/auth/password/reset", {
    method: "POST",
    body: input,
  });
}

export async function getLockInfo(): Promise<LockInfo> {
  if (USE_MOCK) return (await loadMock()).mockGetLockInfo();
  return apiRequest<LockInfo>("/auth/locked-info");
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (USE_MOCK) return (await loadMock()).mockGetCurrentUser();
  try {
    return await apiRequest<AuthUser>("/auth/me");
  } catch (e) {
    if (e instanceof ApiError && e.code === "NOT_AUTHENTICATED") return null;
    throw e;
  }
}

export async function logout(): Promise<void> {
  if (USE_MOCK) return (await loadMock()).mockLogout();
  await apiRequest<MessageResult>("/auth/logout", { method: "POST" });
}

/**
 * Bắt đầu đăng nhập Google: chuyển cả trang sang route OAuth của backend PHP.
 * `/auth/google` cùng origin với Next.js (được rewrite sang PHP trong
 * next.config.ts) để cookie phiên và state chống CSRF dùng chung một host.
 * Chế độ mock không có Google nên vẫn báo chưa hỗ trợ.
 */
export async function startGoogleLogin(): Promise<never> {
  if (USE_MOCK) {
    throw new ApiError(
      "NOT_IMPLEMENTED",
      "Đăng nhập bằng Google cần backend thật (tắt NEXT_PUBLIC_USE_MOCK).",
      { status: 501 },
    );
  }
  // Not a Next.js page: a rewrite to PHP that must be a full document request
  // (cookie + 302 to Google), so router.push() would not work here.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/auth/google");
  // Trang đang rời đi; không bao giờ resolve để nút giữ trạng thái chờ.
  return new Promise<never>(() => {});
}
