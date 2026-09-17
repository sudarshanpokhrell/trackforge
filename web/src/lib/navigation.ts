import {
  CheckListIcon,
  DashboardSquare02Icon,
  FileImportIcon,
  Folder01Icon,
  FolderLibraryIcon,
  InboxIcon,
  MoreHorizontalIcon,
  UserAdd01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

export type NavItem = {
  title: string
  icon?: IconSvgElement
  href?: string
  children?: NavItem[]
}

export const mainNav: NavItem[] = [
  { title: "Inbox", icon: InboxIcon, href: "/inbox" },
  { title: "My issues", icon: CheckListIcon, href: "/issues" },
  { title: "Workspace", icon: Folder01Icon, href: "/workspace" },
  { title: "Projects", icon: DashboardSquare02Icon, href: "/projects" },
  { title: "Views", icon: ViewIcon, href: "/views" },
  { title: "More", icon: MoreHorizontalIcon, href: "/more" },
]

export const teamNav: NavItem[] = [
  {
    title: "Srs issue tracking",
    icon: FolderLibraryIcon,
    children: [
      { title: "Home", href: "/" },
      { title: "Issues", href: "/issues" },
      { title: "Projects", href: "/projects" },
      { title: "Views", href: "/views" },
    ],
  },
]

export const tryNav: NavItem[] = [
  { title: "Import issues", icon: FileImportIcon, href: "/import" },
  { title: "Invite people", icon: UserAdd01Icon, href: "/invite" },
  // { title: 'Connect GitHub', icon: GitHub, href: '/github' },
]
