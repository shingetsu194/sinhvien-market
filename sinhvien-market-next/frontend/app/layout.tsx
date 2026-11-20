import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SinhVienMarket",
  description:
    "Nền tảng mua bán, trao đổi và đấu giá đồ dùng dành riêng cho sinh viên.",
};

/**
 * Chạy đồng bộ trước lần paint đầu tiên để gắn class "dark" đúng theo lựa chọn
 * đã lưu (hoặc theo hệ điều hành), tránh nháy sáng/tối. Chỉ lưu "light" | "dark".
 */
const themeInitScript = `
(function () {
  try {
    var saved = localStorage.getItem('svmarket_theme');
    var dark = saved === 'dark';
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${plusJakarta.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
