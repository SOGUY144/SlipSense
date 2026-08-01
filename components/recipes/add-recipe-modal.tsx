"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, ChefHat, Sparkles } from "lucide-react";
import { triggerHaptic } from "@/lib/utils";

interface IngredientItemRow {
  id: string;
  ingredientName: string;
  quantity: string;
  unit: string;
  unitCost: string;
}

interface ExistingIngredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: string;
}

interface AddRecipeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CATEGORY_OPTIONS = ["เครื่องดื่ม", "อาหาร/กับข้าว", "ของหวาน/เบเกอรี่", "ของทานเล่น", "อื่นๆ"];

export function AddRecipeModal({ open, onOpenChange, onSuccess }: AddRecipeModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("เครื่องดื่ม");
  const [sellingPrice, setSellingPrice] = useState("");
  const [items, setItems] = useState<IngredientItemRow[]>([
    { id: "1", ingredientName: "", quantity: "1", unit: "ชิ้น", unitCost: "0" },
  ]);
  const [existingIngredients, setExistingIngredients] = useState<ExistingIngredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setCategory("เครื่องดื่ม");
      setSellingPrice("");
      setItems([{ id: Date.now().toString(), ingredientName: "", quantity: "1", unit: "กรัม", unitCost: "0" }]);
      setError(null);
      fetchExistingIngredients();
    }
  }, [open]);

  const fetchExistingIngredients = async () => {
    try {
      const res = await fetch("/api/ingredients");
      if (res.ok) {
        const data = await res.json();
        setExistingIngredients(data);
      }
    } catch (err) {
      console.error("Failed to load ingredients", err);
    }
  };

  const handleAddItem = () => {
    triggerHaptic("light");
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), ingredientName: "", quantity: "1", unit: "กรัม", unitCost: "0" },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    triggerHaptic("light");
    if (items.length > 1) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof IngredientItemRow, value: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };

        // If user selects/types existing ingredient name, auto-fill unit & unitCost
        if (field === "ingredientName") {
          const matched = existingIngredients.find(
            (e) => e.name.toLowerCase() === value.trim().toLowerCase()
          );
          if (matched) {
            updated.unit = matched.unit;
            updated.unitCost = matched.costPerUnit;
          }
        }
        return updated;
      })
    );
  };

  // Dynamic cost calculations
  const priceNum = Number(sellingPrice) || 0;
  const totalCost = items.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const cost = Number(item.unitCost) || 0;
    return acc + qty * cost;
  }, 0);

  const profit = priceNum - totalCost;
  const marginPercent = priceNum > 0 ? (profit / priceNum) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("กรุณากรอกชื่อเมนู/สูตร");
      return;
    }
    if (!sellingPrice || isNaN(priceNum) || priceNum <= 0) {
      setError("กรุณากรอกราคาขายที่ถูกต้อง");
      return;
    }

    const validItems = items.filter((i) => i.ingredientName.trim() !== "");
    if (validItems.length === 0) {
      setError("กรุณาใส่ส่วนผสมอย่างน้อย 1 รายการ");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          sellingPrice: priceNum,
          items: validItems.map((item) => ({
            ingredientName: item.ingredientName.trim(),
            quantity: Number(item.quantity) || 0,
            unit: item.unit.trim() || "หน่วย",
            unitCost: Number(item.unitCost) || 0,
            cost: (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "เกิดข้อผิดพลาดในการสร้างสูตร");
      }

      triggerHaptic("success");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      triggerHaptic("error");
      setError(err.message || "ไม่สามารถบันทึกสูตรได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <ChefHat className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-800">
              สร้างสูตรคำนวณต้นทุนเมนูใหม่
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Menu Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">ชื่อเมนู *</Label>
              <Input
                placeholder="เช่น ชาไทยเย็น, กะเพราหมูสับ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-2xl border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">หมวดหมู่</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-2xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selling Price */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">ราคาขายหน้าร้าน (บาท) *</Label>
            <Input
              type="number"
              step="any"
              placeholder="0.00"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              className="rounded-2xl border-slate-200 text-lg font-bold text-emerald-700"
            />
          </div>

          {/* Ingredients Breakdown Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>ส่วนผสมและวัตถุดิบ</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (คำนวณต้นทุนอัตโนมัติ)
                </span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="rounded-xl text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                เพิ่มวัตถุดิบ
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => {
                const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
                return (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 relative"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>วัตถุดิบ #{index + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-12 gap-1.5 items-center">
                      <div className="col-span-4">
                        <Input
                          placeholder="ชื่อวัตถุดิบ"
                          value={item.ingredientName}
                          onChange={(e) =>
                            handleItemChange(item.id, "ingredientName", e.target.value)
                          }
                          list={`ingredients-list-${item.id}`}
                          className="rounded-xl border-slate-200 text-xs bg-white"
                        />
                        <datalist id={`ingredients-list-${item.id}`}>
                          {existingIngredients.map((ing) => (
                            <option key={ing.id} value={ing.name}>
                              {ing.unit} ({ing.costPerUnit}฿/{ing.unit})
                            </option>
                          ))}
                        </datalist>
                      </div>

                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="any"
                          placeholder="จำนวน"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(item.id, "quantity", e.target.value)
                          }
                          className="rounded-xl border-slate-200 text-xs bg-white text-center font-medium px-1"
                        />
                      </div>

                      <div className="col-span-3">
                        <Input
                          placeholder="หน่วย"
                          value={item.unit}
                          onChange={(e) => handleItemChange(item.id, "unit", e.target.value)}
                          className="rounded-xl border-slate-200 text-xs bg-white text-center px-1.5"
                        />
                      </div>

                      <div className="col-span-3">
                        <Input
                          type="number"
                          step="any"
                          placeholder="฿/หน่วย"
                          value={item.unitCost}
                          onChange={(e) =>
                            handleItemChange(item.id, "unitCost", e.target.value)
                          }
                          className="rounded-xl border-slate-200 text-xs bg-white text-right font-medium px-1.5"
                        />
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-500 font-medium">
                      รวมวัตถุดิบนี้: <span className="font-bold text-slate-700">฿{itemTotal.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Live Summary Card */}
          <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-3xl shadow-lg space-y-3 mt-4">
            <div className="flex items-center justify-between text-emerald-100 text-xs font-semibold">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> สรุปต้นทุนและกำไรคาดการณ์
              </span>
              <span>{category}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center divide-x divide-white/20">
              <div>
                <p className="text-[10px] text-emerald-100">ต้นทุนรวม</p>
                <p className="text-sm font-bold mt-0.5">
                  ฿{totalCost.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-emerald-100">กำไรขั้นต้น</p>
                <p className="text-sm font-bold mt-0.5">
                  ฿{profit.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-emerald-100">อัตรากำไร (Margin)</p>
                <p className="text-base font-black text-amber-300 mt-0.5">
                  {marginPercent.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-2xl text-xs"
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-2xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-md shadow-emerald-600/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  กำลังสร้างสูตร...
                </>
              ) : (
                "บันทึกสูตรอาหาร"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
