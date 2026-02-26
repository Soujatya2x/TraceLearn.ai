import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";

import "./globals.css";

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

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  userScalable: false,
};

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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var s = localStorage.getItem('tracelearn-storage');
                  var theme = 'dark';
                  if (s) {
                    var parsed = JSON.parse(s);
                    if (parsed?.state?.theme) theme = parsed.state.theme;
                  }
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
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