"use client";

import React, { useState } from "react";
import {
  ComposedChart,
  AreaChart,
  BarChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Wallet, Receipt, PieChart as PieIcon, CalendarDays, BarChart4, X, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#f43f5e", // rose-500
];

interface MonthlyData {
  monthLabel: string;
  income: number;
  expense: number;
  profit: number;
}

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
}

interface DailyTrend {
  day: string;
  income: number;
  expense: number;
}

interface DayOfWeekTrend {
  dayName: string;
  income: number;
  topDates?: { date: string; income: number }[];
}

interface AnalyticsChartsProps {
  monthly: MonthlyData[];
  categoryBreakdown: CategoryData[];
  dailyTrend?: DailyTrend[];
  dayOfWeekTrend?: DayOfWeekTrend[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-md border border-border p-4 rounded-xl shadow-xl">
        <p className="font-bold text-base mb-3 border-b pb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full shadow-sm" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-bold">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl flex items-center gap-3">
        <div 
          className="w-4 h-4 rounded-full shadow-sm" 
          style={{ backgroundColor: payload[0].color }}
        />
        <div>
          <p className="font-bold text-sm">{data.category}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.amount)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function AnalyticsCharts({
  monthly,
  categoryBreakdown,
  dailyTrend = [],
  dayOfWeekTrend = [],
}: AnalyticsChartsProps) {
  const [selectedDow, setSelectedDow] = useState<DayOfWeekTrend | null>(null);

  return (
    <div className="space-y-8 pb-8">
      {/* Composed Chart Section (Monthly) */}
      <Card className="border-none shadow-md bg-gradient-to-b from-card to-muted/20">
        <div className="p-5 border-b flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold">แนวโน้มรายรับ-รายจ่าย และกำไร</h2>
            <p className="text-xs text-muted-foreground">ย้อนหลัง 6 เดือนล่าสุด</p>
          </div>
        </div>
        <div className="p-5">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthly} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 12, fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} allowEscapeViewBox={{ x: false, y: true }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 500 }} />
                <Bar dataKey="income" name="รายรับ" fill="url(#colorIncome)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expense" name="รายจ่าย" fill="url(#colorExpense)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  name="กำไรสุทธิ" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Daily Trend Section */}
      {dailyTrend.length > 0 && (
        <Card className="border-none shadow-md bg-gradient-to-b from-card to-muted/20">
          <div className="p-5 border-b flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold">รายรับ-รายจ่ายรายวัน (เดือนนี้)</h2>
              <p className="text-xs text-muted-foreground">ดูความเคลื่อนไหวรายวัน</p>
            </div>
          </div>
          <div className="p-5">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="areaExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 10 }} 
                    tickFormatter={(v) => v.split(" ")[0]}
                    tickLine={false} 
                    axisLine={false} 
                    dy={10} 
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} 
                    tickLine={false} 
                    axisLine={false} 
                    dx={-10} 
                  />
                  <Tooltip content={<CustomTooltip />} allowEscapeViewBox={{ x: false, y: true }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 500 }} />
                  <Area type="monotone" dataKey="income" name="รายรับ" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#areaIncome)" />
                  <Area type="monotone" dataKey="expense" name="รายจ่าย" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#areaExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Category Breakdown Section */}
        {categoryBreakdown.length > 0 && (
          <Card className="border-none shadow-md bg-gradient-to-b from-card to-muted/20">
            <div className="p-5 border-b flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <PieIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold">สัดส่วนค่าใช้จ่าย (เดือนนี้)</h2>
                <p className="text-xs text-muted-foreground">แยกตามหมวดหมู่</p>
              </div>
            </div>
            
            <div className="p-5 flex flex-col items-center gap-6">
              <div className="h-48 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      stroke="none"
                    >
                      {categoryBreakdown.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          className="hover:opacity-80 transition-opacity duration-300 outline-none"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} wrapperStyle={{ zIndex: 50 }} allowEscapeViewBox={{ x: false, y: true }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text for Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-muted-foreground font-medium">รวม</span>
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrency(categoryBreakdown.reduce((sum, item) => sum + item.amount, 0))}
                  </span>
                </div>
              </div>

              <div className="w-full space-y-2">
                {categoryBreakdown.map((item, i) => (
                  <div
                    key={item.category}
                    className="group flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full shadow-sm"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <div>
                        <p className="text-sm font-semibold">{item.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCurrency(item.amount)}</p>
                      <p className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Day of Week Trend Section */}
        {dayOfWeekTrend.length > 0 && (
          <Card className="border-none shadow-md bg-gradient-to-b from-card to-muted/20">
            <div className="p-5 border-b flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart4 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold">วันขายดี (รวม 6 เดือน)</h2>
                <p className="text-xs text-muted-foreground">รายรับรวมตามวันในสัปดาห์</p>
              </div>
            </div>
            <div className="px-5 pt-3 -mb-2">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 bg-primary/5 p-2 rounded-md">
                <Info className="w-3 h-3 text-primary shrink-0" /> 
                <span>กดที่แท่งกราฟเพื่อดู <strong>รายละเอียด</strong> ของแต่ละวันได้เลย</span>
              </p>
            </div>
            <div className="p-5">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayOfWeekTrend} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                    <XAxis 
                      type="number" 
                      tick={{ fontSize: 11 }} 
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      dataKey="dayName" 
                      type="category" 
                      tick={{ fontSize: 12, fontWeight: 500 }} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} allowEscapeViewBox={{ x: false, y: true }} />
                    <Bar 
                      dataKey="income" 
                      name="รายรับรวม" 
                      fill="#3b82f6" 
                      radius={[0, 4, 4, 0]} 
                      barSize={24}
                      onClick={(data) => setSelectedDow(data.payload as DayOfWeekTrend)}
                      cursor="pointer"
                    >
                      {dayOfWeekTrend.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Dow Details Modal */}
      {selectedDow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-3xl p-6 flex flex-col gap-4 shadow-2xl animate-in zoom-in-95 duration-200 w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <BarChart4 className="w-5 h-5 text-primary" />
                วัน{selectedDow.dayName.replace('.', '')}ที่ขายดี
              </h3>
              <button onClick={() => setSelectedDow(null)} className="p-1.5 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="space-y-3 mt-2">
              <p className="text-sm text-muted-foreground">วันที่ทำรายรับได้สูงสุด (Top 5):</p>
              {selectedDow.topDates && selectedDow.topDates.length > 0 ? (
                <div className="space-y-2">
                  {selectedDow.topDates.map((d, i) => {
                    const dateObj = new Date(d.date);
                    const formattedDate = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(dateObj);
                    return (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                            {i + 1}
                          </div>
                          <span className="text-sm font-medium">{formattedDate}</span>
                        </div>
                        <span className="font-bold text-success font-number">
                          {formatCurrency(d.income)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-4 bg-muted/20 rounded-xl text-muted-foreground text-sm">
                  ไม่มีข้อมูลสำหรับวันนี้
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
