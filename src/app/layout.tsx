import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/lib/session-context";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import { headers } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ballbot-tv",
  description: "브라우저에서 바로 실시간 스트리밍",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let sessionUser = null;
  try {
    const env = await getEnv();
    const db = getDb(env.DB);
    const headersList = await headers();
    const session = await getSession(db, env.JWT_SECRET, headersList.get("cookie"));
    if (session) {
      sessionUser = {
        id: session.user.id,
        username: session.user.username,
        channelName: session.user.channelName,
        profileImageKey: session.user.profileImageKey,
      };
    }
  } catch {
    // No session available
  }

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <ThemeProvider defaultTheme="system">
          <SessionProvider initialUser={sessionUser}>
            <div className="flex flex-col h-dvh">
              <Navbar />
              <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto">{children}</main>
              </div>
            </div>
            <Toaster />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
