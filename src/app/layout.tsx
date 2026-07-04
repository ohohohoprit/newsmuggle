import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Content Smuggler — The All-in-One Creator Toolkit",
  description:
    "AI-powered tools to ideate, create, optimize, and grow your content. 60+ tools for writers, creators, and marketers. Everything you need. One top-secret location.",
  keywords: [
    "Content Smuggler",
    "AI tools",
    "content creator",
    "writer tools",
    "SEO",
    "YouTube",
    "social media",
  ],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Content Smuggler — The All-in-One Creator Toolkit",
    description:
      "Create Legendary Content. Smuggle It To Success. 60+ AI-powered tools.",
    siteName: "Content Smuggler",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
