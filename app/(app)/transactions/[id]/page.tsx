"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownRight, 
  LayoutGrid, 
  Pencil,
  Calendar,
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Receipt,
  Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction } from "@/lib/db/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_CATEGORIES } from "@/lib/validations/schemas";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  
  const [transaction, setTransaction] = useState<(Transaction & { 
    imageUrl?: string | null;
    transRef?: string | null;
    riskScore?: number | null;
    riskLevel?: "low" | "medium" | "high" | null;
    riskReasons?: string[] | any;
  }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit states
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isEditingTax, setIsEditingTax] = useState(false);
  const [editCategory, setEditCategory] = useState("");
  const [editNote, setEditNote] = useState("");
  const [taxData, setTaxData] = useState({
    isVatRegistered: false,
    taxId: "",
    taxInvoiceNo: "",
    taxInvoiceDate: "",
    partnerName: "",
    partnerAddress: "",
  });

  // Fullscreen image state
  const [showFullImage, setShowFullImage] = useState(false);

  useEffect(() => {
    async function fetchTx() {
      const res = await fetch(`/api/transactions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTransaction(data);
        setEditCategory(data.category);
        setEditNote(data.note || "");
        setTaxData({
          isVatRegistered: data.isVatRegistered || false,
          taxId: data.taxId || "",
          taxInvoiceNo: data.taxInvoiceNo || "",
          taxInvoiceDate: data.taxInvoiceDate ? data.taxInvoiceDate.split('T')[0] : "",
          partnerName: data.partnerName || "",
          partnerAddress: data.partnerAddress || "",
        });
      }
      setLoading(false);
    }
    fetchTx();
  }, [id]);

  async function handleSaveCategory() {
    setSaving(true);
    const res = await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: editCategory }),
    });
    if (res.ok) {
      setTransaction(prev => prev ? { ...prev, category: editCategory } : null);
      setIsEditingCategory(false);
    }
    setSaving(false);
  }

  async function handleSaveNote() {
    setSaving(true);
    const res = await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: editNote }),
    });
    if (res.ok) {
      setTransaction(prev => prev ? { ...prev, note: editNote } : null);
      setIsEditingNote(false);
    }
    setSaving(false);
  }

  async function handleSaveTax() {
    setSaving(true);
    const res = await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taxData),
    });
    if (res.ok) {
      setTransaction(prev => prev ? { ...prev, ...taxData } : null);
      setIsEditingTax(false);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">ไม่พบรายการธุรกรรม</p>
        <Button variant="link" onClick={() => router.push("/transactions")}>
          กลับไปหน้ารายการ
        </Button>
      </div>
    );
  }

  const isIncome = transaction.type === "income";

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()}
          className="rounded-full hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 text-muted-foreground font-medium">
          <Calendar className="h-4 w-4" />
          {formatDate(transaction.occurredAt)}
        </div>
      </div>

      {/* Amount Card */}
      <Card className="border-none shadow-[0_8px_30px_rgba(0,0,0,0.04)] bg-white overflow-hidden rounded-3xl">
        <CardContent className="p-8 flex items-center justify-center gap-4 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className={`p-4 rounded-2xl shadow-sm z-10 ${isIncome ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
            {isIncome ? (
              <ArrowDownRight className="h-8 w-8" strokeWidth={2.5} />
            ) : (
              <ArrowUpRight className="h-8 w-8" strokeWidth={2.5} />
            )}
          </div>
          <div className="flex items-baseline gap-2 z-10">
            <span className={`text-[42px] font-extrabold tracking-tight font-number ${isIncome ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(parseFloat(transaction.amount))}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-1 gap-3">
        {/* Category Edit */}
        <Card className="overflow-hidden border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] transition-all hover:shadow-md rounded-3xl">
          <CardContent className="p-0">
            {isEditingCategory ? (
              <div className="p-5 space-y-4 bg-slate-50/50">
                <p className="text-sm font-semibold text-slate-700">แก้ไขหมวดหมู่</p>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger className="w-full bg-background border-2">
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setIsEditingCategory(false)}>ยกเลิก</Button>
                  <Button size="sm" className="flex-1" onClick={handleSaveCategory} disabled={saving}>บันทึก</Button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsEditingCategory(true)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-0.5">หมวดหมู่</p>
                  <p className="font-semibold">{transaction.category}</p>
                </div>
                <Pencil className="h-4 w-4 text-muted-foreground opacity-50" />
              </button>
            )}
          </CardContent>
        </Card>

        {/* Note Edit */}
        <Card className="overflow-hidden border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] transition-all hover:shadow-md rounded-3xl">
          <CardContent className="p-0">
            {isEditingNote ? (
              <div className="p-5 space-y-4 bg-slate-50/50">
                <p className="text-sm font-semibold text-slate-700">แก้ไขโน้ต</p>
                <Textarea 
                  value={editNote} 
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="เพิ่มรายละเอียด..."
                  className="bg-background border-2 resize-none h-20"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setIsEditingNote(false)}>ยกเลิก</Button>
                  <Button size="sm" className="flex-1" onClick={handleSaveNote} disabled={saving}>บันทึก</Button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsEditingNote(true)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-500">
                  <Pencil className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-0.5">โน้ต</p>
                  <p className={`font-medium ${transaction.note ? '' : 'text-muted-foreground italic'}`}>
                    {transaction.note || "เพิ่มโน้ต"}
                  </p>
                </div>
              </button>
            )}
          </CardContent>
        </Card>

        {/* Tax Information Edit */}
        <Card className="overflow-hidden border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] transition-all hover:shadow-md rounded-3xl">
          <CardContent className="p-0">
            {isEditingTax ? (
              <div className="p-5 space-y-5 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">ข้อมูลใบกำกับภาษี</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm font-medium">จดทะเบียน VAT?</span>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                      checked={taxData.isVatRegistered}
                      onChange={(e) => setTaxData({...taxData, isVatRegistered: e.target.checked})}
                    />
                  </label>
                </div>
                
                {taxData.isVatRegistered && (!taxData.taxId || taxData.taxId.length !== 13) && (
                  <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-700">คุณเปิดตั้งค่า VAT แต่เลขประจำตัวผู้เสียภาษียังไม่ครบถ้วน อาจส่งผลต่อการเคลมภาษี</p>
                  </div>
                )}

                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="taxId" className="text-xs">เลขประจำตัวผู้เสียภาษี (13 หลัก)</Label>
                    <Input 
                      id="taxId" 
                      placeholder="1234567890123" 
                      value={taxData.taxId}
                      onChange={(e) => setTaxData({...taxData, taxId: e.target.value})}
                      maxLength={13}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="taxInvoiceNo" className="text-xs">เลขที่ใบกำกับภาษี</Label>
                      <Input 
                        id="taxInvoiceNo" 
                        placeholder="INV-001" 
                        value={taxData.taxInvoiceNo}
                        onChange={(e) => setTaxData({...taxData, taxInvoiceNo: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="taxInvoiceDate" className="text-xs">วันที่ออกบิล</Label>
                      <Input 
                        id="taxInvoiceDate" 
                        type="date"
                        value={taxData.taxInvoiceDate}
                        onChange={(e) => setTaxData({...taxData, taxInvoiceDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="partnerName" className="text-xs">ชื่อคู่ค้า (บริษัท/ร้านค้า)</Label>
                    <Input 
                      id="partnerName" 
                      placeholder="บจก. บริษัทตัวอย่าง" 
                      value={taxData.partnerName}
                      onChange={(e) => setTaxData({...taxData, partnerName: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="partnerAddress" className="text-xs">ที่อยู่คู่ค้า</Label>
                    <Textarea 
                      id="partnerAddress" 
                      placeholder="ที่อยู่สำหรับออกใบกำกับภาษี" 
                      value={taxData.partnerAddress}
                      onChange={(e) => setTaxData({...taxData, partnerAddress: e.target.value})}
                      className="resize-none h-16"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setIsEditingTax(false)}>ยกเลิก</Button>
                  <Button size="sm" className="flex-1" onClick={handleSaveTax} disabled={saving}>บันทึก</Button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsEditingTax(true)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="bg-purple-500/10 p-2.5 rounded-xl text-purple-600">
                  <Receipt className="h-5 w-5" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm text-muted-foreground">ข้อมูลใบกำกับภาษี</p>
                    {transaction.isVatRegistered ? (
                      <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-bold">VAT</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-bold">No VAT</span>
                    )}
                  </div>
                  <p className={`font-medium truncate ${transaction.taxInvoiceNo ? '' : 'text-muted-foreground italic'}`}>
                    {transaction.taxInvoiceNo 
                      ? `${transaction.taxInvoiceNo} (${transaction.partnerName || 'ไม่ระบุชื่อ'})` 
                      : "เพิ่มข้อมูลภาษี"}
                  </p>
                </div>
                <Pencil className="h-4 w-4 text-muted-foreground opacity-50" />
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Slip Data */}
      {transaction.imageUrl && (
        <Card className="border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] bg-white rounded-3xl">
          <CardContent className="p-5">
            <h3 className="font-bold mb-5 text-sm text-slate-700 flex items-center gap-2">
              <Camera className="w-4 h-4 text-slate-400" /> ข้อมูลจากสลิป
            </h3>
            
            <div className="flex justify-between items-start">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0">
                    จาก
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold truncate max-w-[150px] sm:max-w-[200px]">
                      {transaction.sender || "ไม่ระบุ"}
                    </p>
                  </div>
                </div>
                
                <div className="w-0.5 h-4 bg-border ml-4 border-l-2 border-dashed" />
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0">
                    ถึง
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold truncate max-w-[150px] sm:max-w-[200px]">
                      {transaction.receiver || "บัญชีของคุณ"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Slip Thumbnail */}
              <div 
                className="w-24 h-32 relative rounded-lg overflow-hidden border shadow-sm cursor-pointer hover:shadow-md transition-shadow shrink-0 ml-4 group"
                onClick={() => setShowFullImage(true)}
              >
                <Image
                  src={transaction.imageUrl}
                  alt="Slip Thumbnail"
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-white text-xs font-semibold">แตะเพื่อดู</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                บันทึกเมื่อ: {formatDate(transaction.createdAt)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Verification & Reference */}
      {transaction && (
        <Card className="border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] bg-white rounded-3xl">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                {transaction.riskLevel === "high" ? (
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                )}
                การตรวจสอบความปลอดภัย
              </h3>
              {transaction.riskLevel === "high" && (
                <span className="bg-red-500/10 text-red-600 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  เสี่ยงสูง / สลิปซ้ำ
                </span>
              )}
              {transaction.riskLevel === "medium" && (
                <span className="bg-amber-500/10 text-amber-600 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  ควรตรวจสอบ
                </span>
              )}
              {(!transaction.riskLevel || transaction.riskLevel === "low") && (
                <span className="bg-emerald-500/10 text-emerald-600 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  ตรวจสอบแล้ว (ปลอดภัย)
                </span>
              )}
            </div>

            {transaction.transRef && (
              <div className="flex justify-between items-center text-sm pt-1">
                <span className="text-muted-foreground">เลขรหัสอ้างอิง (transRef):</span>
                <span className="font-mono font-semibold bg-muted px-2 py-0.5 rounded text-xs">
                  {transaction.transRef}
                </span>
              </div>
            )}

            {transaction.riskReasons && Array.isArray(transaction.riskReasons) && transaction.riskReasons.length > 0 && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-700 space-y-1 mt-2">
                <p className="font-bold flex items-center gap-1 text-red-800">
                  <AlertTriangle className="h-3.5 w-3.5" /> รายงานการตรวจพบข้อเสี่ยง:
                </p>
                <ul className="list-disc list-inside space-y-0.5">
                  {transaction.riskReasons.map((reason: string, idx: number) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fullscreen Image Viewer Modal */}
      {showFullImage && transaction.imageUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowFullImage(false)}
        >
          <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent absolute top-0 left-0 right-0 z-10">
            <p className="text-white font-medium text-sm drop-shadow-md">รูปสลิป</p>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                setShowFullImage(false);
              }}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          <div className="flex-1 relative w-full h-full flex items-center justify-center p-4">
            <Image
              src={transaction.imageUrl}
              alt="Full Slip"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );
}
