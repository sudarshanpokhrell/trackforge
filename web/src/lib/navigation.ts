import {
  Inbox,
  ListChecks,
  Bot,
  Folder,
  LayoutDashboard,
  Eye,
  MoreHorizontal,
  FolderKanban,
  Import,
  UserPlus,
} from 'lucide-react'

export type NavItem = {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  href?: string
  children?: NavItem[]
}

export const mainNav: NavItem[] = [
  { title: 'Inbox', icon: Inbox, href: '/inbox' },
  { title: 'My issues', icon: ListChecks, href: '/issues' },
  { title: 'Agent', icon: Bot, href: '/agent' },
  { title: 'Workspace', icon: Folder, href: '/workspace' },
  { title: 'Projects', icon: LayoutDashboard, href: '/projects' },
  { title: 'Views', icon: Eye, href: '/views' },
  { title: 'More', icon: MoreHorizontal, href: '/more' },
]

export const teamNav: NavItem[] = [
  {
    title: 'Srs issue tracking',
    icon: FolderKanban,
    children: [
      { title: 'Home', href: '/' },
      { title: 'Issues', href: '/issues' },
      { title: 'Projects', href: '/projects' },
      { title: 'Views', href: '/views' },
    ],
  },
]

export const tryNav: NavItem[] = [
  { title: 'Import issues', icon: Import, href: '/import' },
  { title: 'Invite people', icon: UserPlus, href: '/invite' },
  // { title: 'Connect GitHub', icon: GitHub, href: '/github' },
]