"use client";

import { useForm, UseFormReturn } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/lib/validations/schemas";
import type { z } from "zod";

type FormData = z.infer<typeof transactionSchema>;

function ConfidenceBadge({ level }: { level?: string | null }) {
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

interface TransactionFormProps {
  form: UseFormReturn<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  saving: boolean;
  fieldConfidence?: Record<string, string | null>;
  onCancel?: () => void;
  title?: React.ReactNode;
  showConfidence?: boolean;
}

export function TransactionForm({
  form,
  onSubmit,
  saving,
  fieldConfidence = {},
  onCancel,
  title = "ข้อมูลที่ AI อ่านได้",
  showConfidence = false,
}: TransactionFormProps) {
  const watchType = form.watch("type");
  const categories =
    watchType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            {title}
            {showConfidence && <ConfidenceBadge level={form.watch("confidence")} />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>ประเภท</Label>
              {showConfidence && <ConfidenceBadge level={fieldConfidence.type} />}
            </div>
            <Select
              value={form.watch("type")}
              onValueChange={(v) => {
                form.setValue("type", v as "income" | "expense");
                form.setValue(
                  "category",
                  v === "income" ? "รายได้จากการขาย" : "ค่าใช้จ่ายอื่นๆ"
                );
                // Clear category error if user fixes it via type change
                form.clearErrors("category");
              }}
            >
              <SelectTrigger className={form.formState.errors.type ? "border-destructive" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">รายรับ</SelectItem>
                <SelectItem value="expense">รายจ่าย</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>หมวดหมู่</Label>
              {showConfidence && <ConfidenceBadge level={fieldConfidence.category} />}
            </div>
            <Select
              value={form.watch("category")}
              onValueChange={(v) => {
                form.setValue("category", v);
                form.clearErrors("category");
              }}
            >
              <SelectTrigger className={form.formState.errors.category ? "border-destructive" : ""}>
                <SelectValue placeholder="เลือกหมวดหมู่" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.category && (
              <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">จำนวนเงิน (บาท)</Label>
              {showConfidence && <ConfidenceBadge level={fieldConfidence.amount} />}
            </div>
            <Input
              id="amount"
              type="number"
              step="0.01"
              className={form.formState.errors.amount ? "border-destructive" : ""}
              {...form.register("amount", { valueAsNumber: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="occurredAt">วันที่</Label>
              {showConfidence && <ConfidenceBadge level={fieldConfidence.occurredAt} />}
            </div>
            <Input
              id="occurredAt"
              type="datetime-local"
              className={form.formState.errors.occurredAt ? "border-destructive" : ""}
              value={
                form.watch("occurredAt")
                  ? new Date(form.watch("occurredAt")).toISOString().slice(0, 16)
                  : ""
              }
              onChange={(e) => {
                if (e.target.value) {
                  form.setValue("occurredAt", new Date(e.target.value).toISOString());
                  form.clearErrors("occurredAt");
                }
              }}
            />
            {form.formState.errors.occurredAt && (
              <p className="text-sm text-destructive">{form.formState.errors.occurredAt.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="counterparty">ผู้โอน/ผู้รับ</Label>
              {showConfidence && <ConfidenceBadge level={fieldConfidence.counterparty} />}
            </div>
            <Input 
              id="counterparty" 
              placeholder="ถ้ามี" 
              {...form.register("counterparty")} 
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="note">หมายเหตุ</Label>
              {showConfidence && <ConfidenceBadge level={fieldConfidence.note} />}
            </div>
            <Textarea 
              id="note" 
              placeholder="ถ้ามี" 
              {...form.register("note")} 
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            ยกเลิก
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>
    </form>
  );
}
