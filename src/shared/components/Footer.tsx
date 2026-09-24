import { Mail, MapPin, Phone } from "lucide-react"
import { Link } from "react-router-dom"

import logo from "@/assets/logo-dark.png"
import orangeLine from "@/assets/orange-line.svg"
import { cn } from "@/lib/utils"
import type { FooterColumnProps } from "@/shared/types/props"

export function FooterColumn({ title, links, className, children }: FooterColumnProps) {
  return (
    <section className={cn("min-w-0 break-words transition-transform duration-300 hover:-translate-y-0.5", className)}>
      <h2 className="mb-4 text-xs font-bold tracking-[0.22em] !text-white">{title}</h2>
      <div className="mb-3 h-0.5 w-6 bg-[#f39200]" />
      {children ?? (
        <nav className="space-y-3" aria-label={title}>
          {links.map((link) => (
            <Link key={link.href} to={link.href} className="block text-sm leading-5 text-[#9297a1] transition-colors duration-200 hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </section>
  )
}

const columns: FooterColumnProps[] = [
  {
    title: "SERVICES",
    links: [
      { label: "International Horse Transport", href: "/services/international-horse-transport" },
      { label: "Ground Transport", href: "/services/ground-transport" },
      { label: "Cross-Border Coordination", href: "/services/cross-border-coordination" },
      { label: "Horse Care & Handling", href: "/services/horse-care" },
    ],
  },
  {
    title: "TRANSPORT",
    links: [
      { label: "How Transport Works", href: "/transport/how-it-works" },
      { label: "Service Coverage", href: "/transport/coverage" },
      { label: "Transport Requirements", href: "/transport/requirements" },
      { label: "Country Documentation", href: "/transport/documentation" },
    ],
  },
  {
    title: "SUPPORT",
    links: [
      { label: "Help Center", href: "/support" },
      { label: "FAQ", href: "/support/faq" },
      { label: "Contact Us", href: "/contact" },
      { label: "About PEGAXUS", href: "/about" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="site-footer-enter relative overflow-hidden bg-[#0d0f12] text-white">
      <img src={orangeLine} alt="" aria-hidden="true" className="mt-10 hidden h-auto w-full max-w-none lg:block" />
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-x-10 gap-y-12 px-8 pb-16 pt-12 sm:grid-cols-2 lg:grid-cols-[1.7fr_1fr_1fr_1fr_1.3fr] lg:px-16">
        <section>
          <img src={logo} alt="Pegaxus" className="mx-auto w-[270px] max-w-full transition-transform duration-300 hover:scale-[1.02] lg:mx-0" />
          <h2 className="mt-5 max-w-[250px] text-base font-bold leading-[1.3] tracking-[0.16em] !text-white pt-5">
            GLOBAL RACEHORSE TRANSPORT WITHOUT BORDERS.
          </h2>
          <div className="my-4 h-0.5 w-10 bg-[#f39200]" />
          <p className="max-w-[270px] text-sm leading-6 text-[#9297a1]">
            Specialist international transport for thoroughbreds, by people who understand.
          </p>
        </section>

        {columns.map((column) => (
          <FooterColumn key={column.title} {...column} />
        ))}

        <FooterColumn title="CONTACT US" links={[]}>
          <div className="space-y-5 text-sm text-[#d4d6da]">
            <p className="py-3 flex min-w-0 items-start gap-4 break-words"><Mail className="mt-0.5 size-5 shrink-0 text-[#f39200]" />info@pegaxus.com</p>
            <p className="py-3 flex min-w-0 items-start gap-4 break-words"><Phone className="mt-0.5 size-5 shrink-0 text-[#f39200]" />+84 9461 123 321</p>
            <p className="py-3 flex min-w-0 items-start gap-4 break-words"><MapPin className="mt-0.5 size-5 shrink-0 text-[#f39200]" /><span>London, United Kingdom<small className="mt-1 block text-[10px] tracking-[0.18em] text-[#9297a1]">GLOBAL OPERATIONS</small></span></p>
          </div>
        </FooterColumn>
      </div>

      <div className="border-t border-[#202329] px-8 py-7 text-xs text-[#9297a1]">
        © {new Date().getFullYear()} PEGAXUS. All rights reserved.
      </div>
    </footer>
  )
}
