
"use client"

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from '@/components/ui/button'
import { Menu, Home, Bookmark, EyeOff } from 'lucide-react'
import { UserSearchSidebar } from '../user-search-sidebar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const menuItems = [
    { href: "/", label: "Home Feed", icon: Home },
    { href: "/saved", label: "Saved Posts", icon: Bookmark },
    { href: "/hidden", label: "Hidden Posts", icon: EyeOff },
]

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-4 w-full max-w-sm bg-card border-r-border">
         <div className="space-y-6">
            <h2 className="text-lg font-bold font-mono text-primary">Menu</h2>
             <nav>
                <ul className="space-y-2">
                    {menuItems.map((item) => (
                        <li key={item.href}>
                            <Button
                                asChild
                                variant="ghost"
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                    "w-full justify-start text-base font-normal text-slate-300",
                                    pathname === item.href && "bg-primary/10 text-primary"
                                )}
                            >
                                <Link href={item.href}>
                                    <item.icon className="mr-3 h-5 w-5" />
                                    {item.label}
                                </Link>
                            </Button>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="border-t border-border" />
            <div className="!mt-0">
              <UserSearchSidebar isMobile={true} onSelectUser={() => setIsOpen(false)} />
            </div>
         </div>
      </SheetContent>
    </Sheet>
  )
}
