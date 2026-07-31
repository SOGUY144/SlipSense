"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  List,
  BarChart3,
  Settings,
  LogOut,
  UserCircle,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

import { NotificationBell } from "@/components/reminders/notification-bell";

const navItems = [
  { href: "/dashboard", label: "หน้าหลัก", icon: LayoutDashboard },
  { href: "/transactions", label: "รายการ", icon: List },
  { href: "/upload", label: "เพิ่มรายการ", icon: PlusCircle },
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
    <div className="min-h-screen bg-[#F2F2F6] relative">
      <header className="sticky top-0 z-40 bg-[#F2F2F6]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
          <div>
            <p className="text-[11px] text-slate-500 font-medium tracking-wider uppercase">SlipSense</p>
            <p className="text-sm font-bold truncate max-w-[150px] text-slate-800">
              {shopName}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href="/chat"
              className="rounded-full bg-teal-50 p-2 text-teal-600 hover:bg-teal-100 transition-colors flex items-center justify-center gap-1.5 shadow-sm border border-teal-100/50"
              aria-label="AI Chat"
            >
              <Bot className="h-4 w-4" strokeWidth={2} />
              <span className="text-[10px] font-bold">AI</span>
            </Link>
            <NotificationBell />
            <Link
              href="/settings"
              className="rounded-full p-2 text-slate-500 hover:bg-slate-200 transition-colors"
              aria-label="ตั้งค่า"
            >
              <Settings className="h-5 w-5" strokeWidth={1.75} />
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-full p-2 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors"
              aria-label="ออกจากระบบ"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-28 pt-2">{children}</main>

      {!pathname.startsWith("/review") && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-lg bg-white/95 backdrop-blur-xl border-t border-slate-100/50 pb-1" style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))', paddingTop: '8px' }}>
          <div className="flex items-center justify-around px-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href) && (href !== "/dashboard" || pathname === "/dashboard");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 min-w-0 transition-all duration-300",
                    active ? "text-primary" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <div className={cn("p-1.5 rounded-2xl transition-all duration-300", active ? "bg-primary/10 scale-110" : "bg-transparent scale-100")}>
                    <Icon className={cn("h-5 w-5")} strokeWidth={active ? 2.5 : 2} />
                  </div>
                  <span className={cn("text-[10px] leading-none transition-all duration-300 mt-1 truncate max-w-[50px] text-center", active ? "opacity-100 font-bold" : "opacity-80 font-medium")}>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
