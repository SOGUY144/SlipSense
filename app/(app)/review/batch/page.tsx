"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/validations/schemas";
import { Loader2, CheckCircle, AlertTriangle, ArrowRight, X, Calendar, User, Tag, FileText, CheckCircle2, Sparkles, Maximize2 } from "lucide-react";

interface BatchItem {
  slipJobId: string;
  imageUrl: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  occurredAt: string;
  confidence?: string;
  sender?: string;
  receiver?: string;
  note?: string;
  fieldConfidence?: any;
}

const safeFormatDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 16);
};

const safeParseDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "" : d.toISOString();
};

export default function BatchReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIds = searchParams.get("jobIds");
  
  const [items, setItems] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [detailedIndex, setDetailedIndex] = useState<number | null>(null);
  const [dbCategories, setDbCategories] = useState<{id: string, type: string, name: string}[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDbCategories(data);
      })
      .catch(console.error);
  }, []);

  const getAvailableCategories = (type: string, currentVal: string) => {
    const cats = dbCategories.filter((c) => c.type === type).map((c) => c.name);
    if (currentVal && !cats.includes(currentVal)) cats.push(currentVal);
    return cats;
  };

  useEffect(() => {
    async function load() {
      if (!jobIds) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/jobs/batch?ids=${jobIds}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        
        const loadedItems = data.map((d: any) => {
          const ex = d.job.extractedData || {};
          return {
            slipJobId: d.job.id,
            imageUrl: d.imageUrl,
            type: ex.type || "expense",
            category: ex.category || "ค่าใช้จ่ายอื่นๆ",
            amount: ex.amount || 0,
            occurredAt: safeParseDate(ex.occurredAt) || new Date().toISOString(),
            confidence: ex.overallConfidence,
            sender: ex.sender || "",
            receiver: ex.receiver || "",
            note: ex.note || "",
            fieldConfidence: ex.fieldConfidence || {},
          };
        });
        setItems(loadedItems);
      } catch (err) {
        setError("ไม่สามารถดึงข้อมูลได้");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobIds]);

  const updateItem = (index: number, field: keyof BatchItem, value: any) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Auto-update category when type changes
      if (field === "type") {
        newItems[index].category = value === "income" ? "รายได้จากการขาย" : "ค่าใช้จ่ายอื่นๆ";
      }
      
      return newItems;
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/transactions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: items }),
      });
      if (!res.ok) throw new Error("Save failed");
      triggerHaptic('success');
      setShowSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      alert("บันทึกข้อมูลไม่สำเร็จ");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">กำลังดึงข้อมูลสลิป...</p>
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive">{error || "ไม่มีข้อมูลสลิป"}</p>
        <Button className="mt-4" onClick={() => router.push("/upload")}>กลับไปถ่ายสลิปใหม่</Button>
      </div>
    );
  }

  const ConfidenceBadge = ({
    level,
  }: {
    level?: "high" | "medium" | "low";
  }) => {
    if (!level) return null;
    const variants = {
      high: { variant: "success" as const, label: "สูง" },
      medium: { variant: "warning" as const, label: "กลาง" },
      low: { variant: "destructive" as const, label: "ต่ำ" },
    };
    const config = variants[level];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6 pb-24 relative">
      {/* Detailed View Modal */}
      {detailedIndex !== null && items[detailedIndex] && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/95 backdrop-blur border-b">
            <h2 className="font-semibold">ตรวจสอบสลิปแบบละเอียด (ใบที่ {detailedIndex + 1})</h2>
            <Button variant="ghost" size="sm" onClick={() => setDetailedIndex(null)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="p-4 space-y-6 max-w-lg mx-auto w-full pb-20">
            <div className="relative aspect-[3/4] w-full max-w-sm mx-auto overflow-hidden rounded-xl border shadow-sm">
              <Image
                src={items[detailedIndex].imageUrl}
                alt="Slip"
                fill
                className="object-contain"
                unoptimized
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  ข้อมูลที่ AI อ่านได้
                  <ConfidenceBadge level={items[detailedIndex].confidence as any} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>ประเภท</Label>
                    <ConfidenceBadge level={items[detailedIndex].fieldConfidence?.type} />
                  </div>
                  <Select
                    value={items[detailedIndex].type}
                    onValueChange={(v) => updateItem(detailedIndex, "type", v)}
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
                    <ConfidenceBadge level={items[detailedIndex].fieldConfidence?.category} />
                  </div>
                  <Select
                    value={items[detailedIndex].category}
                    onValueChange={(v) => updateItem(detailedIndex, "category", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableCategories(items[detailedIndex].type, items[detailedIndex].category).map(
                        (cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>จำนวนเงิน (บาท)</Label>
                    <ConfidenceBadge level={items[detailedIndex].fieldConfidence?.amount} />
                  </div>
                  <Input
                    type="number"
                    value={items[detailedIndex].amount}
                    onChange={(e) => updateItem(detailedIndex, "amount", parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>วันที่</Label>
                    <ConfidenceBadge level={items[detailedIndex].fieldConfidence?.occurredAt} />
                  </div>
                  <Input
                    type="datetime-local"
                    value={safeFormatDate(items[detailedIndex].occurredAt)}
                    onChange={(e) => updateItem(detailedIndex, "occurredAt", safeParseDate(e.target.value))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span>ผู้โอน</span>
                    <ConfidenceBadge level={items[detailedIndex].fieldConfidence?.sender} />
                  </Label>
                  <Input
                    value={items[detailedIndex].sender || ""}
                    onChange={(e) => updateItem(detailedIndex, "sender", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span>ผู้รับเงิน</span>
                    <ConfidenceBadge level={items[detailedIndex].fieldConfidence?.receiver} />
                  </Label>
                  <Input
                    value={items[detailedIndex].receiver || ""}
                    onChange={(e) => updateItem(detailedIndex, "receiver", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>หมายเหตุ</Label>
                  <Input
                    value={items[detailedIndex].note || ""}
                    onChange={(e) => updateItem(detailedIndex, "note", e.target.value)}
                    placeholder="เพิ่มหมายเหตุ (ถ้ามี)"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Button className="w-full" size="lg" onClick={() => setDetailedIndex(null)}>
              บันทึกการแก้ไขใบนี้
            </Button>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox */}
      {selectedImage && detailedIndex === null && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full max-w-lg h-[80vh] bg-transparent flex justify-center" onClick={(e) => e.stopPropagation()}>
            <Image
              src={selectedImage}
              alt="Slip Full View"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold">ตรวจสอบและแก้ไขแบบกลุ่ม</h1>
        <p className="text-sm text-muted-foreground">
          พบสลิปทั้งหมด {items.length} ใบ ตรวจสอบความถูกต้องก่อนบันทึก
        </p>
      </div>

      <div className="space-y-6">
        {items.map((item, index) => (
          <Card key={item.slipJobId} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow border-2 border-border/60">
            <CardHeader className="bg-muted/50 py-3 px-4 border-b-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">
                    {index + 1}
                  </span>
                  สลิปที่ {index + 1}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <ConfidenceBadge level={item.confidence as any} />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10 hover:text-primary" onClick={() => setDetailedIndex(index)}>
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex gap-4 flex-col sm:flex-row">
              {/* Image Preview */}
              <div 
                className="relative aspect-[3/4] w-24 sm:w-32 flex-shrink-0 overflow-hidden rounded-md border shadow-sm self-center sm:self-start cursor-zoom-in hover:opacity-90 transition-opacity"
                onClick={() => setSelectedImage(item.imageUrl)}
              >
                <Image
                  src={item.imageUrl}
                  alt="Slip"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              {/* Edit Form */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-bold">ประเภท</Label>
                    <Select
                      value={item.type}
                      onValueChange={(v) => updateItem(index, "type", v)}
                    >
                      <SelectTrigger className="h-12 text-base font-bold border-2 border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">รายรับ</SelectItem>
                        <SelectItem value="expense">รายจ่าย</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-bold">หมวดหมู่</Label>
                    <Select
                      value={item.category}
                      onValueChange={(v) => updateItem(index, "category", v)}
                    >
                      <SelectTrigger className="h-12 text-base font-medium border-2 border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableCategories(item.type, item.category).map(
                          (cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-bold">จำนวนเงิน (บาท)</Label>
                    <Input
                      type="number"
                      value={item.amount}
                      onChange={(e) => updateItem(index, "amount", parseFloat(e.target.value) || 0)}
                      className="h-12 text-lg font-bold border-2 border-border/60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-bold">วันที่</Label>
                    <Input
                      type="datetime-local"
                      value={safeFormatDate(item.occurredAt)}
                      onChange={(e) => updateItem(index, "occurredAt", safeParseDate(e.target.value))}
                      className="h-12 text-base font-medium border-2 border-border/60"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add padding at the bottom so the sticky bar doesn't overlap the last input */}
      <div className="h-32" />

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-30 pb-safe pointer-events-none bg-gradient-to-t from-background/90 via-background/50 to-transparent">
        <div className="max-w-lg mx-auto flex flex-col gap-2 px-2 pointer-events-auto">
          {/* Gamification Text */}
          <div className="flex justify-center">
            <p className="text-center text-xs font-bold text-primary animate-pulse flex items-center justify-center gap-1.5 py-1 px-3 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm rounded-full w-fit">
              <Sparkles className="w-3.5 h-3.5" /> ตรวจอีกนิด เพื่อกำไรที่เป๊ะขึ้น!
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-16 text-lg font-bold border-2 border-border/60 bg-background" onClick={() => router.push("/upload")} disabled={saving}>
              ยกเลิก
            </Button>
            <Button className="flex-1 h-16 text-lg font-bold shadow-lg shadow-green-600/25 bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveAll} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {saving ? "กำลังบันทึก..." : `บันทึกทั้งหมด (${items.length} รายการ)`}
            </Button>
          </div>
        </div>
      </div>

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
