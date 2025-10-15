"use client";

import { useEffect, useState } from "react";

import { EllipsisVertical, CircleUser, CreditCard, MessageSquareDot, LogOut, Megaphone } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { changelogApi } from "@/lib/api";
import { getInitials } from "@/lib/utils";

export function NavUser({
  user,
}: {
  readonly user: {
    readonly name: string;
    readonly email: string;
    readonly avatar: string;
  };
}) {
  const { isMobile } = useSidebar();
  const [openUpdates, setOpenUpdates] = useState(false);
  const [changes, setChanges] = useState<any[]>([]);
  useEffect(() => {
    if (!openUpdates) return;
    (async () => {
      try {
        const list = await changelogApi.list();
        setChanges(Array.isArray(list) ? list : []);
      } catch {
        setChanges([]);
      }
    })();
  }, [openUpdates]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={user.avatar || undefined} alt={user.name} />
                <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
              </div>
              <EllipsisVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar || undefined} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <CircleUser />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MessageSquareDot />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenUpdates(true)}>
                <Megaphone />
                Updates
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                try {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('auth');
                    // clear auth cookie if present
                    document.cookie = 'auth-token=; Max-Age=0; Path=/; SameSite=Lax';
                    window.location.href = '/auth/v1/login';
                  }
                } catch (_) { }
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog open={openUpdates} onOpenChange={setOpenUpdates}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>What’s new</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-4">
              {changes.map((it) => (
                <div key={String(it._id)} className="border rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{it.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(it.date).toLocaleDateString()}</div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{it.description}</div>
                </div>
              ))}
              {changes.length === 0 && (
                <div className="text-sm text-muted-foreground">No updates yet.</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
