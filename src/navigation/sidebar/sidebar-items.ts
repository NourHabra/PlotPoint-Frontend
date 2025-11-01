import {
  Lock,
  Fingerprint,
  LayoutDashboard,
  ChartBar,
  Banknote,
  type LucideIcon,
  ListCheck,
  FolderPen,
  FileText,
  Plus,
  FileEdit,
  FileUp,
  LifeBuoy
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  roles?: Array<'Admin'|'User'>;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
  alignBottom?: boolean;
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Home",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard/default",
        icon: LayoutDashboard,
        roles: ['Admin','User'],
      },
    ],
  },
  {
    id: 2,
    label: "Templates & Reports",
    items: [
      {
        title: "Create New Template",
        url: "/dashboard/templates/import",
        icon: FileUp,
        roles: ['Admin'],
      },
      {
        title: "Manage Templates",
        url: "/dashboard/templates",
        icon: FileText,
        roles: ['Admin'],
      },
      {
        title: "My Templates",
        url: "/dashboard/my-templates",
        icon: FileText,
        roles: ['User'],
      },
      {
        title: "Create Report",
        url: "/dashboard/templates/fill",
        icon: FileEdit,
        roles: ['User'],
      },
      {
        title: "Reports",
        url: "/dashboard/reports",
        icon: FileText,
        roles: ['User'],
      },
      {
        title: "Reports",
        url: "/dashboard/reports/all",
        icon: FileText,
        roles: ['Admin'],
      },
    ],
  },
  {
    id: 3,
    label: "Users",
    items: [
      {
        title: "Create User",
        url: "/dashboard/admin/create-user",
        icon: FileText,
        roles: ['Admin'],
      },
      {
        title: "Users",
        url: "/dashboard/users",
        icon: FileText,
        roles: ['Admin'],
      },
      {
        title: "My Profile",
        url: "/dashboard/profile",
        icon: FileText,
        roles: ['Admin','User'],
      },
    ],
  },
  {
    id: 4,
    label: "System",
    items: [
      {
        title: "Generation Stats",
        url: "/dashboard/admin/generation-stats",
        icon: ChartBar,
        roles: ['Admin'],
      },
      {
        title: "Changelog",
        url: "/dashboard/admin/changelog",
        icon: FileText,
        roles: ['Admin'],
      },
    ],
  },
  {
    id: 5,
    label: "",
    alignBottom: true,
    items: [
      {
        title: "Tickets",
        url: "/dashboard/admin/tickets",
        icon: LifeBuoy,
        roles: ['Admin'],
      },
      {
        title: "Support",
        url: "/dashboard/support",
        icon: LifeBuoy,
        roles: ['User'],
      },
    ],
  },
];
