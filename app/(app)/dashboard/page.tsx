"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Camera, TrendingUp, TrendingDown, Wallet, Loader2, Sparkles, Bell, Calendar, ChevronRight, CheckCircle2, Info, AlertTriangle, Lightbulb, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatPercent, triggerHaptic } from "@/lib/utils";
import type { Transaction } from "@/lib/db/schema";
import { OnboardingReminders } from "@/components/reminders/onboarding-reminders";
import { SpendingBehaviorModal } from "@/components/onboarding/spending-behavior-modal";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";

interface Summary {
  shopName: string;
  current: { income: number; expense: number; profit: number };
  previous: { income: number; expense: number; profit: number };
  profitChangePercent: number;
  recentTransactions: Transaction[];
}

interface Insight {
  id: string;
  content: string;
  metadata?: {
    type?: string;
  };
}

interface Alert {
  id: string;
  title: string;
  dueDay: number;
  amount: string | null;
  daysLeft: number;
}

interface ForecastData {
  summary: {
    currentBalance: number;
    projected30DayBalance: number;
    avgDailyIncome: number;
    avgDailyExpense: number;
    isShortageRisk: boolean;
    shortageDate: string | null;
    shortageAmount: number;
    recommendation: string;
  };
  forecast: Array<{
    date: string;
    dayLabel: string;
    projectedIncome: number;
    projectedExpense: number;
    projectedBalance: number;
  }>;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [behaviorModalDone, setBehaviorModalDone] = useState(false);
  const [showPaidSuccess, setShowPaidSuccess] = useState(false);

  async function load() {
    const [summaryRes, insightsRes, alertsRes, forecastRes] = await Promise.all([
      fetch("/api/dashboard/summary"),
      fetch("/api/insights"),
      fetch("/api/dashboard/reminders-alerts"),
      fetch("/api/analytics/forecast"),
    ]);

    if (summaryRes.ok) {
      setSummary(await summaryRes.json());
    }
    if (insightsRes.ok) {
      setInsights(await insightsRes.json());
    }
    if (alertsRes.ok) {
      const data = await alertsRes.json();
      setAlerts(data.alerts || []);
    }
    if (forecastRes.ok) {
      setForecast(await forecastRes.json());
    }
  }

  useEffect(() => {
    load().then(() => setLoading(false));
  }, []);

  async function handleGenerateInsights() {
    setGeneratingInsights(true);
    const res = await fetch("/api/insights", { method: "POST" });
    if (res.ok) {
      await load();
    } else {
      alert("ไม่สามารถวิเคราะห์ข้อมูลได้ กรุณาลองใหม่");
    }
    setGeneratingInsights(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">กำลังโหลด...</p>
      </div>
    );
  }

  const profitUp = (summary?.profitChangePercent ?? 0) >= 0;
  
  const totalFlow = (summary?.current.income ?? 0) + (summary?.current.expense ?? 0);
  const incomePct = totalFlow > 0 ? ((summary?.current.income ?? 0) / totalFlow) * 100 : 50;
  const expensePct = totalFlow > 0 ? ((summary?.current.expense ?? 0) / totalFlow) * 100 : 50;

  const isEmptyState = summary?.current.income === 0 && summary?.current.expense === 0 && (!summary?.recentTransactions || summary.recentTransactions.length === 0);

  return (
    <>
    <PullToRefresh onRefresh={load}>
      <div className="space-y-6 pb-24">
        {behaviorModalDone && <OnboardingReminders onComplete={load} />}
      <SpendingBehaviorModal onComplete={load} onSkipOrDone={() => setBehaviorModalDone(true)} />
      
      <div className="flex flex-col items-center justify-center gap-2 pt-2 pb-6 px-1">
        <p className="text-[11px] text-slate-500 font-medium tracking-wide">ยอดเงินคงเหลือสุทธิ</p>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#43936C]/10 rounded-full flex items-center justify-center">
            <Wallet className="w-4 h-4 text-[#43936C]" />
          </div>
          <p className="text-[32px] font-bold text-slate-900 tracking-tight font-number">
            {formatCurrency(summary?.current.profit ?? 0)}
          </p>
        </div>
      </div>

      {/* Quick Actions Restored */}
      <div className="flex justify-center gap-6 px-4 mb-6 mt-2">
        <Link href="/upload" className="flex flex-col items-center gap-2 group cursor-pointer">
          <div className="w-14 h-14 bg-white rounded-[1.25rem] shadow-sm flex items-center justify-center text-slate-700 group-hover:bg-slate-50 transition-colors">
            <Camera className="w-[22px] h-[22px]" strokeWidth={2} />
          </div>
          <span className="text-[11px] font-medium text-slate-600">ถ่ายสลิป</span>
        </Link>
        <Link href="/upload?mode=manual" className="flex flex-col items-center gap-2 group cursor-pointer">
          <div className="w-14 h-14 bg-white rounded-[1.25rem] shadow-sm flex items-center justify-center text-slate-700 group-hover:bg-slate-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
          </div>
          <span className="text-[11px] font-medium text-slate-600">จดมือ</span>
        </Link>
        <Link href="/analytics" className="flex flex-col items-center gap-2 group cursor-pointer">
          <div className="w-14 h-14 bg-white rounded-[1.25rem] shadow-sm flex items-center justify-center text-slate-700 group-hover:bg-slate-50 transition-colors">
            <BarChart3 className="w-[22px] h-[22px]" strokeWidth={2} />
          </div>
          <span className="text-[11px] font-medium text-slate-600">วิเคราะห์ (กราฟ)</span>
        </Link>
      </div>

      <div className="bg-white rounded-[1.5rem] p-5 shadow-sm mb-6 relative overflow-hidden">
        <div className="flex justify-between items-center mb-5">
           <h2 className="text-[15px] font-bold text-slate-800">สรุปเดือนนี้</h2>
           <Link href="/analytics" className="text-[11px] text-slate-500 font-medium">ดูสรุป</Link>
        </div>
        <div className="flex gap-4">
           <div className="flex-1">
             <p className="text-[11px] text-slate-500 mb-1">รายรับ</p>
             <p className="text-[22px] font-bold text-[#43936C] tracking-tight font-number">{formatCurrency(summary?.current.income ?? 0)}</p>
           </div>
           <div className="w-[1px] bg-slate-100"></div>
           <div className="flex-1">
             <p className="text-[11px] text-slate-500 mb-1">รายจ่าย</p>
             <p className="text-[22px] font-bold text-slate-900 tracking-tight font-number">{formatCurrency(summary?.current.expense ?? 0)}</p>
           </div>
        </div>
        
        <div className="mt-6">
           <div className="flex justify-between text-[10px] mb-2">
             <span className="text-[#43936C] font-semibold flex items-center gap-1">
               <TrendingUp className="w-3 h-3" />
               กำไร {formatCurrency((summary?.current.profit ?? 0))}
             </span>
             <span className="text-slate-400">
               {profitUp ? "เติบโต " : "ลดลง "} {formatPercent(summary?.profitChangePercent ?? 0)}
             </span>
           </div>
           <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-[#43936C] rounded-full" style={{ width: `${Math.min(100, Math.max(0, incomePct))}%` }}></div>
           </div>
        </div>
      </div>

      {/* Early Warning Risk Banner */}
      {forecast?.summary.isShortageRisk && (
        <Card className="border-2 border-red-200 bg-red-50/70 shadow-sm overflow-hidden animate-in fade-in duration-300">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-full text-red-600 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-red-900 flex items-center gap-2">
                เตือนภัยสภาพคล่องการเงิน (AI Forecast)
              </h4>
              <p className="text-xs text-red-700 leading-relaxed font-medium">
                {forecast.summary.recommendation}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI 30-Day Cash Flow Forecast Card */}
      {forecast && (
        <Card className="border border-border/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm">คาดการณ์เงินคงเหลือ (อีก 30 วัน)</h3>
              </div>
              <Badge variant="outline" className="text-xs font-semibold bg-primary/5 text-primary border-primary/20">
                คาดการณ์: {formatCurrency(forecast.summary.projected30DayBalance)}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {forecast.summary.recommendation}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40">
              <div className="bg-muted/40 p-2.5 rounded-lg">
                <p className="text-muted-foreground">รายรับเฉลี่ย/วัน</p>
                <p className="font-bold text-success text-sm">{formatCurrency(forecast.summary.avgDailyIncome)}</p>
              </div>
              <div className="bg-muted/40 p-2.5 rounded-lg">
                <p className="text-muted-foreground">รายจ่ายเฉลี่ย/วัน</p>
                <p className="font-bold text-destructive text-sm">{formatCurrency(forecast.summary.avgDailyExpense)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden rounded-3xl">
        <div className="p-5 pb-3 flex items-center justify-between border-b border-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Calendar className="w-4 h-4" strokeWidth={2} />
            </div>
            <h2 className="text-[15px] font-bold text-slate-800">บิลประจำเดือน</h2>
          </div>
          <Link
            href="/reminders"
            className="text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            จัดการบิล
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {alerts.length > 0 && (
          <div className="px-4 pb-3">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 bg-primary/5 p-2 rounded-md">
              <Info className="w-3 h-3 text-primary shrink-0" /> 
              <span>ถ้าจ่ายแล้วให้กด <strong>"จ่ายแล้ว"</strong> เพื่อบันทึกการชำระเงิน</span>
            </p>
          </div>
        )}
        
        <CardContent className="p-0">
          {alerts.length > 0 ? (
            <div className="divide-y divide-border/50">
              {alerts.map((alert) => {
                const isOverdue = alert.daysLeft < 0;
                const isDueSoon = alert.daysLeft >= 0 && alert.daysLeft <= 3;
                
                return (
                  <div key={alert.id} className={`p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors border-l-4 ${isOverdue ? 'border-l-destructive' : isDueSoon ? 'border-l-warning' : 'border-l-primary/40'}`}>
                    <div className={`p-2.5 rounded-full shrink-0 ${
                      isOverdue ? 'bg-destructive/10 text-destructive' : 
                      isDueSoon ? 'bg-warning/10 text-warning' : 
                      'bg-primary/10 text-primary'
                    }`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">
                        {alert.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span className={`font-medium ${
                          isOverdue ? 'text-destructive' : 
                          isDueSoon ? 'text-warning' : ''
                        }`}>
                          {isOverdue 
                            ? `เลยกำหนด ${Math.abs(alert.daysLeft)} วัน` 
                            : alert.daysLeft === 0 
                            ? "ครบกำหนดวันนี้" 
                            : `อีก ${alert.daysLeft} วัน`}
                        </span>
                        <span>•</span>
                        <span>วันที่ {alert.dueDay}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {alert.amount && (
                        <span className="text-sm font-bold">
                          {formatCurrency(parseFloat(alert.amount))}
                        </span>
                      )}
                      <Button 
                        size="sm" 
                        variant={isOverdue ? "destructive" : isDueSoon ? "default" : "outline"}
                        className="h-7 text-[10px] px-2.5 rounded-full font-bold"
                        onClick={async () => {
                          triggerHaptic('light');
                          const now = new Date();
                          const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                          const res = await fetch("/api/reminders/paid", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: alert.id, paidMonth: currentMonthStr })
                          });
                          if (res.ok) {
                            load();
                            setShowPaidSuccess(true);
                            triggerHaptic('success');
                            setTimeout(() => setShowPaidSuccess(false), 2000);
                          }
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 mr-1"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        จ่ายแล้ว
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 flex flex-col items-center justify-center text-center bg-gradient-to-b from-success/5 to-transparent relative overflow-hidden">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-success/30 to-transparent"></div>
              
              <div className="relative mb-4 group">
                <div className="absolute inset-0 bg-success/30 blur-xl rounded-full scale-150 group-hover:scale-175 transition-transform duration-500"></div>
                <div className="relative w-16 h-16 bg-gradient-to-tr from-emerald-500 to-green-400 rounded-2xl flex items-center justify-center shadow-lg shadow-success/40 transform -rotate-6 group-hover:rotate-0 transition-all duration-300">
                  <CheckCircle2 className="w-8 h-8 text-white drop-shadow-md" strokeWidth={2.5} />
                </div>
              </div>
              
              <p className="text-base font-extrabold text-foreground tracking-tight">ไม่มีบิลใกล้ถึงกำหนด</p>
              <p className="text-sm font-medium text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
                ยอดเยี่ยม! เดือนนี้คุณเคลียร์บิลครบหมดแล้ว พักผ่อนได้เลย 🌿
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mb-6">
        <div className="bg-white rounded-[1.25rem] shadow-sm overflow-hidden relative">
          <div className="w-full p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-50 rounded-lg text-amber-500">
                <Lightbulb className="w-4 h-4" />
              </div>
              <h2 className="text-[14px] font-bold text-slate-800">
                {insights.length > 0 ? "คำแนะนำจาก AI" : "ให้ AI ช่วยวิเคราะห์"}
              </h2>
            </div>
            {!insights.length ? (
              <button 
                onClick={handleGenerateInsights} 
                disabled={generatingInsights}
                className="text-[11px] font-bold bg-[#43936C] text-white px-3 py-1.5 rounded-full hover:bg-[#367a59] transition-colors flex items-center gap-1"
              >
                {generatingInsights ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                วิเคราะห์เลย
              </button>
            ) : (
              <Link href="/chat" className="text-[11px] text-slate-400 flex items-center hover:text-primary transition-colors">
                คุยกับ AI <ChevronRight className="w-3 h-3 ml-0.5" />
              </Link>
            )}
          </div>
          
          {insights.length > 0 && (
            <div className="px-4 pb-4 pt-1">
              <p className="text-[12px] text-slate-600 leading-relaxed">
                {insights[0]?.content}
              </p>
              <div className="mt-3 flex justify-end">
                <button 
                  onClick={handleGenerateInsights} 
                  disabled={generatingInsights}
                  className="text-[10px] font-medium text-slate-400 hover:text-slate-600 flex items-center gap-1"
                >
                  {generatingInsights ? <Loader2 className="h-3 w-3 animate-spin" /> : "อัปเดตคำแนะนำใหม่"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[13px] font-medium text-slate-500">รายการล่าสุด</h2>
          <Link
            href="/transactions"
            className="text-[11px] font-medium text-slate-400 flex items-center"
          >
            ทั้งหมด <ChevronRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>

        {(summary?.recentTransactions ?? []).length === 0 ? (
          <div className="bg-white rounded-[1.5rem] p-8 flex flex-col items-center gap-4 text-center shadow-sm">
            <div className="p-4 bg-[#F5F5F7] rounded-full">
              <Camera className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
            </div>
            <p className="text-[12px] text-slate-500 font-medium">ยังไม่มีรายการ เริ่มด้วยการถ่ายสลิป</p>
          </div>
        ) : (
          <div className="bg-white rounded-[1.5rem] shadow-sm overflow-hidden mb-8 px-4">
            <div className="divide-y divide-slate-100">
              {summary?.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3.5 bg-white active:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-[0.85rem] flex items-center justify-center ${tx.type === 'income' ? 'bg-[#43936C]/10 text-[#43936C]' : 'bg-[#7364E3]/10 text-[#7364E3]'}`}>
                      {tx.type === 'income' ? <TrendingUp className="w-4 h-4" strokeWidth={2.5}/> : <Wallet className="w-4 h-4" strokeWidth={2.5}/>}
                    </div>
                    <div>
                        <div className="text-[14px] font-bold text-slate-800">{tx.category}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 line-clamp-1">
                          {(tx.type === "income" ? tx.sender : tx.receiver) ?? "ไม่มีรายละเอียด"}
                        </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className={`text-[15px] font-bold tracking-tight font-number ${tx.type === "income" ? "text-[#43936C]" : "text-slate-900"}`}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(parseFloat(tx.amount))}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(tx.occurredAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>

      {/* Paid Success Overlay */}
      {showPaidSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl animate-in zoom-in-95 duration-200 min-w-[200px]">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" strokeWidth={3} />
            </div>
            <p className="font-bold text-xl text-slate-800">บันทึกจ่ายบิลสำเร็จ</p>
          </div>
        </div>
      )}
    </>
  );
}
