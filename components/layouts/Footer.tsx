'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Zap, Github, Twitter, ExternalLink } from 'lucide-react'

const FOOTER_LINKS = {
  Product: [
    { label: 'Code Workspace',   href: '/'            },
    { label: 'Error Explanation',href: '/explanation' },
    { label: 'Fix Validation',   href: '/validation'  },
    { label: 'AI Chat',          href: '/chat'        },
    { label: 'Artifacts',        href: '/artifacts'   },
    { label: 'Learning Roadmap', href: '/roadmap'     },
  ],
  Resources: [
    { label: 'Documentation', href: '#', external: true },
    { label: 'API Reference',  href: '#', external: true },
    { label: 'Changelog',      href: '#', external: true },
    { label: 'Status',         href: '#', external: true },
  ],
  Company: [
    { label: 'About',   href: '#' },
    { label: 'Blog',    href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
  ],
  Legal: [
    { label: 'Privacy Policy',  href: '#' },
    { label: 'Terms of Service',href: '#' },
    { label: 'Cookie Policy',   href: '#' },
  ],
}

export function Footer() {
  return (
    
    <footer className="mt-24 border-t border-border bg-muted/20" aria-label="Site footer">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8">

        {/* Top row */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-16">

          <div className="flex-shrink-0 max-w-[200px]">
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-2.5 group"
              aria-label="TraceLearn.ai home"
            >
              <motion.div
                className="w-6 h-6 bg-primary rounded-md flex items-center justify-center shadow-sm"
                whileHover={{ rotate: -8, scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
              >
                <Zap className="w-3 h-3 text-primary-foreground" />
              </motion.div>
              <span className="font-semibold text-sm text-foreground tracking-tight">
                TraceLearn<span className="text-primary">.ai</span>
              </span>
            </Link>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              AI-powered developer learning. Understand errors, get guided fixes, build lasting knowledge.
            </p>

            <div className="flex items-center gap-1.5 mt-3.5">
              {[
                { href: 'https://github.com',  label: 'GitHub',     Icon: Github  },
                { href: 'https://twitter.com', label: 'Twitter / X', Icon: Twitter },
              ].map(({ href, label, Icon }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  whileHover={{ scale: 1.1, y: -1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border"
                >
                  <Icon className="w-3 h-3" />
                </motion.a>
              ))}
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {Object.entries(FOOTER_LINKS).map(([section, links]) => (
              <div key={section}>
                <p className="text-[10px] font-semibold text-foreground uppercase tracking-widest mb-2.5">
                  {section}
                </p>
                <ul className="space-y-1.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      {'external' in link && link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 group"
                        >
                          {link.label}
                          <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
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

        <div className="mt-7 pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground">
            &copy; {new Date().getFullYear()} TraceLearn.ai · All rights reserved.
          </p>

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            All systems operational
          </div>
        </div>

      </div>
    </footer>
  )
}