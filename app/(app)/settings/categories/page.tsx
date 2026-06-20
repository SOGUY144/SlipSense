"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

interface Category {
  id: string;
  type: "income" | "expense";
  name: string;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [activeTab, setActiveTab] = useState<"income" | "expense">("expense");

  const loadCategories = async () => {
    setLoading(true);
    const res = await fetch("/api/categories");
    if (res.ok) {
      const data = await res.json();
      setCategories(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setAdding(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: activeTab, name: newName.trim() }),
    });

    if (res.ok) {
      setNewName("");
      loadCategories();
    } else {
      alert("เพิ่มหมวดหมู่ไม่สำเร็จ");
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณต้องการลบหมวดหมู่นี้ใช่หรือไม่? (รายการเก่าที่ใช้หมวดหมู่นี้จะยังแสดงผลปกติ แต่จะไม่สามารถเลือกในรายการใหม่ได้)")) return;
    
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      loadCategories();
    } else {
      alert("ลบไม่สำเร็จ");
    }
  };

  const incomes = categories.filter((c) => c.type === "income");
  const expenses = categories.filter((c) => c.type === "expense");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">จัดการหมวดหมู่</h1>
          <p className="text-sm text-muted-foreground">เพิ่มหรือลบหมวดหมู่ของร้านคุณ</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expense">รายจ่าย</TabsTrigger>
          <TabsTrigger value="income">รายรับ</TabsTrigger>
        </TabsList>

        <form onSubmit={handleAdd} className="flex gap-2 mt-4">
          <Input 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)} 
            placeholder={`เพิ่มหมวดหมู่${activeTab === "income" ? "รายรับ" : "รายจ่าย"}ใหม่...`} 
          />
          <Button type="submit" disabled={adding || !newName.trim()}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            เพิ่ม
          </Button>
        </form>

        <TabsContent value="expense" className="space-y-3 mt-4">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : expenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">ไม่มีหมวดหมู่รายจ่าย</p>
          ) : (
            expenses.map(cat => (
              <Card key={cat.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <span className="font-medium">{cat.name}</span>
                  <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDelete(cat.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="income" className="space-y-3 mt-4">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : incomes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">ไม่มีหมวดหมู่รายรับ</p>
          ) : (
            incomes.map(cat => (
              <Card key={cat.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <span className="font-medium">{cat.name}</span>
                  <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDelete(cat.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
