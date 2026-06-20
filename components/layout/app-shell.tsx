"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Camera,
  List,
  BarChart3,
  Settings,
  LogOut,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

import { NotificationBell } from "@/components/reminders/notification-bell";

const navItems = [
  { href: "/dashboard", label: "หน้าหลัก", icon: LayoutDashboard },
  { href: "/upload", label: "ถ่ายสลิป", icon: Camera },
  { href: "/transactions", label: "รายการ", icon: List },
  { href: "/analytics", label: "วิเคราะห์", icon: BarChart3 },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
  { href: "/profile", label: "โปรไฟล์", icon: UserCircle },
];

export function AppShell({
  children,
  shopName,
}: {
  children: React.ReactNode;
  shopName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div>
            <p className="text-xs text-muted-foreground">SlipSense</p>
            <p className="text-sm font-semibold truncate max-w-[200px]">
              {shopName}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="ออกจากระบบ"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-24 pt-4">{children}</main>

      {pathname !== "/chat" && (
        <Link 
          href="/chat" 
          className="fixed bottom-20 right-4 md:right-[calc(50%-240px)] z-50 rounded-full bg-primary p-3.5 text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 flex items-center justify-center animate-bounce"
          style={{ animationDuration: '3s' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bot"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
        </Link>
      )}

      <nav className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-lg">
        <div className="flex h-16 items-center justify-around rounded-2xl border border-white/40 bg-white/80 px-2 pb-1 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href) && (href !== "/dashboard" || pathname === "/dashboard");
            const isUpload = href === "/upload";
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl min-w-[64px] h-full transition-all duration-300",
                  isUpload 
                    ? "bg-gradient-to-br from-blue-400 to-primary text-primary-foreground shadow-lg shadow-primary/30 -translate-y-5 h-16 w-16 rounded-full border-[3px] border-background hover:scale-105 active:scale-95" 
                    : active
                      ? "text-primary font-bold -translate-y-1"
                      : "text-slate-400 hover:text-primary font-medium hover:-translate-y-0.5"
                )}
              >
                <Icon className={cn("h-6 w-6 transition-all duration-300", isUpload ? "h-7 w-7 text-white" : "", active && !isUpload ? "drop-shadow-sm" : "")} strokeWidth={active || isUpload ? 2.5 : 2} />
                {!isUpload && <span className={cn("text-[10px] leading-none transition-all duration-300", active ? "opacity-100 font-bold" : "opacity-80")}>{label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
