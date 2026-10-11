import { House } from 'lucide-react'
import { Link } from 'react-router-dom'

const unauthorizedIllustration = '/Golden%20Hour%20Permission%20Denied.png'

export function UnauthorizedPage() {
  return (
    <main className="relative h-[100svh] max-h-[100svh] overflow-hidden bg-[#17191c]">
      <img
        src={unauthorizedIllustration}
        alt="A horse behind a permission barrier"
        className="absolute inset-0 size-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/5" />
      <div className="absolute inset-x-0 bottom-0 flex justify-center px-6 pb-8 sm:pb-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-none bg-[#f39200] px-5 py-3 text-sm font-bold text-[#171717] shadow-[0_8px_24px_rgba(0,0,0,0.3)] transition hover:bg-[#d97d00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f39200]"
        >
          <House className="size-4" />
          Return Home
        </Link>
      </div>
    </main>
  )
}
