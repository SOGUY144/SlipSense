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
  { href: "/transactions", label: "รายการ", icon: List },
  { href: "/upload", label: "ถ่ายสลิป", icon: Camera },
  { href: "/analytics", label: "วิเคราะห์", icon: BarChart3 },
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
    <div className="min-h-screen bg-slate-50 relative">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.03)] border-b border-slate-100">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium">SlipSense</p>
            <p className="text-sm font-semibold truncate max-w-[200px] text-slate-800">
              {shopName}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Link
              href="/settings"
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-primary transition-colors"
              aria-label="ตั้งค่า"
            >
              <Settings className="h-5 w-5" strokeWidth={1.75} />
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-destructive transition-colors"
              aria-label="ออกจากระบบ"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-24 pt-6">{children}</main>

      {!pathname.startsWith("/review") && pathname !== "/chat" && (
        <div className="fixed bottom-24 left-0 right-0 z-50 mx-auto max-w-lg pointer-events-none px-4 flex justify-end">
          <Link 
            href="/chat" 
            className="rounded-full bg-white border border-slate-100 p-3.5 text-primary shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(52,211,153,0.3)] hover:text-white hover:bg-primary transition-all duration-300 hover:scale-110 flex items-center justify-center animate-bounce pointer-events-auto"
            style={{ animationDuration: '3s' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bot"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
          </Link>
        </div>
      )}

      {!pathname.startsWith("/review") && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-lg bg-white/90 backdrop-blur-lg border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-1" style={{ paddingBottom: 'calc(4px + env(safe-area-inset-bottom))' }}>
          <div className="flex h-16 items-center justify-around px-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href) && (href !== "/dashboard" || pathname === "/dashboard");
              const isUpload = href === "/upload";
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex flex-col items-center justify-center flex-1 min-w-0 h-full transition-all duration-300",
                    !isUpload && active ? "text-primary -translate-y-1" : !isUpload ? "text-slate-400 hover:text-primary hover:-translate-y-0.5" : ""
                  )}
                >
                  {isUpload ? (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 h-14 w-14 rounded-full bg-gradient-to-tr from-teal-300 to-primary text-primary-foreground shadow-[0_8px_20px_rgba(52,211,153,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300">
                      <Icon className="h-6 w-6 text-white drop-shadow-sm" strokeWidth={2} />
                    </div>
                  ) : (
                    <>
                      <div className={cn("p-1.5 rounded-xl transition-colors duration-300", active ? "bg-primary/10" : "bg-transparent")}>
                        <Icon className={cn("h-5 w-5 transition-all duration-300")} strokeWidth={1.75} />
                      </div>
                      <span className={cn("text-[10px] leading-none transition-all duration-300 mt-0.5 truncate max-w-[50px] text-center", active ? "opacity-100 font-semibold" : "opacity-80 font-medium")}>{label}</span>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
