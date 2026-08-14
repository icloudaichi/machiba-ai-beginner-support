import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    title: "はじめてでもわかる 街場のAI屋さん｜はじめてのアプリづくり",
    description:
      "Googleアカウントの準備から、Codex・GitHub・Cloudflareを使ったアプリづくりまでを、超初心者向けに案内する標準ガイドです。",
    openGraph: {
      title: "はじめてでもわかる 街場のAI屋さん",
      description: "AIと話して、あなたが思うアプリをつくろう。",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1536, height: 1024, alt: "街場のAI屋さん 初心者向け標準ガイド" }],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
