'use client';

import React, { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  Star,
  Crosshair,
  Twitter,
  Instagram,
  Youtube,
  Github,
  ArrowRight,
  Mail,
} from 'lucide-react';

export interface FooterProps {
  onNavigate?: (view: 'home' | 'tools') => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
}

interface NavLink {
  label: string;
  onClick?: () => void;
  href?: string;
}

const INTELLIGENCE_LINKS: NavLink[] = [
  { label: 'All Tools', onClick: undefined, href: '#tools' },
  { label: 'Content Calendar', href: '#' },
  { label: 'Secret Library', href: '#' },
];

const AGENCY_LINKS: NavLink[] = [
  { label: 'About Us', href: '#' },
  { label: 'Pricing & Plans', href: '#' },
  { label: 'Support Desk', href: '#' },
];

const LEGAL_LINKS: NavLink[] = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Cookie Policy', href: '#' },
];

function FooterLink({ link }: { link: NavLink }) {
  const baseClass =
    'text-[0.9rem] text-[var(--smuggler-text-secondary)] hover:text-[var(--smuggler-gold)] transition-colors text-left';

  if (link.onClick) {
    return (
      <button type="button" onClick={link.onClick} className={baseClass}>
        {link.label}
      </button>
    );
  }
  return (
    <a href={link.href ?? '#'} className={baseClass}>
      {link.label}
    </a>
  );
}

function LinkColumn({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <div className="flex flex-col">
      <h4 className="text-[0.85rem] font-bold tracking-[1px] text-[var(--smuggler-text)] uppercase mb-4">
        {title}
      </h4>
      <div className="flex flex-col gap-2.5">
        {links.map((link) => (
          <FooterLink key={link.label} link={link} />
        ))}
      </div>
    </div>
  );
}

const SOCIALS = [
  { label: 'Twitter', Icon: Twitter },
  { label: 'Instagram', Icon: Instagram },
  { label: 'YouTube', Icon: Youtube },
  { label: 'GitHub', Icon: Github },
];

export default function Footer({ onNavigate, onOpenAuth }: FooterProps) {
  const [email, setEmail] = useState('');

  // Build the Intelligence links with the All Tools → onNavigate binding.
  const intelligenceLinks: NavLink[] = INTELLIGENCE_LINKS.map((link) =>
    link.label === 'All Tools' && onNavigate
      ? { ...link, onClick: () => onNavigate('tools') }
      : link,
  );

  const handleSubscribe = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // No-op for now: clear the input as a subtle confirmation.
    setEmail('');
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[var(--smuggler-border)]/50 bg-[var(--smuggler-bg-panel)]/60 backdrop-blur-sm">
      <div className="mx-auto max-w-[1400px] pt-16 pb-10 px-4 sm:px-8 lg:px-16">
        {/* Top section */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-12">
          {/* Brand column */}
          <div className="max-w-[340px]">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-12 h-12 rounded-full border-2 border-[var(--smuggler-gold)] flex items-center justify-center"
                aria-hidden="true"
              >
                <Crosshair className="text-[var(--smuggler-gold)]" size={22} />
              </div>
              <div className="flex flex-col leading-[1.1]">
                <span className="font-[family-name:var(--font-heading)] font-black text-xl text-[var(--smuggler-text)] flex items-center gap-2">
                  <Star className="fill-current text-[var(--smuggler-gold)] text-xs" />
                  CONTENT
                  <Star className="fill-current text-[var(--smuggler-gold)] text-xs" />
                </span>
                <span className="font-[family-name:var(--font-heading)] font-black text-2xl text-[var(--smuggler-text)] tracking-wide">
                  SMUGGLER
                </span>
                <span className="font-[family-name:var(--font-body)] text-[0.65rem] font-semibold tracking-[0.3em] text-[var(--smuggler-text-muted)] mt-1 flex items-center gap-1.5">
                  <span>—</span> CREATOR TOOLKIT <span>—</span>
                </span>
              </div>
            </div>

            <p className="text-[0.9rem] leading-relaxed text-[var(--smuggler-text-secondary)] mb-6">
              The most advanced intelligence network for content creators.
              Create, optimize, and grow with precision.
            </p>

            <div className="flex gap-4 text-[var(--smuggler-text-muted)]">
              {SOCIALS.map(({ label, Icon }) => (
                <motion.a
                  key={label}
                  href="#"
                  aria-label={label}
                  whileHover={{ scale: 1.15, color: 'var(--smuggler-gold)' }}
                  className="transition-colors"
                >
                  <Icon size={22} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="flex gap-12 md:gap-20">
            <LinkColumn title="Intelligence" links={intelligenceLinks} />
            <LinkColumn title="Agency" links={AGENCY_LINKS} />
            <LinkColumn title="Legal" links={LEGAL_LINKS} />
          </div>

          {/* Newsletter signup */}
          <div className="max-w-[300px]">
            <h4 className="text-[0.85rem] font-bold tracking-[1px] text-[var(--smuggler-text)] uppercase mb-3 flex items-center gap-2">
              <Mail size={14} className="text-[var(--smuggler-gold)]" />
              Intel Drop
            </h4>
            <p className="text-[0.85rem] text-[var(--smuggler-text-secondary)] mb-4">
              Get the latest creator intel delivered to your inbox. No spam,
              just signal.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
                className="flex-1 rounded-md border border-[var(--smuggler-border)] bg-black/30 px-4 py-2.5 text-sm text-[var(--smuggler-text)] placeholder:text-[var(--smuggler-text-muted)] outline-none focus:border-[var(--smuggler-gold)]/50 transition-colors"
              />
              <button
                type="submit"
                className="smuggler-btn smuggler-btn-gold py-2.5 px-4 whitespace-nowrap"
              >
                Subscribe
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-[var(--smuggler-border)]/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[0.8rem] text-[var(--smuggler-text-muted)]">
            © {currentYear} Content Smuggler. All rights reserved.
          </p>

          <div className="flex items-center gap-3">
            <span className="text-[0.8rem] text-[var(--smuggler-text-muted)]">
              Made with 🕵️‍♂️ for creators
            </span>
            <div
              className="w-6 h-6 rounded-full bg-[var(--smuggler-forest)] border border-[#16261A] text-[#4C6B4A] flex items-center justify-center text-[10px] font-bold"
              aria-hidden="true"
              title="Content Smuggler seal"
            >
              C
            </div>
          </div>

          <div className="flex gap-4">
            <a
              href="#"
              className="text-[0.8rem] text-[var(--smuggler-text-muted)] hover:text-[var(--smuggler-text)] transition-colors"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-[0.8rem] text-[var(--smuggler-text-muted)] hover:text-[var(--smuggler-text)] transition-colors"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
