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

interface UploadResult {
  fileName: string;
  status: "pending" | "uploading" | "done" | "error";
  jobId?: string;
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);

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
              ? { ...r, status: "done", jobId: data.job.id }
              : r
          )
        );
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

  const doneCount = results.filter((r) => r.status === "done").length;
  const doneJobs = results.filter((r) => r.status === "done" && r.jobId).map((r) => r.jobId as string);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">ถ่าย/อัปโหลดสลิป</h1>
        <p className="text-sm text-muted-foreground">
          AI จะอ่านและจัดหมวดให้อัตโนมัติ
        </p>
      </div>

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
        className="cursor-pointer border-dashed border-2 hover:border-primary/50 transition-colors"
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <div className="rounded-full bg-primary/10 p-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-medium">แตะเพื่อเลือกรูปสลิป</p>
            <p className="text-sm text-muted-foreground">
              หรือถ่ายรูปจากกล้อง · รองรับหลายใบ
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          className="flex-1 gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Camera className="h-4 w-4" />
          ถ่ายรูป
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4" />
          เลือกไฟล์
        </Button>
      </div>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">สถานะการอัปโหลด</CardTitle>
            <CardDescription>
              {uploading
                ? "กำลังประมวลผล..."
                : `สำเร็จ ${doneCount}/${results.length} ใบ`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <span className="text-sm truncate max-w-[200px]">
                  {r.fileName}
                </span>
                {r.status === "uploading" && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                {r.status === "done" && (
                  <CheckCircle className="h-4 w-4 text-success" />
                )}
                {r.status === "error" && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
            ))}

            {!uploading && doneJobs.length > 0 && (
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
    </div>
  );
}
