import { describe, expect, it } from "vitest";
import { googleLoginErrorMessage } from "@/lib/constants/auth";

describe("googleLoginErrorMessage", () => {
  it("returns null when there is no error", () => {
    expect(googleLoginErrorMessage(null)).toBeNull();
    expect(googleLoginErrorMessage(undefined)).toBeNull();
    expect(googleLoginErrorMessage("")).toBeNull();
  });

  it("maps every code sent by the PHP callback", () => {
    for (const code of ["cancelled", "state", "token", "profile"]) {
      const message = googleLoginErrorMessage(code);
      expect(message).toBeTruthy();
      expect(message).not.toBe(googleLoginErrorMessage("unknown"));
    }
    expect(googleLoginErrorMessage("token")).toContain("Google");
  });

  it("falls back to a generic message for unknown codes", () => {
    expect(googleLoginErrorMessage("<script>")).toBe(
      "Đăng nhập Google không thành công. Vui lòng thử lại.",
    );
  });
});
