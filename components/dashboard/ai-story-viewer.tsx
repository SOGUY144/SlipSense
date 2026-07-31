"use client";

import { useState, useEffect } from "react";
import { ChevronRight, Loader2, Sparkles, X, Lightbulb, AlertTriangle, Target } from "lucide-react";

type Insight = {
  id: string;
  content: string;
  metadata: { type: "summary" | "risk" | "action" } | any;
};

interface AiStoryViewerProps {
  insights: Insight[];
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function AiStoryViewer({ insights, onRefresh, isRefreshing }: AiStoryViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto advance timer
  useEffect(() => {
    if (!isOpen || insights.length === 0) return;
    const timer = setTimeout(() => {
      if (currentIndex < insights.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsOpen(false);
        setCurrentIndex(0);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [isOpen, currentIndex, insights.length]);

  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-[1.25rem] shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-50 rounded-lg text-amber-500">
             <Lightbulb className="w-4 h-4" />
          </div>
          <h2 className="text-[14px] font-bold text-slate-800">ให้ AI ช่วยวิเคราะห์</h2>
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

  const currentInsight = insights[currentIndex];
  const type = currentInsight?.metadata?.type || "summary";
  
  // Theme logic based on type
  const theme = {
    summary: { bg: "bg-emerald-500", icon: <Sparkles className="w-16 h-16 text-emerald-100" strokeWidth={1.5} />, title: "ภาพรวมเดือนนี้" },
    risk: { bg: "bg-orange-500", icon: <AlertTriangle className="w-16 h-16 text-orange-100" strokeWidth={1.5} />, title: "จุดที่ต้องระวัง" },
    action: { bg: "bg-blue-500", icon: <Target className="w-16 h-16 text-blue-100" strokeWidth={1.5} />, title: "เป้าหมายแนะนำ" }
  }[type as "summary" | "risk" | "action"] || { bg: "bg-slate-800", icon: <Lightbulb className="w-16 h-16 text-slate-300" strokeWidth={1.5} />, title: "คำแนะนำ" };

  return (
    <>
      <div 
        onClick={() => { setCurrentIndex(0); setIsOpen(true); }}
        className="bg-gradient-to-r from-emerald-500 to-teal-400 rounded-[1.25rem] shadow-md p-4 flex items-center justify-between cursor-pointer hover:shadow-lg transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full text-white backdrop-blur-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-white tracking-wide">คำแนะนำจาก AI พร้อมแล้ว</h2>
            <p className="text-[11px] text-emerald-50 font-medium opacity-90 mt-0.5">แตะเพื่อดูสรุป 3 ข้อสำหรับคุณ</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <ChevronRight className="w-5 h-5 text-white" />
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`relative w-full h-full max-w-md sm:h-[80vh] sm:rounded-[2.5rem] flex flex-col ${theme.bg} transition-colors duration-500 overflow-hidden shadow-2xl`}>
            
            {/* Progress Bars */}
            <div className="absolute top-0 left-0 right-0 p-4 pt-12 sm:pt-6 flex gap-1.5 z-20">
              {insights.map((_, idx) => (
                <div key={idx} className="h-1.5 flex-1 bg-black/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full ease-linear"
                    style={{ 
                      width: idx < currentIndex ? "100%" : idx === currentIndex ? "100%" : "0%",
                      transitionProperty: "width",
                      transitionDuration: idx === currentIndex ? "5000ms" : "150ms"
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header Controls */}
            <div className="absolute top-16 sm:top-10 right-4 z-20">
              <button onClick={() => setIsOpen(false)} className="p-2.5 bg-black/20 hover:bg-black/30 rounded-full text-white backdrop-blur-md transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tap Areas */}
            <div className="absolute inset-0 flex z-10">
              <div className="w-1/3 h-full cursor-pointer" onClick={(e) => {
                e.stopPropagation();
                if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
              }} />
              <div className="w-2/3 h-full cursor-pointer" onClick={(e) => {
                e.stopPropagation();
                if (currentIndex < insights.length - 1) setCurrentIndex(prev => prev + 1);
                else setIsOpen(false);
              }} />
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center pointer-events-none z-10">
              <div className="mb-8 drop-shadow-xl animate-in slide-in-from-bottom-8 duration-700 fade-in-0">
                {theme.icon}
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white/90 mb-4 tracking-tight animate-in slide-in-from-bottom-6 duration-700 delay-100 fade-in-0 fill-mode-both">
                {theme.title}
              </h3>
              <p className="text-2xl md:text-3xl font-extrabold text-white leading-tight animate-in slide-in-from-bottom-4 duration-700 delay-200 fade-in-0 fill-mode-both">
                {currentInsight.content}
              </p>
            </div>

            <div className="pb-12 text-center z-10 pointer-events-none">
               <p className="text-white/60 text-[13px] font-semibold tracking-wide">แตะซ้าย-ขวาเพื่อเลื่อนหน้า</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
