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
  Mic,
  Keyboard,
  ScanLine,
  BookOpen,
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
    { href: "/chat", label: "แชท AI", icon: Bot },
    { href: "/credits", label: "สมุดหนี้สิน", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7] relative overflow-x-hidden">
      <header className="sticky top-0 z-30 bg-[#F5F5F7]/90 backdrop-blur-md">
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

      <main className="mx-auto max-w-lg px-4 pb-32 pt-2">{children}</main>

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
          
          <div className="grid grid-cols-4 gap-3">
            <button onClick={() => { setIsFabOpen(false); router.push('/upload'); }} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-[1rem] bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-[#43936C]/10 hover:text-[#43936C] transition-colors border border-slate-100">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium text-slate-600">ถ่ายสลิป</span>
            </button>
            <button onClick={() => { setIsFabOpen(false); router.push('/upload'); }} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-[1rem] bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-[#43936C]/10 hover:text-[#43936C] transition-colors border border-slate-100">
                <ImageIcon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium text-slate-600">คลังภาพ</span>
            </button>
            <button onClick={() => { setIsFabOpen(false); alert('ระบบพูดกำลังมา!'); }} className="flex flex-col items-center gap-2 col-span-2">
              <div className="w-full h-12 rounded-[1rem] bg-[#43936C] flex items-center justify-center text-white hover:bg-[#367a59] transition-colors shadow-md shadow-[#43936C]/30">
                <Mic className="w-5 h-5 mr-1.5" />
                <span className="text-[13px] font-bold">พูด</span>
              </div>
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
          </div>
        </div>
      </div>

      {!pathname.startsWith("/review") && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg bg-white/95 backdrop-blur-xl border-t border-slate-100/50 pb-1 rounded-t-[1.5rem] shadow-[0_-4px_20px_rgba(0,0,0,0.02)]" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', paddingTop: '12px' }}>
          <div className="flex items-center justify-between px-8 relative">
            
            <div className="flex gap-8">
              {navItemsLeft.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href) && (href !== "/dashboard" || pathname === "/dashboard");
                return (
                  <Link key={href} href={href} className="flex flex-col items-center justify-center min-w-[44px] transition-all duration-300">
                    <div className={cn("transition-all duration-300 mb-1", active ? "text-slate-900 scale-105" : "text-slate-400")}>
                      <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} />
                    </div>
                    <span className={cn("text-[10px] leading-none transition-all duration-300 mt-0.5", active ? "text-slate-900 font-bold" : "text-slate-500 font-medium")}>{label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="absolute left-1/2 -top-8 -translate-x-1/2">
              <button 
                onClick={() => setIsFabOpen(!isFabOpen)}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center text-white shadow-[0_8px_20px_rgba(67,147,108,0.3)] transition-all duration-300 border-[4px] border-[#F5F5F7]",
                  isFabOpen ? "bg-slate-800 rotate-45" : "bg-[#43936C]"
                )}
              >
                <Plus className="w-8 h-8" strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex gap-8">
              {navItemsRight.map(({ href, label, icon: Icon, badge }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link key={href} href={href} className="flex flex-col items-center justify-center min-w-[44px] transition-all duration-300 relative">
                    <div className={cn("transition-all duration-300 mb-1 relative", active ? "text-slate-900 scale-105" : "text-slate-400")}>
                      <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} />
                      {badge && (
                        <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                          {badge}
                        </span>
                      )}
                    </div>
                    <span className={cn("text-[10px] leading-none transition-all duration-300 mt-0.5", active ? "text-slate-900 font-bold" : "text-slate-500 font-medium")}>{label}</span>
                  </Link>
                );
              })}
            </div>
            
          </div>
        </nav>
      )}
    </div>
  );
}
