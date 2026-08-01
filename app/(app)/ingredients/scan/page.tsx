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
  ChevronRight,
  ImagePlus,
  ScanLine,
} from "lucide-react";
import { triggerHaptic } from "@/lib/utils";
import Link from "next/link";

interface UploadResult {
  fileName: string;
  status: "pending" | "uploading" | "processing" | "done" | "error";
  jobId?: string;
  error?: string;
  thumbnail?: string;
}

type Step = "idle" | "results" | "success";

export default function IngredientScanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<Step>("idle");

  const isWorking =
    uploading || results.some((r) => r.status === "uploading" || r.status === "processing");
  const doneJobs = results.filter((r) => r.status === "done" && r.jobId).map((r) => r.jobId as string);
  const allDone = results.length > 0 && results.every((r) => r.status === "done" || r.status === "error");

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
            prev.map((r, i) => (i === index ? { ...r, status: "error", error: "หมดเวลารอ" } : r))
          );
          clearInterval(interval);
        }
      }
    }, 2000);
  }

  async function processFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    const thumbnails = await Promise.all(
      fileArray.map(
        (f) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(f);
          })
      )
    );
    setResults(
      fileArray.map((f, idx) => ({ fileName: f.name, status: "pending", thumbnail: thumbnails[idx] }))
    );
    setStep("results");
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
          setResults((prev) =>
            prev.map((r, idx) => (idx === i ? { ...r, status: "error", error: data.error } : r))
          );
          continue;
        }
        setResults((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: "processing", jobId: data.job.id } : r))
        );
        pollJobStatus(data.job.id, i);
      } catch {
        setResults((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: "error", error: "อัปโหลดไม่สำเร็จ" } : r))
        );
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
      setStep("success");
      setTimeout(() => router.push("/recipes"), 2000);
    } catch {
      alert("ไม่สามารถบันทึกได้ กรุณาลองใหม่");
      setSaving(false);
    }
  }

  // ═══════════════════════════════════════
  // SUCCESS SCREEN
  // ═══════════════════════════════════════
  if (step === "success") {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-8 px-8 z-50">
        {/* Animated checkmark */}
        <div className="relative flex items-center justify-center">
          <div className="w-28 h-28 rounded-full bg-emerald-50 animate-ping absolute opacity-20" />
          <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center relative">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" strokeWidth={1.5} />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">ซิงก์เรียบร้อย</h2>
          <p className="text-[13px] text-slate-500 leading-relaxed">
            ราคาวัตถุดิบถูกอัปเดตในคลังแล้ว<br />กำลังพาไปหน้าสูตร & ต้นทุน
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-emerald-400"
              style={{ animationDelay: `${i * 0.15}s`, animation: "pulse 1s infinite" }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // RESULTS SCREEN
  // ═══════════════════════════════════════
  if (step === "results") {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-lg border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => { setStep("idle"); setResults([]); }}
            className="flex items-center gap-1.5 text-slate-500 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            ยกเลิก
          </button>
          <span className="text-sm font-bold text-slate-800">
            {results.length} บิล
          </span>
          <button
            onClick={() => galleryInputRef.current?.click()}
            disabled={isWorking}
            className="text-emerald-600 text-sm font-bold disabled:opacity-40"
          >
            + เพิ่ม
          </button>
        </div>

        {/* Bill Grid */}
        <div className="flex-1 p-4 grid grid-cols-2 gap-3 pb-40">
          {results.map((r, i) => (
            <div key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100">
              {/* Thumbnail */}
              {r.thumbnail && (
                <img
                  src={r.thumbnail}
                  alt="bill"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Overlay based on status */}
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center transition-all ${
                  r.status === "done"
                    ? "bg-emerald-900/40"
                    : r.status === "error"
                    ? "bg-red-900/50"
                    : "bg-slate-900/50"
                }`}
              >
                {r.status === "done" && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                    <CheckCircle2 className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>
                )}
                {r.status === "error" && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                    <XCircle className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>
                )}
                {(r.status === "uploading" || r.status === "processing" || r.status === "pending") && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                    <Loader2 className="w-8 h-8 text-white animate-spin" strokeWidth={2} />
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5">
                <div
                  className={`w-full py-1.5 rounded-xl text-center text-[10px] font-bold backdrop-blur-sm ${
                    r.status === "done"
                      ? "bg-emerald-500/80 text-white"
                      : r.status === "error"
                      ? "bg-red-500/80 text-white"
                      : "bg-white/20 text-white"
                  }`}
                >
                  {r.status === "done" && "อ่านสำเร็จ ✓"}
                  {r.status === "error" && "ล้มเหลว ✗"}
                  {r.status === "uploading" && "อัปโหลด..."}
                  {r.status === "processing" && "AI อ่านบิล..."}
                  {r.status === "pending" && "รอคิว..."}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 mx-auto max-w-lg px-4 pb-[calc(80px+env(safe-area-inset-bottom))] pt-4 bg-white border-t border-slate-100">
          {isWorking ? (
            <div className="flex items-center justify-center gap-2 py-3 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              AI กำลังอ่านบิล กรุณารอสักครู่...
            </div>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving || doneJobs.length === 0}
              className="w-full h-[52px] bg-slate-900 disabled:bg-slate-300 text-white rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  ซิงก์ราคาวัตถุดิบ
                  <span className="ml-1 text-[11px] font-normal bg-white/20 px-2 py-0.5 rounded-full">
                    {doneJobs.length} บิล
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => e.target.files && processFiles(e.target.files)} />
      </div>
    );
  }

  // ═══════════════════════════════════════
  // IDLE / LANDING SCREEN
  // ═══════════════════════════════════════
  return (
    <div className="min-h-screen flex flex-col">
      {/* Back button */}
      <div className="px-1 pt-2 pb-4">
        <Link href="/dashboard">
          <button className="flex items-center gap-1 text-[13px] font-medium text-slate-500 active:opacity-60">
            <ArrowLeft className="w-4 h-4" />
            กลับ
          </button>
        </Link>
      </div>

      {/* Big Title Block */}
      <div className="px-1 mb-8">
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold text-emerald-700">Auto-Sync ราคาวัตถุดิบ</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 leading-tight tracking-tight">
          สแกน<br />บิลวัตถุดิบ
        </h1>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          ถ่ายหรือเลือกบิลซื้อของ AI จะอ่านราคา<br />แล้วอัปเดตคลังวัตถุดิบให้ทันที
        </p>
      </div>

      {/* How it works — 3 Steps */}
      <div className="px-1 mb-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">วิธีใช้งาน</p>
        <div className="space-y-0">
          {[
            { n: "1", title: "ถ่ายหรือเลือกบิล", sub: "บิล Makro, ตลาดสด, ร้านขายส่ง" },
            { n: "2", title: "AI อ่านราคา", sub: "ประมวลผลในไม่กี่วินาที" },
            { n: "3", title: "ซิงก์อัตโนมัติ", sub: "คลังวัตถุดิบอัปเดตทันที" },
          ].map((item, idx, arr) => (
            <div key={item.n} className="flex items-stretch gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-[13px] font-black flex items-center justify-center shrink-0">
                  {item.n}
                </div>
                {idx < arr.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
              </div>
              <div className="pb-5 pt-1 min-w-0">
                <p className="text-[14px] font-bold text-slate-800">{item.title}</p>
                <p className="text-[12px] text-slate-400 mt-0.5">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Supported Bill Types */}
      <div className="px-1 mb-8">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">ประเภทบิลที่รองรับ</p>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {["บิล Makro", "ตลาดสด", "บิลขายส่ง", "ใบเสร็จร้านค้า", "ใบสั่งซื้อ"].map((label) => (
            <span
              key={label}
              className="shrink-0 px-3 py-1.5 border border-slate-200 rounded-full text-[12px] font-medium text-slate-600 bg-white"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Action Buttons */}
      <div className="px-0 pb-[calc(88px+env(safe-area-inset-bottom))] space-y-2.5">
        {/* Primary — Camera */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-[56px] bg-slate-900 text-white rounded-2xl font-bold text-[15px] flex items-center justify-between px-5 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <Camera className="w-5 h-5" />
            ถ่ายบิล
          </div>
          <ChevronRight className="w-4 h-4 opacity-50" />
        </button>

        {/* Secondary — Gallery */}
        <button
          onClick={() => galleryInputRef.current?.click()}
          className="w-full h-[52px] border-2 border-slate-200 text-slate-700 rounded-2xl font-bold text-[15px] flex items-center justify-between px-5 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <ImagePlus className="w-5 h-5 text-slate-400" />
            เลือกจากคลังรูป
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </button>
      </div>

      {/* Hidden Inputs */}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple className="hidden" onChange={(e) => e.target.files && processFiles(e.target.files)} />
      <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => e.target.files && processFiles(e.target.files)} />
    </div>
  );
}
