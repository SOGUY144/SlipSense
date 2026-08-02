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
} from "lucide-react";
import { triggerHaptic } from "@/lib/utils";
import { compressImageForUpload } from "@/lib/image-compress";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface UploadResult {
  fileName: string;
  status: "pending" | "uploading" | "processing" | "done" | "error";
  jobId?: string;
  error?: string;
}

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
  const doneJobs = results
    .filter((r) => r.status === "done" && r.jobId)
    .map((r) => r.jobId as string);
  const hasResults = results.length > 0;

  function pollJobStatus(jobId: string, index: number) {
    let retries = 0;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) throw new Error("poll failed");
        const data = await res.json();
        const status = data.job.status;
        if (status === "done") {
          setResults((prev) =>
            prev.map((r, i) => (i === index ? { ...r, status: "done" } : r))
          );
          clearInterval(interval);
          triggerHaptic("success");
        } else if (status === "failed") {
          setResults((prev) =>
            prev.map((r, i) =>
              i === index
                ? { ...r, status: "error", error: data.job.errorMessage || "ประมวลผลไม่สำเร็จ" }
                : r
            )
          );
          clearInterval(interval);
        }
      } catch {
        retries++;
        if (retries >= 40) {
          setResults((prev) =>
            prev.map((r, i) =>
              i === index ? { ...r, status: "error", error: "หมดเวลารอ กรุณาลองใหม่" } : r
            )
          );
          clearInterval(interval);
        }
      }
    }, 600);
  }

  async function processFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    setResults(fileArray.map((f) => ({ fileName: f.name, status: "pending" })));
    setUploading(true);

    for (let i = 0; i < fileArray.length; i++) {
      setResults((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "uploading" } : r))
      );

      try {
        const compressedFile = await compressImageForUpload(fileArray[i]);
        const formData = new FormData();
        formData.append("file", compressedFile);
        formData.append("uploadType", "bill");

        const res = await fetch("/api/slips", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) {
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: "error", error: data.error } : r
            )
          );
          continue;
        }
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "processing", jobId: data.job.id } : r
          )
        );
        pollJobStatus(data.job.id, i);
      } catch {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "error", error: "อัปโหลดไม่สำเร็จ" } : r
          )
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
      setShowSuccess(true);
      setTimeout(() => router.push("/recipes"), 1800);
    } catch {
      alert("ไม่สามารถบันทึกได้ กรุณาลองใหม่");
      setSaving(false);
    }
  }

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5 text-center px-6">
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">อัปเดตราคาวัตถุดิบแล้ว!</h2>
          <p className="text-sm text-slate-500 mt-1">
            ระบบซิงก์ราคาวัตถุดิบจากบิลเรียบร้อยแล้ว กำลังพาไปหน้าสูตร &amp; ต้นทุน...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">สแกนบิลวัตถุดิบ</h1>
          <p className="text-[11px] text-slate-500">
            AI จะดึงราคาวัตถุดิบจากบิลและอัปเดตคลังวัตถุดิบให้อัตโนมัติ
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3 items-start">
        <div className="p-2 bg-emerald-100 rounded-xl shrink-0">
          <Zap className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-emerald-800">Auto-Sync ราคาวัตถุดิบ</p>
          <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
            หลังบันทึก ระบบจะอัปเดตราคาวัตถุดิบในคลังโดยอัตโนมัติ
            ช่วยคำนวณต้นทุนสูตรอาหารให้แม่นยำขึ้น
          </p>
        </div>
      </div>

      {/* Tips */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: ShoppingCart, label: "บิล Makro", sub: "ตลาดขายส่ง" },
          { icon: Receipt, label: "บิลตลาดสด", sub: "ซื้อวัตถุดิบสด" },
          { icon: PackageCheck, label: "ใบสั่งซื้อ", sub: "ร้านขายส่ง" },
        ].map(({ icon: Icon, label, sub }) => (
          <div
            key={label}
            className="bg-white border border-slate-100 rounded-2xl p-3 text-center shadow-xs"
          >
            <Icon className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
            <p className="text-[11px] font-semibold text-slate-700">{label}</p>
            <p className="text-[10px] text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Upload Zone */}
      {!hasResults && (
        <div
          className="border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50/40 flex flex-col items-center justify-center gap-3 py-12 px-6 cursor-pointer active:scale-[0.99] transition-transform"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <Receipt className="w-7 h-7 text-emerald-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-700">แตะเพื่อถ่ายหรือเลือกบิล</p>
            <p className="text-[11px] text-slate-400 mt-0.5">รองรับ JPEG, PNG, WebP</p>
          </div>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-2.5">
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl p-3.5 shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                {r.status === "done" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : r.status === "error" ? (
                  <XCircle className="w-5 h-5 text-red-400" />
                ) : (
                  <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{r.fileName}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {r.status === "pending" && "รอคิว..."}
                  {r.status === "uploading" && "กำลังอัปโหลด..."}
                  {r.status === "processing" && "AI กำลังอ่านบิล..."}
                  {r.status === "done" && "อ่านบิลสำเร็จ"}
                  {r.status === "error" && r.error}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && processFiles(e.target.files)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && processFiles(e.target.files)}
      />

      {/* Action Buttons */}
      <div className="fixed bottom-20 left-0 right-0 mx-auto max-w-lg px-4 flex gap-3">
        {!hasResults || isWorking ? (
          <>
            <Button
              className="flex-1 bg-[#43936C] hover:bg-[#367a59] text-white rounded-2xl h-12 gap-2 font-bold shadow-lg shadow-emerald-500/20"
              onClick={() => fileInputRef.current?.click()}
              disabled={isWorking}
            >
              <Camera className="w-5 h-5" />
              ถ่ายบิล
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-2xl h-12 gap-2 font-bold border-slate-200"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isWorking}
            >
              เลือกไฟล์
            </Button>
          </>
        ) : (
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-12 gap-2 font-bold text-sm shadow-lg shadow-emerald-500/20"
            onClick={handleSave}
            disabled={saving || doneJobs.length === 0}
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Zap className="w-5 h-5" />
            )}
            บันทึก &amp; ซิงก์ราคาวัตถุดิบ ({doneJobs.length} บิล)
          </Button>
        )}
      </div>
    </div>
  );
}