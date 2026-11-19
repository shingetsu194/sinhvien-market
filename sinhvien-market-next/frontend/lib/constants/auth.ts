export const SECURITY_QUESTIONS = [
  { value: "q1", label: "Tên trường cấp 1 của bạn là gì?" },
  { value: "q2", label: "Tên thú cưng đầu tiên của bạn?" },
  { value: "q3", label: "Bạn thân thời thơ ấu của bạn tên gì?" },
] as const;

export type SecurityQuestionId = (typeof SECURITY_QUESTIONS)[number]["value"];

export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_LOCK_MINUTES = 15;
export const OTP_LENGTH = 6;
export const OTP_MAX_FAILS = 5;
export const OTP_RESEND_MAX = 3;
export const OTP_RESEND_WINDOW_MINUTES = 10;
export const REGISTER_MAX = 3;
export const REGISTER_WINDOW_MINUTES = 10;
export const OTP_EXPIRE_MINUTES = 15;
export const RESET_TOKEN_EXPIRE_MINUTES = 15;

export const RECENT_ACCOUNTS_KEY = "svmarket_recent_accounts";

/** `?oauth_error=` codes set by the PHP Google OAuth callback. */
const GOOGLE_LOGIN_ERRORS: Record<string, string> = {
  cancelled: "Bạn đã hủy đăng nhập Google hoặc Google từ chối yêu cầu.",
  state: "Phiên đăng nhập Google đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.",
  token: "Máy chủ không xác thực được với Google. Vui lòng thử lại sau hoặc báo quản trị viên.",
  profile: "Không lấy được thông tin tài khoản từ Google. Vui lòng thử lại.",
};

/** Vietnamese message for a Google login failure code; null when there is none. */
export function googleLoginErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return GOOGLE_LOGIN_ERRORS[code] ?? "Đăng nhập Google không thành công. Vui lòng thử lại.";
}
