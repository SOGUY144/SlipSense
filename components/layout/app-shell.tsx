"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Home,
  List,
  Plus,
  CheckCircle2,
  Users,
  Settings,
  LogOut,
  Bot,
  Camera,
  Image as ImageIcon,
  Receipt,
  Mic,
  Keyboard,
  ScanLine,
  BookOpen,
  ChefHat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

import { NotificationBell } from "@/components/reminders/notification-bell";

export function AppShell({
  children,
  shopName,
}: {
  children: React.ReactNode;
  shopName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isFabOpen, setIsFabOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navItemsLeft = [
    { href: "/dashboard", label: "หน้าหลัก", icon: Home },
    { href: "/transactions", label: "รายการ", icon: List },
  ];
  
  const navItemsRight: Array<{ href: string; label: string; icon: any; badge?: string | number }> = [
    { href: "/credits", label: "สมุดหนี้สิน", icon: BookOpen },
    { href: "/profile", label: "ตั้งค่าร้าน", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7] relative overflow-x-hidden">
      <header className="sticky top-0 z-30 bg-[#F5F5F7]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
          <div className="flex-1 min-w-0 mr-4">
            <p className="text-[11px] text-slate-500 font-medium tracking-wider uppercase">SlipSense</p>
            <p className="text-sm font-bold truncate text-slate-800">
              {shopName}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
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

      <main className="mx-auto max-w-lg px-4 pb-36 pt-2">{children}</main>

      {/* FAB Overlay Background */}
      {isFabOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm transition-opacity"
          onClick={() => setIsFabOpen(false)}
        />
      )}

      {/* FAB Menu */}
      <div className={cn(
        "fixed bottom-28 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 origin-bottom",
        isFabOpen ? "scale-100 opacity-100" : "scale-50 opacity-0 pointer-events-none"
      )}>
        <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] p-5 shadow-2xl flex flex-col gap-5 border border-white/40 w-[310px]">
          <div className="text-center">
            <h3 className="text-sm font-bold text-slate-800">ให้ AI จดให้ ไม่ต้องพิมพ์เอง</h3>
            <p className="text-[11px] text-slate-500 mt-1">ถ่ายสลิป พูด หรือสแกน QR แล้วแอปจดให้อัตโนมัติ</p>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => { setIsFabOpen(false); router.push('/upload'); }} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-[1rem] bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-[#43936C]/10 hover:text-[#43936C] transition-colors border border-slate-100">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium text-slate-600">ถ่ายสลิป</span>
            </button>
            <button onClick={() => { setIsFabOpen(false); router.push('/ingredients/scan'); }} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-[1rem] bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-200/50">
                <Receipt className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium text-slate-600">บิลวัตถุดิบ</span>
            </button>
            <button onClick={() => { setIsFabOpen(false); alert('ระบบพูดกำลังมา!'); }} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-[1rem] bg-[#43936C] flex items-center justify-center text-white hover:bg-[#367a59] transition-colors shadow-md shadow-[#43936C]/30">
                <Mic className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium text-slate-600">พูด</span>
            </button>
            
            <button onClick={() => { setIsFabOpen(false); alert('พิมพ์เร็วกำลังมา!'); }} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-[1rem] bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-[#43936C]/10 hover:text-[#43936C] transition-colors border border-slate-100">
                <Keyboard className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium text-slate-600">พิมพ์เร็ว</span>
            </button>
            <button onClick={() => { setIsFabOpen(false); alert('สแกน QR กำลังมา!'); }} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-[1rem] bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-[#43936C]/10 hover:text-[#43936C] transition-colors border border-slate-100">
                <ScanLine className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium text-slate-600">สแกน QR</span>
            </button>
            <button onClick={() => { setIsFabOpen(false); router.push('/recipes'); }} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-[1rem] bg-amber-50 flex items-center justify-center text-amber-600 hover:bg-amber-100 transition-colors border border-amber-200/50">
                <ChefHat className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium text-slate-600">สูตร & ต้นทุน</span>
            </button>
          </div>
        </div>
      </div>

      {!pathname.startsWith("/review") && (
        <nav 
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.12)] p-1.5 transition-all duration-300"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-around relative px-1">
            
            {/* Left Items */}
            {navItemsLeft.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href) && (href !== "/dashboard" || pathname === "/dashboard");
              return (
                <Link 
                  key={href} 
                  href={href} 
                  className={cn(
                    "flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-300 select-none min-w-[62px]",
                    active 
                      ? "bg-slate-100 text-[#43936C]" 
                      : "text-slate-600 hover:text-slate-900 active:scale-95"
                  )}
                >
                  <Icon className={cn("h-5 w-5 transition-transform duration-300", active && "scale-110 text-[#43936C]")} strokeWidth={active ? 2.5 : 2} />
                  <span className={cn("text-[10px] leading-tight mt-0.5 whitespace-nowrap", active ? "font-bold text-[#43936C]" : "font-semibold text-slate-700")}>
                    {label}
                  </span>
                </Link>
              );
            })}

            {/* Center (+) Action Button */}
            <div className="relative flex items-center justify-center min-w-[56px]">
              <button 
                onClick={() => setIsFabOpen(!isFabOpen)}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-[0_6px_18px_rgba(67,147,108,0.35)] transition-all duration-300 active:scale-95",
                  isFabOpen ? "bg-slate-800 rotate-45" : "bg-[#43936C] hover:bg-[#367a59]"
                )}
                aria-label="เมนูด่วน"
              >
                <Plus className="w-6 h-6" strokeWidth={2.5} />
              </button>
            </div>

            {/* Right Items */}
            {navItemsRight.map(({ href, label, icon: Icon, badge }) => {
              const active = pathname.startsWith(href);
              return (
                <Link 
                  key={href} 
                  href={href} 
                  className={cn(
                    "flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-300 select-none relative min-w-[62px]",
                    active 
                      ? "bg-slate-100 text-[#43936C]" 
                      : "text-slate-600 hover:text-slate-900 active:scale-95"
                  )}
                >
                  <div className="relative">
                    <Icon className={cn("h-5 w-5 transition-transform duration-300", active && "scale-110 text-[#43936C]")} strokeWidth={active ? 2.5 : 2} />
                    {badge && (
                      <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                        {badge}
                      </span>
                    )}
                  </div>
                  <span className={cn("text-[10px] leading-tight mt-0.5 whitespace-nowrap", active ? "font-bold text-[#43936C]" : "font-semibold text-slate-700")}>
                    {label}
                  </span>
                </Link>
              );
            })}

          </div>
        </nav>
      )}
    </div>
  );
}
