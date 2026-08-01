"use client";

import { Loader2, Sparkles, AlertTriangle, Target, Lightbulb, RefreshCw } from "lucide-react";

type Insight = {
  id: string;
  content: string;
  metadata?: { type: "summary" | "risk" | "action" } | any;
};

interface AiFeedViewerProps {
  insights: Insight[];
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function AiFeedViewer({ insights, onRefresh, isRefreshing }: AiFeedViewerProps) {
  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-[1.25rem] shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-500">
             <Lightbulb className="w-4 h-4" />
          </div>
          <h2 className="text-[14px] font-bold text-slate-800">ผู้ช่วยวิเคราะห์การเงิน (AI)</h2>
        </div>
        <button 
          onClick={onRefresh} 
          disabled={isRefreshing}
          className="text-[11px] font-bold bg-[#43936C] text-white px-3 py-1.5 rounded-full hover:bg-[#367a59] transition-colors flex items-center gap-1"
        >
          {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          วิเคราะห์เลย
        </button>
      </div>
    );
  }

  const getTheme = (type: string) => {
    switch (type) {
      case "summary":
        return {
          bg: "bg-blue-50/50",
          border: "border-blue-100",
          iconBg: "bg-blue-100",
          iconColor: "text-blue-600",
          icon: <Sparkles className="w-4 h-4" />,
          title: "ภาพรวมสถานะการเงิน"
        };
      case "risk":
        return {
          bg: "bg-red-50/50",
          border: "border-red-100",
          iconBg: "bg-red-100",
          iconColor: "text-red-600",
          icon: <AlertTriangle className="w-4 h-4" />,
          title: "ความเสี่ยงและข้อควรระวัง"
        };
      case "action":
        return {
          bg: "bg-purple-50/50",
          border: "border-purple-100",
          iconBg: "bg-purple-100",
          iconColor: "text-purple-600",
          icon: <Target className="w-4 h-4" />,
          title: "คำแนะนำที่ควรทำทันที"
        };
      default:
        return {
          bg: "bg-slate-50/50",
          border: "border-slate-100",
          iconBg: "bg-slate-100",
          iconColor: "text-slate-600",
          icon: <Lightbulb className="w-4 h-4" />,
          title: "คำแนะนำเพิ่มเติม"
        };
    }
  };

  return (
    <div className="bg-white rounded-[1.25rem] shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-100 rounded-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <h2 className="text-[13px] font-bold text-slate-800">
            SlipSense AI Analysis
          </h2>
        </div>
        <button 
          onClick={onRefresh} 
          disabled={isRefreshing}
          className="text-[10px] font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors px-2 py-1 bg-white border border-slate-200 rounded-md shadow-sm active:scale-95"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          อัปเดตข้อมูล
        </button>
      </div>

      {/* Feed Content */}
      <div className="p-3 flex flex-col gap-2.5">
        {insights.map((insight, idx) => {
          const theme = getTheme(insight.metadata?.type || "summary");
          return (
            <div 
              key={insight.id || idx}
              className={`p-3.5 rounded-xl border ${theme.bg} ${theme.border} flex items-start gap-3 transition-all hover:shadow-sm`}
            >
              <div className={`p-2 rounded-full shrink-0 mt-0.5 ${theme.iconBg} ${theme.iconColor}`}>
                {theme.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-[12px] font-bold mb-1 ${theme.iconColor}`}>
                  {theme.title}
                </h3>
                <p className="text-[12px] text-slate-700 leading-[1.6] whitespace-pre-wrap font-medium">
                  {insight.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
