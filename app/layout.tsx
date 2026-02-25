import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TraceLearn.ai',
  description:
    'Analyze your code errors, understand root causes, and build a personalized learning roadmap with AI-powered explanations and guided fixes.',
  keywords: ['AI', 'developer', 'learning', 'code analysis', 'error explanation', 'programming'],
  authors: [{ name: 'TraceLearn.ai' }],
  openGraph: {
    title: 'TraceLearn.ai',
    description: 'AI-Powered Developer Learning Platform',
    type: 'website',
  },
}

export const viewport = {
  themeColor: '#4f46e5',
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        {/*
          Blocking inline script — runs synchronously before first paint.
          Reads the persisted theme from localStorage and applies the `dark`
          class immediately so there is zero flicker on load or navigation.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('tracelearn-storage');if(s){var t=JSON.parse(s);if(t&&t.state&&t.state.theme==='dark'){document.documentElement.classList.add('dark')}}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground transition-colors duration-200">
        <QueryProvider>
          <ThemeProvider>
            {/*
              AuthProvider runs initAuth() on mount.
              No-op when NEXT_PUBLIC_AUTH_ENABLED=false (dev default).
              Flip to true once your backend is ready.
            */}
            <AuthProvider>
              {children}
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
        <Analytics />
      </body>
    </html>
  )
}