"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Bookmark, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Leaderboard } from "./leaderboard";

export function AppSidebar() {
  const pathname = usePathname();
  const menuItems = [
    { href: "/", label: "Home Feed", icon: Home },
    { href: "/saved", label: "Saved Echoes", icon: Bookmark },
    { href: "/hidden", label: "Hidden Echoes", icon: EyeOff },
  ];

  return (
    <Sidebar className="bg-background">
      <SidebarHeader>
        <div className="font-bold text-lg px-2 py-4">Echonym</div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <nav className="px-2">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.href}>
                  <Button
                    asChild
                    variant="ghost"
                    className={cn(
                      "w-full text-base font-normal text-slate-300 justify-start",
                      pathname === item.href && "bg-primary/10 text-primary"
                    )}
                  >
                    <Link href={item.href} className="flex items-center">
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.label}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </nav>
        </SidebarGroup>
        <SidebarGroup className="mt-6 px-2 pb-4">
          <Leaderboard />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
} 