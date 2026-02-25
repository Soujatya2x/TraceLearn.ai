import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";

import "./globals.css";

/* ================= Fonts ================= */

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

/* ================= Metadata ================= */

export const metadata: Metadata = {
  title: "TraceLearn.ai",
  description:
    "Analyze code errors, understand root causes, and build a personalized AI learning roadmap.",

  manifest: "/manifest.json",

  openGraph: {
    title: "TraceLearn.ai",
    description: "AI-Powered Developer Learning Platform",
    type: "website",
  },
};

/* ================= Viewport ================= */

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  userScalable: false,
};

/* ================= Layout ================= */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-background text-foreground transition-colors duration-200">
        
        {/* Prevent theme flicker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var s = localStorage.getItem('tracelearn-storage');
                  if (s) {
                    var t = JSON.parse(s);
                    if (t?.state?.theme === 'dark') {
                      document.documentElement.classList.add('dark');
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />

        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </QueryProvider>

        <Analytics />
      </body>
    </html>
  );
}