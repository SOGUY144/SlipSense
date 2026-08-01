"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, Sparkles, AlertTriangle, Target, Lightbulb, RefreshCw, X, ChevronRight } from "lucide-react";

type Insight = {
  id: string;
  content: string;
  metadata?: { type: "summary" | "risk" | "action" } | Record<string, unknown>;
};

interface AiFeedViewerProps {
  insights: Insight[];
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function AiFeedViewer({ insights, onRefresh, isRefreshing }: AiFeedViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) return null;

  return (
    <>
      {/* 1. Trigger Card on Dashboard */}
      <div 
        onClick={() => setIsOpen(true)}
        className="bg-white/70 backdrop-blur-md rounded-[1.25rem] shadow-sm border border-slate-100 p-4 cursor-pointer hover:bg-white/90 transition-all relative overflow-hidden group"
      >
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/10 blur-xl rounded-full"></div>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <Sparkles className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-slate-800">SlipSense AI Analysis</h2>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                {insights.length === 0 ? "แตะเพื่อเริ่มวิเคราะห์ข้อมูลร้าน" : "สรุปข้อมูลร้านให้คุณแล้ว แตะเพื่ออ่าน"}
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
          </div>
        </div>
      </div>

      {/* 2. Bottom Sheet Modal via Portal */}
      {isOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Sheet Content */}
          <div className="relative bg-[#F5F5F7] w-full max-w-lg mx-auto rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-full duration-300 ease-out">
            
            {/* Sheet Header */}
            <div className="flex items-center justify-between p-5 bg-white rounded-t-3xl border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-50 rounded-xl">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">AI Analysis</h2>
                  <p className="text-[10px] text-slate-500 font-medium">อัปเดตล่าสุดวันนี้</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={onRefresh} 
                  disabled={isRefreshing}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sheet Body (Scrollable) */}
            <div className="p-4 overflow-y-auto pb-8">
              {insights.length === 0 ? (
                 <div className="text-center py-12">
                   <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Sparkles className="w-8 h-8 text-indigo-300" />
                   </div>
                   <h3 className="text-sm font-bold text-slate-700 mb-2">ยังไม่มีผลวิเคราะห์</h3>
                   <p className="text-xs text-slate-500 mb-6 max-w-[250px] mx-auto">AI พร้อมช่วยคุณวิเคราะห์ข้อมูลรายรับ-รายจ่ายแล้ว กดปุ่มด้านล่างเพื่อเริ่มเลย</p>
                   <button 
                     onClick={onRefresh} 
                     disabled={isRefreshing}
                     className="text-[13px] font-bold bg-[#43936C] text-white px-6 py-2.5 rounded-xl hover:bg-[#367a59] transition-all flex items-center gap-2 mx-auto shadow-sm shadow-[#43936C]/20"
                   >
                     {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                     วิเคราะห์เลย
                   </button>
                 </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {insights.map((insight, idx) => {
                    const theme = getTheme(insight.metadata?.type || "summary");
                    return (
                      <div 
                        key={insight.id || idx}
                        className={`p-4 rounded-[1.25rem] bg-white border ${theme.border} flex flex-col gap-3 shadow-sm`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${theme.iconBg} ${theme.iconColor}`}>
                            {theme.icon}
                          </div>
                          <h3 className={`text-[13px] font-bold ${theme.iconColor}`}>
                            {theme.title}
                          </h3>
                        </div>
                        <p className="text-[13px] text-slate-600 leading-[1.6] whitespace-pre-wrap font-medium pl-1">
                          {insight.content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
