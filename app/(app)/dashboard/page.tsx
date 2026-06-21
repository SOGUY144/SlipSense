"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Camera, TrendingUp, TrendingDown, Wallet, Loader2, Sparkles, Bell, Calendar, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import type { Transaction } from "@/lib/db/schema";
import { OnboardingReminders } from "@/components/reminders/onboarding-reminders";
import { SpendingBehaviorModal } from "@/components/onboarding/spending-behavior-modal";

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
}

interface Alert {
  id: string;
  title: string;
  dueDay: number;
  amount: string | null;
  daysLeft: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [behaviorModalDone, setBehaviorModalDone] = useState(false);

  async function load() {
    const [summaryRes, insightsRes, alertsRes] = await Promise.all([
      fetch("/api/dashboard/summary"),
      fetch("/api/insights"),
      fetch("/api/dashboard/reminders-alerts"),
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

  return (
    <div className="space-y-6">
      {behaviorModalDone && <OnboardingReminders onComplete={load} />}
      <SpendingBehaviorModal onComplete={load} onSkipOrDone={() => setBehaviorModalDone(true)} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">สุขภาพการเงิน</h1>
          <p className="text-sm text-muted-foreground">เดือนนี้</p>
        </div>
        <Link href="/upload">
          <Button size="sm" className="gap-2">
            <Camera className="h-4 w-4" />
            ถ่ายสลิป
          </Button>
        </Link>
      </div>

      <Card className="border-none shadow-xl shadow-primary/20 bg-gradient-to-br from-slate-900 via-primary to-blue-600 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Wallet className="w-32 h-32 text-white transform rotate-12" />
        </div>
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                <Wallet className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-semibold text-lg text-white/90">กำไรสุทธิ</span>
            </div>
            <Badge variant={profitUp ? "success" : "destructive"} className="text-sm px-2.5 py-1 shadow-md font-bold border-none">
              {formatPercent(summary?.profitChangePercent ?? 0)}
            </Badge>
          </div>
          <p className="text-5xl font-extrabold text-white tracking-tight drop-shadow-sm font-number mt-1">
            {formatCurrency(summary?.current.profit ?? 0)}
          </p>
          
          {/* Income vs Expense Bar */}
          <div className="mt-5 space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-white/80">
              <span>รายรับ {Math.round(incomePct)}%</span>
              <span>รายจ่าย {Math.round(expensePct)}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-400" style={{ width: `${incomePct}%` }}></div>
              <div className="h-full bg-rose-400" style={{ width: `${expensePct}%` }}></div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 text-xs font-medium text-white/70">
            <span>เทียบเดือนก่อน</span>
            <span className="text-white/90 font-semibold font-number">{formatCurrency(summary?.previous.profit ?? 0)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-none shadow-sm bg-white hover:-translate-y-0.5 transition-transform duration-200">
          <CardContent className="p-5 flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-1.5 text-success font-bold mb-2">
              <div className="p-1.5 bg-success/10 rounded-full shadow-sm shadow-success/20">
                <TrendingUp className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <span className="text-sm">รายรับ</span>
            </div>
            <p className="text-2xl font-bold text-foreground font-number">
              {formatCurrency(summary?.current.income ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white hover:-translate-y-0.5 transition-transform duration-200">
          <CardContent className="p-5 flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-1.5 text-destructive font-bold mb-2">
              <div className="p-1.5 bg-destructive/10 rounded-full shadow-sm shadow-destructive/20">
                <TrendingDown className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <span className="text-sm">รายจ่าย</span>
            </div>
            <p className="text-2xl font-bold text-foreground font-number">
              {formatCurrency(summary?.current.expense ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-md text-primary">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-foreground">บิลประจำเดือน</h2>
          </div>
          <Link
            href="/reminders"
            className="text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            จัดการบิล
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        
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
                          const now = new Date();
                          const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                          const res = await fetch("/api/reminders/paid", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: alert.id, paidMonth: currentMonthStr })
                          });
                          if (res.ok) {
                            load();
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">คำแนะนำจาก AI</h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleGenerateInsights} 
            disabled={generatingInsights}
            className="h-8"
          >
            {generatingInsights ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
            ) : (
              <Sparkles className="h-3 w-3 mr-1.5 text-primary" />
            )}
            {insights.length > 0 ? "วิเคราะห์ใหม่" : "ให้ AI วิเคราะห์"}
          </Button>
        </div>
        {insights.length > 0 ? (
          insights.slice(0, 2).map((insight) => (
            <Card key={insight.id} className="border-none shadow-sm bg-white relative overflow-hidden rounded-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                <Sparkles className="w-24 h-24 text-primary" />
              </div>
              <CardContent className="p-5 relative z-10">
                <p className="text-sm text-foreground/90 leading-relaxed font-medium">{insight.content}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-dashed bg-transparent">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                กดปุ่มด้านบนเพื่อให้ AI ช่วยวิเคราะห์การเงินของคุณ
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">ธุรกรรมล่าสุด</h2>
          <Link
            href="/transactions"
            className="text-xs text-primary hover:underline"
          >
            ดูทั้งหมด
          </Link>
        </div>

        {(summary?.recentTransactions ?? []).length === 0 ? (
          <Card className="border-none shadow-sm bg-white rounded-2xl">
            <CardContent className="flex flex-col items-center gap-3 py-8">
              <Camera className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground font-medium">
                ยังไม่มีธุรกรรม — เริ่มด้วยการถ่ายสลิป
              </p>
              <Link href="/upload">
                <Button size="sm" className="shadow-md rounded-xl">ถ่ายสลิปแรก</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          summary?.recentTransactions.map((tx) => (
            <Card key={tx.id} className="border-none shadow-sm bg-white hover:shadow-md transition-all hover:-translate-y-0.5 rounded-2xl">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-full shadow-sm ${tx.type === 'income' ? 'bg-success/15 text-success shadow-success/20' : 'bg-destructive/15 text-destructive shadow-destructive/20'}`}>
                    {tx.type === 'income' ? <TrendingUp className="w-4 h-4" strokeWidth={2.5}/> : <TrendingDown className="w-4 h-4" strokeWidth={2.5}/>}
                  </div>
                  <div>
                      <div className="text-sm font-medium">{tx.category}</div>
                      <div className="text-xs text-slate-500">
                        {(tx.type === "income" ? tx.sender : tx.receiver) ?? "—"} ·{" "}
                        {formatDate(tx.occurredAt)}
                      </div>
                  </div>
                </div>
                <p
                  className={`text-lg font-bold tracking-tight font-number ${
                    tx.type === "income"
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {tx.type === "income" ? "+" : "-"}
                  {formatCurrency(parseFloat(tx.amount))}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
