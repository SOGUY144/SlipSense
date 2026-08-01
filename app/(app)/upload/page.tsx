"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Upload,
  Loader2,
  CheckCircle2,
  CheckCircle,
  XCircle,
  ScanLine,
  PenLine,
  Banknote,
  Receipt,
  ChevronRight,
} from "lucide-react";
import { triggerHaptic } from "@/lib/utils";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionSchema } from "@/lib/validations/schemas";
import type { z } from "zod";

type FormData = z.infer<typeof transactionSchema>;

interface UploadResult {
  fileName: string;
  status: "pending" | "uploading" | "processing" | "done" | "error";
  jobId?: string;
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [results, setResults] = useState<UploadResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadType, setUploadType] = useState<"slip" | "bill">("slip");
  const [showConfirmDrawer, setShowConfirmDrawer] = useState(false);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "manual") setMode("manual");
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "expense",
      category: "ค่าใช้จ่ายอื่นๆ",
      amount: 0,
      occurredAt: new Date().toISOString(),
    },
  });

  async function onManualSubmit(data: FormData) {
    setSavingManual(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "บันทึกไม่สำเร็จ");
      }
      triggerHaptic("success");
      setShowSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (error: any) {
      alert(error.message || "เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่");
      setSavingManual(false);
    }
  }

  function handleAutoSaveClick(jobIds: string[]) {
    const skipConfirm = localStorage.getItem("skipAutoSaveConfirm");
    if (skipConfirm === "true") {
      handleBatchSave(jobIds);
    } else {
      setShowConfirmDrawer(true);
    }
  }

  function confirmAutoSave() {
    if (doNotShowAgain) localStorage.setItem("skipAutoSaveConfirm", "true");
    setShowConfirmDrawer(false);
    handleBatchSave(doneJobs);
  }

  async function handleBatchSave(jobIds: string[]) {
    if (jobIds.length === 0) return;
    setSavingBatch(true);
    try {
      const res = await fetch("/api/transactions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds }),
      });
      if (!res.ok) throw new Error("Batch save failed");
      triggerHaptic("success");
      setShowSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (e) {
      alert("ไม่สามารถบันทึกได้ กรุณาลองใหม่");
      setSavingBatch(false);
    }
  }

  function pollJobStatus(jobId: string, index: number) {
    let retries = 0;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) throw new Error("Failed to fetch job");
        const data = await res.json();
        const status = data.job.status;
        if (status === "done") {
          setResults((prev) => prev.map((r, i) => (i === index ? { ...r, status: "done" } : r)));
          clearInterval(interval);
          triggerHaptic("success");
        } else if (status === "failed") {
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
            prev.map((r, i) =>
              i === index ? { ...r, status: "error", error: "หมดเวลารอ กรุณาลองใหม่" } : r
            )
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
      formData.append("uploadType", uploadType);
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
  }

  const isWorking = uploading || results.some((r) => r.status === "uploading" || r.status === "processing");
  const doneCount = results.filter((r) => r.status === "done").length;
  const doneJobs = results.filter((r) => r.status === "done" && r.jobId).map((r) => r.jobId as string);

  return (
    <div className="pb-32">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">เพิ่มรายการ</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">สแกนสลิปด้วย AI หรือกรอกข้อมูลเอง</p>
      </div>

      {/* ── Mode Toggle ── */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <button
          onClick={() => setMode("scan")}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border-2 transition-all font-bold text-sm ${
            mode === "scan"
              ? "border-[#43936C] bg-[#43936C] text-white shadow-lg shadow-emerald-500/20"
              : "border-slate-200 bg-white text-slate-500"
          }`}
        >
          <ScanLine className="w-4 h-4 shrink-0" />
          สแกนสลิป
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border-2 transition-all font-bold text-sm ${
            mode === "manual"
              ? "border-[#43936C] bg-[#43936C] text-white shadow-lg shadow-emerald-500/20"
              : "border-slate-200 bg-white text-slate-500"
          }`}
        >
          <PenLine className="w-4 h-4 shrink-0" />
          กรอกเอง
        </button>
      </div>

      {/* ── Manual Mode ── */}
      {mode === "manual" ? (
        <TransactionForm
          form={form}
          onSubmit={onManualSubmit}
          saving={savingManual}
          title="กรอกรายละเอียดรายการ"
          hasBottomNav={true}
        />
      ) : (
        <>
          {/* ── Slip Type Selector ── */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            <button
              onClick={() => setUploadType("slip")}
              className={`flex flex-col items-start gap-1.5 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                uploadType === "slip"
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-100 bg-white"
              }`}
            >
              <Banknote
                className={`w-5 h-5 ${uploadType === "slip" ? "text-emerald-600" : "text-slate-400"}`}
              />
              <div>
                <p className={`text-[13px] font-bold ${uploadType === "slip" ? "text-emerald-800" : "text-slate-700"}`}>
                  สลิปโอนเงิน
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">รับ/จ่าย โอนเงิน</p>
              </div>
              {uploadType === "slip" && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
            <button
              onClick={() => setUploadType("bill")}
              className={`flex flex-col items-start gap-1.5 p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                uploadType === "bill"
                  ? "border-amber-400 bg-amber-50"
                  : "border-slate-100 bg-white"
              }`}
            >
              <Receipt
                className={`w-5 h-5 ${uploadType === "bill" ? "text-amber-600" : "text-slate-400"}`}
              />
              <div>
                <p className={`text-[13px] font-bold ${uploadType === "bill" ? "text-amber-800" : "text-slate-700"}`}>
                  ใบเสร็จ/บิลซื้อของ
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">บิล Makro, ตลาดสด</p>
              </div>
              {uploadType === "bill" && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
          </div>

          {/* ── Upload Drop Zone ── */}
          <button
            className="w-full rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/60 py-10 flex flex-col items-center gap-3 mb-5 cursor-pointer active:scale-[0.99] transition-transform hover:border-slate-300 hover:bg-slate-100/60"
            onClick={() => { triggerHaptic("light"); !isWorking && galleryInputRef.current?.click(); }}
          >
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
              <Upload className="w-6 h-6 text-slate-400" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-bold text-slate-700">
                แตะเพื่อเลือก{uploadType === "slip" ? "สลิป" : "บิล"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">JPEG, PNG, WebP</p>
            </div>
          </button>

          {/* ── Camera / Gallery Buttons ── */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-[#43936C] text-white font-bold text-sm shadow-md shadow-emerald-500/20 active:scale-[0.97] transition-transform disabled:opacity-50 cursor-pointer"
              onClick={() => { triggerHaptic("light"); fileInputRef.current?.click(); }}
              disabled={isWorking}
            >
              <Camera className="w-4 h-4" />
              ถ่ายรูป
            </button>
            <button
              className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-sm shadow-sm active:scale-[0.97] transition-transform disabled:opacity-50 cursor-pointer"
              onClick={() => { triggerHaptic("light"); galleryInputRef.current?.click(); }}
              disabled={isWorking}
            >
              <Upload className="w-4 h-4 text-slate-400" />
              เลือกไฟล์
            </button>
          </div>

          {/* Hidden file inputs */}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple className="hidden" onChange={handleFileChange} />
          <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleFileChange} />

          {/* ── Upload Results ── */}
          {results.length > 0 && (
            <div className="space-y-3">
              {/* Status header */}
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  สถานะ
                </p>
                <p className="text-[11px] font-bold text-slate-500">
                  {isWorking ? "AI กำลังอ่าน..." : `สำเร็จ ${doneCount}/${results.length}`}
                </p>
              </div>

              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                    r.status === "done"
                      ? "bg-emerald-50 border-emerald-100"
                      : r.status === "error"
                      ? "bg-red-50 border-red-100"
                      : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    r.status === "done" ? "bg-emerald-100"
                    : r.status === "error" ? "bg-red-100"
                    : "bg-white border border-slate-200"
                  }`}>
                    {r.status === "done" && <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />}
                    {r.status === "error" && <XCircle className="w-4.5 h-4.5 text-red-500" />}
                    {(r.status === "uploading" || r.status === "processing" || r.status === "pending") && (
                      <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{r.fileName}</p>
                    <p className={`text-[11px] mt-0.5 font-medium ${
                      r.status === "done" ? "text-emerald-600"
                      : r.status === "error" ? "text-red-500"
                      : "text-slate-400"
                    }`}>
                      {r.status === "pending" && "รอคิว..."}
                      {r.status === "uploading" && "กำลังอัปโหลด..."}
                      {r.status === "processing" && "AI กำลังอ่านสลิป..."}
                      {r.status === "done" && "อ่านสำเร็จ"}
                      {r.status === "error" && (r.error || "เกิดข้อผิดพลาด")}
                    </p>
                  </div>
                  {r.status === "done" && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                      สำเร็จ
                    </span>
                  )}
                </div>
              ))}

              {/* ── Action Buttons after scan ── */}
              {!isWorking && doneJobs.length > 0 && (
                <div className="pt-2 space-y-2.5">
                  <button
                    className="w-full flex items-center justify-between px-5 h-[52px] bg-[#43936C] text-white rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform cursor-pointer shadow-md shadow-emerald-500/20"
                    onClick={() => router.push(`/review/batch?jobIds=${doneJobs.join(",")}`)}
                    disabled={savingBatch}
                  >
                    <span>ตรวจสอบ &amp; แก้ไข ({doneCount} ใบ)</span>
                    <ChevronRight className="w-4 h-4 opacity-60" />
                  </button>
                  <button
                    className="w-full flex items-center justify-between px-5 h-[52px] bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform cursor-pointer shadow-sm"
                    onClick={() => {
                      const nextParams = doneJobs.length > 1 ? `?next=${doneJobs.slice(1).join(",")}` : "";
                      router.push(`/review/${doneJobs[0]}${nextParams}`);
                    }}
                    disabled={savingBatch}
                  >
                    <span>ตรวจสอบทีละใบ</span>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                  </button>
                  <button
                    className="w-full flex items-center justify-center gap-2 px-5 h-12 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform cursor-pointer"
                    onClick={() => handleAutoSaveClick(doneJobs)}
                    disabled={savingBatch}
                  >
                    {savingBatch ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {savingBatch ? "กำลังบันทึก..." : `บันทึกอัตโนมัติทันที (${doneCount} ใบ)`}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Success Overlay ── */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl px-10 py-8 flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" strokeWidth={2} />
            </div>
            <p className="font-black text-lg text-slate-900">บันทึกสำเร็จ</p>
          </div>
        </div>
      )}

      {/* ── Confirm Drawer ── */}
      {showConfirmDrawer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-6 shadow-2xl">
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-5" />
            <h3 className="text-lg font-black text-slate-900 text-center mb-1">
              ตรวจสอบสลิปก่อนนะ?
            </h3>
            <p className="text-center text-slate-500 text-sm mb-6 leading-relaxed">
              AI อาจดึงข้อมูลผิดพลาดบางส่วน<br />แนะนำให้ตรวจสอบก่อนบันทึก
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                className="h-12 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm cursor-pointer"
                onClick={() => setShowConfirmDrawer(false)}
              >
                ยกเลิก
              </button>
              <button
                className="h-12 rounded-2xl bg-[#43936C] text-white font-bold text-sm cursor-pointer"
                onClick={confirmAutoSave}
              >
                ตกลง บันทึกเลย
              </button>
            </div>
            <label className="flex items-center justify-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded"
                checked={doNotShowAgain}
                onChange={(e) => setDoNotShowAgain(e.target.checked)}
              />
              <span className="text-xs text-slate-400 font-medium select-none">
                ไม่แสดงอีก
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
