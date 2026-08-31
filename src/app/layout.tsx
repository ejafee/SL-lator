import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SL-lator - Sign Language Translator",
  description: "Real-time sign language translation powered by camera and AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
