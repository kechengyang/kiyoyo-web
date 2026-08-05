import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KIYOYO — Tea, treats & happy things",
  description: "Order KIYOYO drinks in Nairobi and discover collectible lifestyle goods.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
