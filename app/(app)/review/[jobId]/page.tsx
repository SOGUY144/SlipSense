"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { triggerHaptic } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  transactionSchema,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type ExtractedSlip,
} from "@/lib/validations/schemas";
import type { z } from "zod";

type FormData = z.infer<typeof transactionSchema>;

function ConfidenceBadge({ level }: { level?: string }) {
  if (!level) return null;
  const map = {
    high: { label: "สูง", variant: "success" as const },
    medium: { label: "กลาง", variant: "warning" as const },
    low: { label: "ต่ำ", variant: "destructive" as const },
  };
  const conf = map[level as keyof typeof map];
  if (!conf) return null;
  return <Badge variant={conf.variant}>{conf.label}</Badge>;
}

import { TransactionForm } from "@/components/transactions/transaction-form";

export default function ReviewPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fieldConfidence, setFieldConfidence] = useState<
    Record<string, string>
  >({});
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const nextJobs = nextParam ? nextParam.split(",").filter(Boolean) : [];

  const form = useForm<FormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "expense",
      category: "ค่าใช้จ่ายอื่นๆ",
      amount: 0,
      occurredAt: new Date().toISOString(),
    },
  });

  useEffect(() => {
    async function load() {
      const { jobId: id } = await params;

      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }

      const data = await res.json();
      setImageUrl(data.imageUrl ?? "");

      const extracted = data.job.extractedData as ExtractedSlip | null;
      if (extracted) {
        form.reset({
          slipJobId: id,
          type: extracted.type,
          category: extracted.category,
          amount: extracted.amount,
          occurredAt: extracted.occurredAt,
          sender: extracted.sender ?? "",
          receiver: extracted.receiver ?? "",
          note: extracted.note ?? "",
          confidence: extracted.overallConfidence,
        });
        setFieldConfidence(extracted.fieldConfidence ?? {});
      }

      setLoading(false);
    }
    load();
  }, [params, form]);

  async function onSubmit(data: FormData) {
    setSaving(true);
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

      triggerHaptic('success');
      setShowSuccess(true);
      
      setTimeout(() => {
        if (nextJobs.length > 0) {
          const nextId = nextJobs[0];
          const remaining = nextJobs.slice(1).join(",");
          router.push(`/review/${nextId}${remaining ? `?next=${remaining}` : ""}`);
        } else {
          router.push("/dashboard");
        }
      }, 1500);
    } catch (error: any) {
      alert(error.message || "เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">ตรวจสอบข้อมูล</h1>
          {nextJobs.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">คิวถัดไปอีก {nextJobs.length} ใบ</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          ตรวจสอบและแก้ไขก่อนบันทึก
        </p>
      </div>

      {imageUrl && (
        <Card>
          <CardContent className="p-2">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg">
              <Image
                src={imageUrl}
                alt="สลิป"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </CardContent>
        </Card>
      )}

      <TransactionForm 
        form={form} 
        onSubmit={onSubmit} 
        saving={saving} 
        fieldConfidence={fieldConfidence} 
        onCancel={() => router.push("/upload")} 
        title="ข้อมูลที่ AI อ่านได้"
        showConfidence={true}
      />

      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 flex flex-col items-center gap-4 shadow-2xl animate-in zoom-in-95 duration-200 min-w-[200px]">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" strokeWidth={3} />
            </div>
            <p className="font-bold text-lg text-foreground">บันทึกสำเร็จ</p>
          </div>
        </div>
      )}
    </div>
  );
}
