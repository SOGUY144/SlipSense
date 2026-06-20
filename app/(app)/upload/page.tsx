"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Camera, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [results, setResults] = useState<UploadResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [savingManual, setSavingManual] = useState(false);

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

      router.push("/dashboard");
    } catch (error: any) {
      alert(error.message || "เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่");
    } finally {
      setSavingManual(false);
    }
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
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
      alert("ไม่สามารถบันทึกได้ กรุณาลองใหม่");
      setSavingBatch(false);
    }
  }

  function pollJobStatus(jobId: string, index: number) {
    const maxRetries = 30; // Max 1 minute polling (2s intervals)
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
        } else if (status === "failed") {
          setResults((prev) => prev.map((r, i) => (i === index ? { ...r, status: "error", error: data.job.errorMessage || "ประมวลผลไม่สำเร็จ" } : r)));
          clearInterval(interval);
        }
      } catch (err) {
        retries++;
        if (retries >= maxRetries) {
          setResults((prev) => prev.map((r, i) => (i === index ? { ...r, status: "error", error: "หมดเวลารอ กรุณาลองใหม่" } : r)));
          clearInterval(interval);
        }
      }
    }, 2000);
  }

  async function processFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    const initial: UploadResult[] = fileArray.map((f) => ({
      fileName: f.name,
      status: "pending",
    }));
    setResults(initial);
    setUploading(true);

    for (let i = 0; i < fileArray.length; i++) {
      setResults((prev) =>
        prev.map((r, idx) =>
          idx === i ? { ...r, status: "uploading" } : r
        )
      );

      const formData = new FormData();
      formData.append("file", fileArray[i]);

      try {
        const res = await fetch("/api/slips", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? { ...r, status: "error", error: data.error }
                : r
            )
          );
          continue;
        }

        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? { ...r, status: "processing", jobId: data.job.id }
              : r
          )
        );

        pollJobStatus(data.job.id, i);
      } catch {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? { ...r, status: "error", error: "อัปโหลดไม่สำเร็จ" }
              : r
          )
        );
      }
    }

    setUploading(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  }

  const isWorking = uploading || results.some(r => r.status === "uploading" || r.status === "processing");
  const doneCount = results.filter((r) => r.status === "done").length;
  const doneJobs = results.filter((r) => r.status === "done" && r.jobId).map((r) => r.jobId as string);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">เพิ่มรายการใหม่</h1>
        <p className="text-sm text-muted-foreground">
          สแกนสลิปด้วย AI หรือกรอกข้อมูลด้วยตัวเอง
        </p>
      </div>

      <div className="flex rounded-xl bg-muted p-1.5 shadow-sm border-2 border-border/50">
        <button
          className={`flex-1 rounded-lg py-3 text-base font-bold transition-all ${
            mode === "scan"
              ? "bg-background text-foreground shadow-md border-2 border-border"
              : "text-muted-foreground hover:bg-background/50"
          }`}
          onClick={() => setMode("scan")}
        >
          📸 สแกนสลิป
        </button>
        <button
          className={`flex-1 rounded-lg py-3 text-base font-bold transition-all ${
            mode === "manual"
              ? "bg-background text-foreground shadow-md border-2 border-border"
              : "text-muted-foreground hover:bg-background/50"
          }`}
          onClick={() => setMode("manual")}
        >
          ✍️ กรอกข้อมูลเอง
        </button>
      </div>

      {mode === "manual" ? (
        <TransactionForm
          form={form}
          onSubmit={onManualSubmit}
          saving={savingManual}
          title="กรอกรายละเอียดรายการ"
        />
      ) : (
        <>
          <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <Card
        className="cursor-pointer border-dashed border-4 border-primary/40 bg-primary/5 hover:border-primary transition-colors shadow-sm"
        onClick={() => !isWorking && fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center gap-6 py-16">
          <div className="rounded-full bg-primary/20 p-6">
            <Upload className="h-12 w-12 text-primary" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">แตะเพื่อเลือกรูปสลิป</p>
            <p className="text-base text-muted-foreground mt-2 font-medium">
              หรือถ่ายรูปจากกล้อง · รองรับหลายใบ
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          className="flex-1 gap-3 h-16 text-lg rounded-xl shadow-md font-bold"
          onClick={() => fileInputRef.current?.click()}
          disabled={isWorking}
        >
          <Camera className="h-6 w-6" strokeWidth={2.5} />
          ถ่ายรูป
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-3 h-16 text-lg rounded-xl border-2 border-primary/30 text-primary font-bold hover:bg-primary/10"
          onClick={() => fileInputRef.current?.click()}
          disabled={isWorking}
        >
          <Upload className="h-6 w-6" strokeWidth={2.5} />
          เลือกไฟล์
        </Button>
      </div>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">สถานะการอัปโหลด</CardTitle>
            <CardDescription>
              {isWorking
                ? "กำลังประมวลผล..."
                : `สำเร็จ ${doneCount}/${results.length} ใบ`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="flex flex-col rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm truncate max-w-[200px] font-medium">
                    {r.fileName}
                  </span>
                  {(r.status === "uploading" || r.status === "processing") && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {r.status === "done" && (
                    <CheckCircle className="h-4 w-4 text-success" />
                  )}
                  {r.status === "error" && (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
                {r.status === "error" && r.error && (
                  <div className="mt-2 text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                    {r.error}
                  </div>
                )}
              </div>
            ))}

            {!isWorking && doneJobs.length > 0 && (
              <div className="flex flex-col gap-2 mt-4">
                <Button
                  className="w-full"
                  onClick={() =>
                    router.push(`/review/batch?jobIds=${doneJobs.join(",")}`)
                  }
                  disabled={savingBatch}
                >
                  ตรวจสอบข้อมูลแบบกลุ่ม ({doneCount} ใบ)
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const nextParams = doneJobs.length > 1 ? `?next=${doneJobs.slice(1).join(",")}` : "";
                    router.push(`/review/${doneJobs[0]}${nextParams}`);
                  }}
                  disabled={savingBatch}
                >
                  ตรวจสอบทีละใบแบบละเอียด
                </Button>
                <Button
                  variant="secondary"
                  className="w-full border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary"
                  onClick={() => handleBatchSave(doneJobs)}
                  disabled={savingBatch}
                >
                  {savingBatch ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {savingBatch ? "กำลังบันทึก..." : `บันทึกอัตโนมัติทันที (${doneCount} ใบ)`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  );
}
