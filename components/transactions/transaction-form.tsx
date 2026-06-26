"use client";

import { useForm, UseFormReturn, useFieldArray } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X, Sparkles, Trash2, Plus } from "lucide-react";
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
  hasBottomNav?: boolean;
}

import { useEffect, useState } from "react";

interface Category {
  id: string;
  type: "income" | "expense";
  name: string;
}

export function TransactionForm({
  form,
  onSubmit,
  saving,
  fieldConfidence = {},
  onCancel,
  title = "ข้อมูลที่ AI อ่านได้",
  showConfidence = false,
  hasBottomNav = false,
}: TransactionFormProps) {
  const watchType = form.watch("type");
  const [dbCategories, setDbCategories] = useState<Category[]>([]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "metadata.lineItems"
  });

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDbCategories(data);
      })
      .catch(console.error);
  }, []);

  const availableCategories = dbCategories
    .filter((c) => c.type === watchType)
    .map((c) => c.name);

  const currentCategory = form.watch("category");
  if (currentCategory && !availableCategories.includes(currentCategory)) {
    availableCategories.push(currentCategory);
  }

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
              <Label className="text-base font-bold">ประเภท</Label>
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
              <SelectTrigger className={cn("h-14 text-lg font-bold border-2", form.formState.errors.type ? "border-destructive" : "border-border/60")}>
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
              <Label className="text-base font-bold">หมวดหมู่</Label>
              {showConfidence && <ConfidenceBadge level={fieldConfidence.category} />}
            </div>
            <Select
              value={form.watch("category")}
              onValueChange={(v) => {
                form.setValue("category", v);
                form.clearErrors("category");
              }}
            >
              <SelectTrigger className={cn("h-14 text-base font-medium border-2", form.formState.errors.category ? "border-destructive" : "border-border/60")}>
                <SelectValue placeholder="เลือกหมวดหมู่" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">กำลังโหลด...</div>
                ) : (
                  availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {form.formState.errors.category && (
              <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount" className="text-base font-bold">จำนวนเงิน (บาท)</Label>
              {showConfidence && <ConfidenceBadge level={fieldConfidence.amount} />}
            </div>
            <Input
              id="amount"
              type="number"
              step="0.01"
              className={cn("h-14 text-xl font-bold border-2", form.formState.errors.amount ? "border-destructive" : "border-border/60")}
              {...form.register("amount", { valueAsNumber: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="occurredAt" className="text-base font-bold">วันที่</Label>
              {showConfidence && <ConfidenceBadge level={fieldConfidence.occurredAt} />}
            </div>
            <Input
              id="occurredAt"
              type="datetime-local"
              className={cn("h-14 text-base font-medium border-2", form.formState.errors.occurredAt ? "border-destructive" : "border-border/60")}
              value={
                form.watch("occurredAt")
                  ? (() => {
                      try {
                        const d = new Date(form.watch("occurredAt"));
                        if (isNaN(d.getTime())) return "";
                        const pad = (n: number) => n.toString().padStart(2, '0');
                        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                      } catch {
                        return "";
                      }
                    })()
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
              <Label htmlFor="sender" className="text-base font-bold">ผู้โอน (จาก)</Label>
              {showConfidence && <ConfidenceBadge level={fieldConfidence.sender} />}
            </div>
            <Input 
              id="sender" 
              placeholder="ถ้ามี" 
              className="h-14 text-base font-medium border-2 border-border/60"
              {...form.register("sender")} 
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="receiver" className="text-base font-bold">ผู้รับเงิน (ไปยัง)</Label>
              {showConfidence && <ConfidenceBadge level={fieldConfidence.receiver} />}
            </div>
            <Input 
              id="receiver" 
              placeholder="ถ้ามี" 
              className="h-14 text-base font-medium border-2 border-border/60"
              {...form.register("receiver")} 
            />
          </div>

          <div className="space-y-4 mt-4 bg-muted/30 rounded-xl p-4 border-2 border-border/60">
            <div className="flex items-center justify-between">
              <Label className="text-base font-bold flex items-center gap-2">
                🛒 รายการสินค้า (Line Items)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-bold"
                onClick={() => append({ name: "", quantity: 1, price: 0 })}
              >
                <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
              </Button>
            </div>

            {fields.length > 0 ? (
              <div className="space-y-3">
                {fields.map((field, idx) => (
                  <div key={field.id} className="flex gap-2 items-start bg-white p-2 rounded-lg border shadow-sm">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="ชื่อสินค้า"
                        className="h-9 text-sm"
                        {...form.register(`metadata.lineItems.${idx}.name`)}
                      />
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="จำนวน"
                          className="h-9 text-sm w-20"
                          {...form.register(`metadata.lineItems.${idx}.quantity`, { valueAsNumber: true })}
                        />
                        <Input
                          type="number"
                          placeholder="ราคา (รวม)"
                          className="h-9 text-sm flex-1"
                          {...form.register(`metadata.lineItems.${idx}.price`, { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive h-9 w-9 shrink-0"
                      onClick={() => remove(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                ไม่มีรายการสินค้า
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">ยอดก่อนภาษี</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="h-9 text-sm"
                  {...form.register("metadata.subTotal", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">ภาษี (Tax/VAT)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="h-9 text-sm"
                  {...form.register("metadata.tax", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">ส่วนลด</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="h-9 text-sm"
                  {...form.register("metadata.discount", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">เลขโต๊ะ</Label>
                <Input
                  placeholder="เช่น V05"
                  className="h-9 text-sm"
                  {...form.register("metadata.tableNumber")}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">รหัสบิล</Label>
                <Input
                  placeholder="เช่น 1000011"
                  className="h-9 text-sm"
                  {...form.register("metadata.receiptNumber")}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="note" className="text-base font-bold">หมายเหตุ</Label>
              {showConfidence && <ConfidenceBadge level={fieldConfidence.note} />}
            </div>
            <Textarea 
              id="note" 
              placeholder="ถ้ามี" 
              className="text-base font-medium border-2 border-border/60 min-h-[100px]"
              {...form.register("note")} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Add padding at the bottom so the sticky bar doesn't overlap the last input */}
      <div className="h-32" />

      {/* Sticky Bottom Bar */}
      <div 
        className="fixed left-0 right-0 p-4 z-30 pb-safe pointer-events-none bg-gradient-to-t from-background/90 via-background/50 to-transparent"
        style={{ bottom: hasBottomNav ? '72px' : '0px' }}
      >
        <div className="max-w-md mx-auto flex flex-col gap-2 pointer-events-auto">
          {/* Gamification Text */}
          <div className="flex justify-center">
            <p className="text-center text-xs font-bold text-primary animate-pulse flex items-center justify-center gap-1.5 py-1 px-3 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm rounded-full w-fit">
              <Sparkles className="w-3.5 h-3.5" /> ตรวจอีกนิด เพื่อกำไรที่เป๊ะขึ้น!
            </p>
          </div>

          <div className="flex gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-14 text-lg font-bold border-2 border-border/60 hover:bg-muted/50 hover:scale-[1.02] active:scale-95 transition-all bg-background"
                onClick={onCancel}
              >
                ยกเลิก
              </Button>
            )}
            <Button type="submit" className="flex-1 h-14 text-lg font-bold shadow-lg shadow-green-600/25 hover:scale-[1.02] active:scale-95 transition-all bg-green-600 hover:bg-green-700 text-white" disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
