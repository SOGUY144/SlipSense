"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Camera, TrendingUp, TrendingDown, Wallet, Loader2, Sparkles, Bell, Calendar, ChevronRight } from "lucide-react";
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
          <p className="text-5xl font-extrabold text-white tracking-tight drop-shadow-sm">
            {formatCurrency(summary?.current.profit ?? 0)}
          </p>
          <div className="flex items-center gap-2 mt-3 text-sm font-medium text-white/70">
            <span>เทียบเดือนก่อน</span>
            <span className="text-white/90 font-semibold">{formatCurrency(summary?.previous.profit ?? 0)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border border-success/20 shadow-md shadow-success/5 bg-gradient-to-br from-success/5 to-card hover:-translate-y-0.5 transition-transform duration-200">
          <CardContent className="p-5 flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-1.5 text-success font-bold mb-2">
              <div className="p-1.5 bg-success/10 rounded-full">
                <TrendingUp className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <span className="text-sm">รายรับ</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(summary?.current.income ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-destructive/20 shadow-md shadow-destructive/5 bg-gradient-to-br from-destructive/5 to-card hover:-translate-y-0.5 transition-transform duration-200">
          <CardContent className="p-5 flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-1.5 text-destructive font-bold mb-2">
              <div className="p-1.5 bg-destructive/10 rounded-full">
                <TrendingDown className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <span className="text-sm">รายจ่าย</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(summary?.current.expense ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/50 shadow-md bg-card overflow-hidden hover:shadow-lg transition-shadow duration-200">
        <div className="p-4 border-b flex items-center justify-between bg-primary/5">
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
            <div className="p-3 px-4 flex items-center justify-between text-center bg-card">
              <div className="flex items-center gap-2 text-success">
                <div className="w-6 h-6 bg-success/10 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <p className="text-sm font-bold">ไม่มีบิลใกล้ถึงกำหนด</p>
              </div>
              <p className="text-xs font-medium text-muted-foreground">พักผ่อนได้เลย 🎉</p>
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
            <Card key={insight.id} className="border border-primary/20 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Sparkles className="w-16 h-16 text-primary" />
              </div>
              <CardContent className="p-4 relative z-10">
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
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8">
              <Camera className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                ยังไม่มีธุรกรรม — เริ่มด้วยการถ่ายสลิป
              </p>
              <Link href="/upload">
                <Button size="sm">ถ่ายสลิปแรก</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          summary?.recentTransactions.map((tx) => (
            <Card key={tx.id} className="border border-border/40 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 bg-card">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-full ${tx.type === 'income' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {tx.type === 'income' ? <TrendingUp className="w-4 h-4" strokeWidth={2.5}/> : <TrendingDown className="w-4 h-4" strokeWidth={2.5}/>}
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">{tx.category}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">
                      {tx.counterparty ?? "—"} ·{" "}
                      {formatDate(tx.occurredAt)}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-lg font-bold tracking-tight ${
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
