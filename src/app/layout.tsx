import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/smuggler/components/ThemeProvider";

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
    "AI-powered tools to ideate, create, optimize, and grow your content. 95+ tools for writers, creators, and marketers. Everything you need. One top-secret location.",
  keywords: [
    "Content Smuggler",
    "AI tools",
    "content creator",
    "writer tools",
    "SEO",
    "YouTube",
    "social media",
    "hook generator",
    "AI writer",
  ],
  authors: [{ name: "Content Smuggler" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Content Smuggler — The All-in-One Creator Toolkit",
    description:
      "Create Legendary Content. Smuggle It To Success. 95+ AI-powered tools for creators.",
    siteName: "Content Smuggler",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Content Smuggler — The All-in-One Creator Toolkit",
    description:
      "Create Legendary Content. Smuggle It To Success. 95+ AI-powered tools for creators.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Content Smuggler",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "AI-powered creator toolkit with 95+ tools for ideation, content creation, optimization, and growth.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "2000",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
