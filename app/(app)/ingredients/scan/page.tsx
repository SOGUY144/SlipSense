"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Loader2,
  CheckCircle2,
  XCircle,
  Receipt,
  ArrowLeft,
  Zap,
  ShoppingCart,
  PackageCheck,
  Sparkles,
} from "lucide-react";
import { triggerHaptic } from "@/lib/utils";
import Link from "next/link";

interface UploadResult {
  fileName: string;
  status: "pending" | "uploading" | "processing" | "done" | "error";
  jobId?: string;
  error?: string;
}

const statusConfig = {
  pending:    { label: "รอคิว...",           color: "text-slate-400" },
  uploading:  { label: "กำลังอัปโหลด...",   color: "text-blue-500" },
  processing: { label: "AI กำลังอ่านบิล...", color: "text-amber-500" },
  done:       { label: "อ่านบิลสำเร็จ",      color: "text-emerald-600" },
  error:      { label: "",                   color: "text-red-500" },
};

export default function IngredientScanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const isWorking =
    uploading || results.some((r) => r.status === "uploading" || r.status === "processing");
  const doneJobs = results.filter((r) => r.status === "done" && r.jobId).map((r) => r.jobId as string);
  const hasResults = results.length > 0;

  function pollJobStatus(jobId: string, index: number) {
    let retries = 0;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) throw new Error("poll failed");
        const data = await res.json();
        if (data.job.status === "done") {
          setResults((prev) => prev.map((r, i) => (i === index ? { ...r, status: "done" } : r)));
          clearInterval(interval);
          triggerHaptic("success");
        } else if (data.job.status === "failed") {
          setResults((prev) =>
            prev.map((r, i) =>
              i === index ? { ...r, status: "error", error: data.job.errorMessage || "ประมวลผลไม่สำเร็จ" } : r
            )
          );
          clearInterval(interval);
        }
      } catch {
        if (++retries >= 30) {
          setResults((prev) =>
            prev.map((r, i) => (i === index ? { ...r, status: "error", error: "หมดเวลารอ กรุณาลองใหม่" } : r))
          );
          clearInterval(interval);
        }
      }
    }, 2000);
  }

  async function processFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    setResults(fileArray.map((f) => ({ fileName: f.name, status: "pending" })));
    setUploading(true);
    for (let i = 0; i < fileArray.length; i++) {
      setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "uploading" } : r)));
      const formData = new FormData();
      formData.append("file", fileArray[i]);
      formData.append("uploadType", "bill");
      try {
        const res = await fetch("/api/slips", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) {
          setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "error", error: data.error } : r)));
          continue;
        }
        setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "processing", jobId: data.job.id } : r)));
        pollJobStatus(data.job.id, i);
      } catch {
        setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "error", error: "อัปโหลดไม่สำเร็จ" } : r)));
      }
    }
    setUploading(false);
  }

  async function handleSave() {
    if (doneJobs.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/transactions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds: doneJobs }),
      });
      if (!res.ok) throw new Error("save failed");
      triggerHaptic("success");
      setShowSuccess(true);
      setTimeout(() => router.push("/recipes"), 1800);
    } catch {
      alert("ไม่สามารถบันทึกได้ กรุณาลองใหม่");
      setSaving(false);
    }
  }

  // ─── Success Screen ────────────────────────────────────────────
  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] gap-6 text-center px-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-900">ซิงก์ราคาเรียบร้อย!</h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
            ระบบอัปเดตราคาวัตถุดิบในคลังจากบิลแล้ว<br />กำลังพาไปหน้าสูตร & ต้นทุน...
          </p>
        </div>
        <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold">
          <Loader2 className="w-4 h-4 animate-spin" />
          กำลังโหลด...
        </div>
      </div>
    );
  }

  // ─── Main Page ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F5F7] -mx-4 -mt-2 px-4 pt-2 pb-36">
      {/* Top Bar */}
      <div className="flex items-center gap-3 pt-2 pb-5">
        <Link href="/dashboard">
          <button className="w-9 h-9 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-500 active:scale-95 transition-transform border border-slate-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-[17px] font-extrabold text-slate-900 leading-tight">สแกนบิลวัตถุดิบ</h1>
          <p className="text-[11px] text-slate-500">AI อัปเดตราคาคลังวัตถุดิบอัตโนมัติ</p>
        </div>
      </div>

      {/* Hero Card — Upload Zone */}
      {!hasResults && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] p-6 text-left shadow-xl shadow-emerald-500/25 active:scale-[0.98] transition-all duration-200 mb-4"
        >
          <div className="flex items-start justify-between mb-8">
            <div className="p-3 bg-white/20 backdrop-blur rounded-2xl">
              <Receipt className="w-7 h-7 text-white" />
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-emerald-100 bg-white/20 px-2.5 py-1 rounded-full">
                ⚡ Auto-Sync
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-white leading-tight">
              แตะเพื่อถ่ายหรือ<br />เลือกบิลวัตถุดิบ
            </h2>
            <p className="text-[12px] text-emerald-100 leading-relaxed">
              บิล Makro · ตลาดสด · ร้านขายส่ง<br />รองรับ JPEG, PNG, WebP
            </p>
          </div>
        </button>
      )}

      {/* Accepted Bill Types */}
      {!hasResults && (
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[
            { icon: ShoppingCart, label: "บิล Makro", sub: "ตลาดขายส่ง", color: "text-blue-500", bg: "bg-blue-50" },
            { icon: Receipt,      label: "ตลาดสด",   sub: "วัตถุดิบสด",  color: "text-amber-500", bg: "bg-amber-50" },
            { icon: PackageCheck, label: "ใบสั่งซื้อ", sub: "ร้านขายส่ง", color: "text-violet-500", bg: "bg-violet-50" },
          ].map(({ icon: Icon, label, sub, color, bg }) => (
            <div
              key={label}
              className="bg-white rounded-2xl p-3.5 text-center shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100/80"
            >
              <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} />
              </div>
              <p className="text-[11px] font-bold text-slate-700">{label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      {!hasResults && (
        <div className="bg-white rounded-2xl p-4 flex gap-3 items-center shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100/80">
          <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            หลังกด <span className="font-bold text-emerald-700">บันทึก</span> ระบบจะซิงก์ราคาวัตถุดิบเข้าคลังโดยอัตโนมัติ ช่วยคำนวณต้นทุนสูตรอาหารแม่นยำขึ้น
          </p>
        </div>
      )}

      {/* Results List */}
      {hasResults && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
            สถานะการประมวลผล
          </p>
          {results.map((r, i) => {
            const cfg = statusConfig[r.status];
            return (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 flex items-center gap-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100/80"
              >
                {/* Status Icon */}
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    r.status === "done"
                      ? "bg-emerald-50"
                      : r.status === "error"
                      ? "bg-red-50"
                      : "bg-amber-50"
                  }`}
                >
                  {r.status === "done" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : r.status === "error" ? (
                    <XCircle className="w-5 h-5 text-red-400" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{r.fileName}</p>
                  <p className={`text-[11px] mt-0.5 font-medium ${cfg.color}`}>
                    {r.status === "error" ? r.error : cfg.label}
                  </p>
                </div>

                {/* Progress pulse */}
                {(r.status === "uploading" || r.status === "processing") && (
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                )}
                {r.status === "done" && (
                  <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                    สำเร็จ
                  </div>
                )}
              </div>
            );
          })}

          {/* Add more button */}
          {!isWorking && (
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-4 text-[12px] font-semibold text-slate-400 hover:border-emerald-300 hover:text-emerald-600 transition-colors active:scale-[0.99]"
            >
              + เพิ่มบิลอีก
            </button>
          )}
        </div>
      )}

      {/* Hidden File Inputs */}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple className="hidden" onChange={(e) => e.target.files && processFiles(e.target.files)} />
      <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => e.target.files && processFiles(e.target.files)} />

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 mx-auto max-w-lg px-4 pb-[calc(88px+env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7]/95 to-transparent">
        {!hasResults || isWorking ? (
          <div className="flex gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isWorking}
              className="flex-1 h-[52px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all"
            >
              {isWorking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              {isWorking ? "กำลังประมวลผล..." : "ถ่ายบิล"}
            </button>
            <button
              onClick={() => galleryInputRef.current?.click()}
              disabled={isWorking}
              className="flex-1 h-[52px] bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
            >
              เลือกไฟล์
            </button>
          </div>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving || doneJobs.length === 0}
            className="w-full h-[52px] bg-gradient-to-r from-emerald-500 to-teal-600 disabled:opacity-50 text-white rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Zap className="w-5 h-5" />
            )}
            บันทึก & ซิงก์ราคาวัตถุดิบ ({doneJobs.length} บิล)
          </button>
        )}
      </div>
    </div>
  );
}
