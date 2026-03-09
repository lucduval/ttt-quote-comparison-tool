"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  BarChart3,
  Users,
  LayoutDashboard,
  Plus,
  RefreshCw,
  FileText,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Contacts", href: "/contacts", icon: Users },
];

export function Navbar() {
  const pathname = usePathname();
  const { user } = useUser();
  const isAdmin =
    (user?.publicMetadata as { role?: string } | undefined)?.role === "admin";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2 mr-8">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm tracking-tight">
            QuoteCompare
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2 text-sm",
                    isActive && "font-medium"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.name}</span>
                </Button>
              </Link>
            );
          })}
          {isAdmin && (
            <Link href="/admin">
              <Button
                variant={pathname.startsWith("/admin") ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "gap-2 text-sm",
                  pathname.startsWith("/admin") && "font-medium"
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {isAdmin && (
            <Badge
              variant="secondary"
              className="gap-1.5 hidden sm:flex text-xs font-medium"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/comparison/new" className="flex items-center gap-2 cursor-pointer">
                  <BarChart3 className="h-4 w-4" />
                  New Comparison
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/renewal/new" className="flex items-center gap-2 cursor-pointer">
                  <RefreshCw className="h-4 w-4" />
                  New Renewal
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/claims/new" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  New Claim
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: "h-8 w-8",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
