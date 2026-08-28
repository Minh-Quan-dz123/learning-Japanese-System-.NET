import type { Metadata } from "next";
import { Nunito, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const nunito = Nunito({
  variable: "--font-nunito",
  // "vietnamese" bắt buộc phải có — nếu thiếu, các ký tự có dấu (ư, ơ, ộ...)
  // sẽ tự rớt về font mặc định của trình duyệt, giao diện bị lệch font giữa chữ Latin và chữ có dấu.
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700", "800"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Japanese Learning",
  description: "Hệ thống luyện tập tiếng Nhật",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${nunito.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}