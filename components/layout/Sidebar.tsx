'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { signOut } from '@/actions/auth'

interface SidebarProps {
  role: 'hr' | 'manager' | 'it_admin'
  userName?: string | null
}

export default function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sign out.')
    }
  }

  const links: Record<SidebarProps['role'], { href: string; label: string; icon: string }[]> = {
    hr: [
      { href: '/dashboard/hr', label: 'Overview', icon: '⌂' },
      { href: '/dashboard/hr/new-request', label: 'New request', icon: '+' },
    ],
    manager: [
      { href: '/dashboard/manager', label: 'Review queue', icon: '◷' },
    ],
    it_admin: [
      { href: '/dashboard/admin', label: 'All requests', icon: '▦' },
      { href: '/dashboard/admin/catalog', label: 'Access catalog', icon: '◈' },
      { href: '/dashboard/admin/templates', label: 'Role templates', icon: '▤' },
      { href: '/dashboard/admin/audit', label: 'Audit log', icon: '≋' },
    ],
  }

  const roleLinks = links[role]
  const roleLabel = role === 'it_admin' ? 'IT ADMIN' : role.toUpperCase()

  return (
    <aside className="flex shrink-0 flex-col border-b border-slate-800 bg-slate-950 text-white md:sticky md:top-0 md:h-screen md:w-[260px] md:border-b-0 md:border-r">
      <div className="flex min-h-[72px] items-center gap-3 px-5 md:px-6">
        <span className="brand-mark brand-mark-dark">A</span>
        <div>
          <p className="text-sm font-bold tracking-wide">AccessFlow</p>
          <p className="text-[11px] font-medium tracking-[0.16em] text-slate-400">AI · ACCESS OPERATIONS</p>
        </div>
      </div>
      <div className="flex items-center gap-3 border-y border-white/10 px-5 py-4 md:px-6">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-400/15 text-sm font-bold text-indigo-200">
          {(userName || 'U').trim().slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-100">{userName || 'Workspace user'}</p>
          <p className="mt-0.5 text-[10px] font-semibold tracking-[0.16em] text-slate-400">{roleLabel}</p>
        </div>
      </div>
      <nav aria-label="Workspace navigation" className="flex gap-2 overflow-x-auto px-3 py-3 md:flex-1 md:flex-col md:gap-1 md:overflow-visible md:px-3 md:py-6">
        {roleLinks.map((link) => {
          const active = pathname === link.href || (link.href !== '/dashboard/hr' && pathname.startsWith(`${link.href}/`))
          return (
          <Link
            key={link.href}
            href={link.href}
            className={active
              ? 'flex shrink-0 items-center gap-3 rounded-xl bg-indigo-500/15 px-3 py-2.5 text-sm font-semibold text-indigo-100 md:w-full'
              : 'flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white md:w-full'}
          >
            <span aria-hidden="true" className="flex size-5 items-center justify-center text-base">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
          )
        })}
      </nav>
      <div className="hidden border-t border-white/10 p-4 md:block">
        <button onClick={handleLogout} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white">
          Sign out
        </button>
      </div>
      <div className="border-t border-white/10 p-3 md:hidden">
        <button onClick={handleLogout} className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white">
          Sign out
        </button>
      </div>
    </aside>
  )
}