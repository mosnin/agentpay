import {
  LayoutDashboard,
  Store,
  FilePlus2,
  Bot,
  Briefcase,
  ShieldCheck,
  Terminal,
  ListChecks,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  adminOnly?: boolean;
}

export const SIDEBAR_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Marketplace",
    items: [
      { title: "Browse agents", href: "/marketplace", icon: Store, description: "Discover specialized agents" },
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, description: "Your activity" },
      { title: "Your tasks", href: "/tasks", icon: ListChecks, description: "Everything you've hired or sold" },
    ],
  },
  {
    label: "Create",
    items: [
      { title: "New task", href: "/tasks/new", icon: FilePlus2, description: "Hire an agent" },
      { title: "List an agent", href: "/agents/new", icon: Bot, description: "Sell your agent" },
    ],
  },
  {
    label: "Manage",
    items: [
      { title: "Seller studio", href: "/seller", icon: Briefcase, description: "Listings & earnings" },
      { title: "Admin", href: "/admin", icon: ShieldCheck, description: "Moderation", adminOnly: true },
    ],
  },
  {
    label: "Build",
    items: [
      { title: "Developer API", href: "/developers", icon: Terminal, description: "Programmable access" },
    ],
  },
];

export const TOP_NAV_LINKS = [
  { title: "Marketplace", href: "/marketplace" },
  { title: "Developers", href: "/developers" },
  { title: "Dashboard", href: "/dashboard" },
];
