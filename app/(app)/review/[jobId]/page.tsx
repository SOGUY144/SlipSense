"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
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

export default function ReviewPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const watchType = form.watch("type");
  const categories =
    watchType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

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
          counterparty: extracted.counterparty ?? "",
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
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);

    if (res.ok) {
      if (nextJobs.length > 0) {
        const nextId = nextJobs[0];
        const remaining = nextJobs.slice(1).join(",");
        router.push(`/review/${nextId}${remaining ? `?next=${remaining}` : ""}`);
      } else {
        router.push("/dashboard");
      }
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

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              ข้อมูลที่ AI อ่านได้
              <ConfidenceBadge level={form.watch("confidence")} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>ประเภท</Label>
                <ConfidenceBadge level={fieldConfidence.type} />
              </div>
              <Select
                value={form.watch("type")}
                onValueChange={(v) => {
                  form.setValue("type", v as "income" | "expense");
                  form.setValue(
                    "category",
                    v === "income"
                      ? "รายได้จากการขาย"
                      : "ค่าใช้จ่ายอื่นๆ"
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">รายรับ</SelectItem>
                  <SelectItem value="expense">รายจ่าย</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>หมวดหมู่</Label>
                <ConfidenceBadge level={fieldConfidence.category} />
              </div>
              <Select
                value={form.watch("category")}
                onValueChange={(v) => form.setValue("category", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">จำนวนเงิน (บาท)</Label>
                <ConfidenceBadge level={fieldConfidence.amount} />
              </div>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...form.register("amount", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="occurredAt">วันที่</Label>
                <ConfidenceBadge level={fieldConfidence.occurredAt} />
              </div>
              <Input
                id="occurredAt"
                type="datetime-local"
                value={
                  form.watch("occurredAt")
                    ? new Date(form.watch("occurredAt"))
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  form.setValue(
                    "occurredAt",
                    new Date(e.target.value).toISOString()
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="counterparty">ผู้โอน/ผู้รับ</Label>
                <ConfidenceBadge level={fieldConfidence.counterparty} />
              </div>
              <Input id="counterparty" {...form.register("counterparty")} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="note">หมายเหตุ</Label>
                <ConfidenceBadge level={fieldConfidence.note} />
              </div>
              <Textarea id="note" {...form.register("note")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/upload")}
          >
            ยกเลิก
          </Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </form>
    </div>
  );
}
