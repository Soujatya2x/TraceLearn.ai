'use client'

import Link from 'next/link'
import { Zap, Github, Twitter, ExternalLink } from 'lucide-react'

const FOOTER_LINKS = {
  Product: [
    { label: 'Code Workspace', href: '/' },
    { label: 'Error Explanation', href: '/explanation' },
    { label: 'Fix Validation', href: '/validation' },
    { label: 'AI Chat', href: '/chat' },
    { label: 'Artifacts', href: '/artifacts' },
    { label: 'Learning Roadmap', href: '/roadmap' },
  ],
  Resources: [
    { label: 'Documentation', href: '#', external: true },
    { label: 'API Reference', href: '#', external: true },
    { label: 'Changelog', href: '#', external: true },
    { label: 'Status', href: '#', external: true },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Cookie Policy', href: '#' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30" aria-label="Site footer">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-10">

        {/* Top row */}
        <div className="flex flex-col md:flex-row gap-10 md:gap-16">

          {/* Brand column */}
          <div className="flex-shrink-0 max-w-[220px]">
            <Link href="/" className="inline-flex items-center gap-2 mb-3 group" aria-label="TraceLearn.ai home">
              <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center shadow-sm">
                <Zap className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm text-foreground tracking-tight">
                TraceLearn<span className="text-primary">.ai</span>
              </span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AI-powered developer learning platform. Understand your code errors and build a personalized learning roadmap.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-2 mt-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border"
              >
                <Github className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
                className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border"
              >
                <Twitter className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {Object.entries(FOOTER_LINKS).map(([section, links]) => (
              <div key={section}>
                <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider mb-3">
                  {section}
                </p>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.label}>
                      {'external' in link && link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                        >
                          {link.label}
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Divider + bottom row */}
        <div className="mt-10 pt-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            &copy; {new Date().getFullYear()} TraceLearn.ai. All rights reserved.
          </p>
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-success-foreground animate-pulse inline-block" aria-hidden="true" />
              All systems operational
            </span>
          </div>
        </div>

      </div>
    </footer>
  )
}
