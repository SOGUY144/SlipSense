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
                ? { ...r, status: "error", error: data.job.errorMessage || "เธเธฃเธฐเธกเธงเธฅเธเธฅเนเธกเนเธชเธณเน€เธฃเนเธ" }
                : r
            )
          );
          clearInterval(interval);
        }
      } catch {
        retries++;
        if (retries >= 30) {
          setResults((prev) =>
            prev.map((r, i) =>
              i === index ? { ...r, status: "error", error: "เธซเธกเธ”เน€เธงเธฅเธฒเธฃเธญ เธเธฃเธธเธ“เธฒเธฅเธญเธเนเธซเธกเน" } : r
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
      setResults((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "uploading" } : r))
      );

      const formData = new FormData();
      formData.append("file", fileArray[i]);
      formData.append("uploadType", "bill"); // always bill for ingredient scan

      try {
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
            idx === i ? { ...r, status: "error", error: "เธญเธฑเธเนเธซเธฅเธ”เนเธกเนเธชเธณเน€เธฃเนเธ" } : r
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
      alert("เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธเธฑเธเธ—เธถเธเนเธ”เน เธเธฃเธธเธ“เธฒเธฅเธญเธเนเธซเธกเน");
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
          <h2 className="text-xl font-bold text-slate-900">เธญเธฑเธเน€เธ”เธ•เธฃเธฒเธเธฒเธงเธฑเธ•เธ–เธธเธ”เธดเธเนเธฅเนเธง!</h2>
          <p className="text-sm text-slate-500 mt-1">
            เธฃเธฐเธเธเธเธดเธเธเนเธฃเธฒเธเธฒเธงเธฑเธ•เธ–เธธเธ”เธดเธเธเธฒเธเธเธดเธฅเน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง เธเธณเธฅเธฑเธเธเธฒเนเธเธซเธเนเธฒเธชเธนเธ•เธฃ & เธ•เนเธเธ—เธธเธ...
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
          <h1 className="text-lg font-bold text-slate-900">เธชเนเธเธเธเธดเธฅเธงเธฑเธ•เธ–เธธเธ”เธดเธ</h1>
          <p className="text-[11px] text-slate-500">
            AI เธเธฐเธ”เธถเธเธฃเธฒเธเธฒเธงเธฑเธ•เธ–เธธเธ”เธดเธเธเธฒเธเธเธดเธฅเนเธฅเธฐเธญเธฑเธเน€เธ”เธ•เธเธฅเธฑเธเธงเธฑเธ•เธ–เธธเธ”เธดเธเนเธซเนเธญเธฑเธ•เนเธเธกเธฑเธ•เธด
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3 items-start">
        <div className="p-2 bg-emerald-100 rounded-xl shrink-0">
          <Zap className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-emerald-800">Auto-Sync เธฃเธฒเธเธฒเธงเธฑเธ•เธ–เธธเธ”เธดเธ</p>
          <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
            เธซเธฅเธฑเธเธเธฑเธเธ—เธถเธ เธฃเธฐเธเธเธเธฐเธญเธฑเธเน€เธ”เธ•เธฃเธฒเธเธฒเธงเธฑเธ•เธ–เธธเธ”เธดเธเนเธเธเธฅเธฑเธเนเธ”เธขเธญเธฑเธ•เนเธเธกเธฑเธ•เธด
            เธเนเธงเธขเธเธณเธเธงเธ“เธ•เนเธเธ—เธธเธเธชเธนเธ•เธฃเธญเธฒเธซเธฒเธฃเนเธซเนเนเธกเนเธเธขเธณเธเธถเนเธ
          </p>
        </div>
      </div>

      {/* Tips */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: ShoppingCart, label: "เธเธดเธฅ Makro", sub: "เธ•เธฅเธฒเธ”เธเธฒเธขเธชเนเธ" },
          { icon: Receipt, label: "เธเธดเธฅเธ•เธฅเธฒเธ”เธชเธ”", sub: "เธเธทเนเธญเธงเธฑเธ•เธ–เธธเธ”เธดเธเธชเธ”" },
          { icon: PackageCheck, label: "เนเธเธชเธฑเนเธเธเธทเนเธญ", sub: "เธฃเนเธฒเธเธเธฒเธขเธชเนเธ" },
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
            <p className="text-sm font-bold text-slate-700">เนเธ•เธฐเน€เธเธทเนเธญเธ–เนเธฒเธขเธซเธฃเธทเธญเน€เธฅเธทเธญเธเธเธดเธฅ</p>
            <p className="text-[11px] text-slate-400 mt-0.5">เธฃเธญเธเธฃเธฑเธ JPEG, PNG, WebP</p>
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
                  {r.status === "pending" && "เธฃเธญเธเธดเธง..."}
                  {r.status === "uploading" && "เธเธณเธฅเธฑเธเธญเธฑเธเนเธซเธฅเธ”..."}
                  {r.status === "processing" && "AI เธเธณเธฅเธฑเธเธญเนเธฒเธเธเธดเธฅ..."}
                  {r.status === "done" && "โ… เธญเนเธฒเธเธเธดเธฅเธชเธณเน€เธฃเนเธ"}
                  {r.status === "error" && `โ ${r.error}`}
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
              เธ–เนเธฒเธขเธเธดเธฅ
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-2xl h-12 gap-2 font-bold border-slate-200"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isWorking}
            >
              เน€เธฅเธทเธญเธเนเธเธฅเน
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
            เธเธฑเธเธ—เธถเธ & เธเธดเธเธเนเธฃเธฒเธเธฒเธงเธฑเธ•เธ–เธธเธ”เธดเธ ({doneJobs.length} เธเธดเธฅ)
          </Button>
        )}
      </div>
    </div>
  );
}