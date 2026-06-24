"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, triggerHaptic } from "@/lib/utils";
import { Loader2, Plus, ArrowLeft, Calendar, Trash2, Edit, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BillReminder {
  id?: string;
  title: string;
  dueDay: number;
  amount: string | null;
  category: string;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<BillReminder[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPaidSuccess, setShowPaidSuccess] = useState(false);
  
  // Edit Dialog State
  const [isEditing, setIsEditing] = useState(false);
  const [currentEdit, setCurrentEdit] = useState<BillReminder | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    if (reminders.length === 0) setLoading(true);
    try {
      const [res, alertsRes] = await Promise.all([
        fetch("/api/reminders"),
        fetch("/api/dashboard/reminders-alerts", { cache: "no-store" })
      ]);
      
      if (res.ok) {
        setReminders(await res.json());
      }
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const handleSave = async (updatedReminders: BillReminder[]) => {
    setSaving(true);
    try {
      const payload = updatedReminders.map((r) => ({
        title: r.title,
        amount: r.amount ? parseFloat(r.amount) : null,
        dueDay: r.dueDay,
        category: r.category,
      }));

      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminders: payload }),
      });

      if (res.ok) {
        setReminders(updatedReminders);
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    }
    setSaving(false);
  };

  const handleDelete = (index: number) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบบิลนี้?")) return;
    const newReminders = [...reminders];
    newReminders.splice(index, 1);
    handleSave(newReminders);
  };

  const openEdit = (reminder?: BillReminder, index?: number) => {
    if (reminder) {
      setCurrentEdit({ ...reminder });
      setEditIndex(index as number);
    } else {
      setCurrentEdit({ title: "", category: "ทั่วไป", dueDay: 1, amount: null });
      setEditIndex(null);
    }
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!currentEdit) return;
    if (!currentEdit.title || currentEdit.dueDay < 1 || currentEdit.dueDay > 31) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง (วันที่ต้องอยู่ระหว่าง 1-31)");
      return;
    }

    let newReminders = [...reminders];
    if (editIndex !== null) {
      newReminders[editIndex] = currentEdit;
    } else {
      newReminders.push(currentEdit);
    }
    
    setIsEditing(false);
    handleSave(newReminders);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={load}>
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">บิลประจำเดือน 📅</h1>
              <p className="text-sm text-muted-foreground">รายการที่ต้องจ่ายเพื่อกันลืม</p>
            </div>
          </div>
          <Button onClick={() => openEdit()} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มบิล
          </Button>
        </div>

      <div className="space-y-3">
        {reminders.length === 0 ? (
          <Card className="border-dashed bg-transparent">
            <CardContent className="p-8 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground mb-4">
                คุณยังไม่มีบิลประจำเดือน
              </p>
              <Button onClick={() => openEdit()}>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มบิลแรกของคุณ
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {reminders.map((reminder, idx) => {
              const activeAlert = alerts.find(a => a.id === reminder.id);
              
              const now = new Date();
              const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
              const isManuallyPaid = (reminder as any).lastPaidMonth === currentMonthStr;
              
              return (
                <Card key={reminder.id || idx} className={activeAlert ? "border-warning/50 bg-warning/5" : ""}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{reminder.title}</h3>
                        {activeAlert && (
                          <span className="bg-warning/20 text-warning-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            🔔 ถึงกำหนด
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        กำหนดจ่าย: วันที่ {reminder.dueDay} ของทุกเดือน
                        {reminder.amount && ` · ประมาณ ${formatCurrency(parseFloat(reminder.amount))}`}
                      </p>
                      {reminder.id && (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={async () => {
                              triggerHaptic('light');
                              const newPaidMonth = isManuallyPaid ? null : currentMonthStr;
                              const res = await fetch("/api/reminders/paid", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: reminder.id, paidMonth: newPaidMonth })
                              });
                              if (res.ok) {
                                load(); // Reload to update states
                                if (!isManuallyPaid) {
                                  setShowPaidSuccess(true);
                                  triggerHaptic('success');
                                  setTimeout(() => setShowPaidSuccess(false), 2000);
                                }
                              }
                            }}
                            className={`text-xs px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-colors ${
                              isManuallyPaid 
                                ? "bg-success/10 border-success/30 text-success font-medium" 
                                : "bg-muted/30 border-border text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${isManuallyPaid ? 'bg-success border-success' : 'border-muted-foreground'}`}>
                              {isManuallyPaid && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            {isManuallyPaid ? "จ่ายแล้วของเดือนนี้" : "ติ๊กเมื่อจ่ายแล้ว"}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 self-start">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(reminder, idx)}>
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? "แก้ไขบิลประจำ" : "เพิ่มบิลประจำ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ชื่อบิล</Label>
              <Input 
                placeholder="เช่น ค่าเช่าหอ, ค่าเน็ต" 
                value={currentEdit?.title || ""} 
                onChange={(e) => setCurrentEdit(prev => prev ? {...prev, title: e.target.value} : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>หมวดหมู่ (ใช้ตรวจจับจากสลิป)</Label>
              <Input 
                placeholder="เช่น ค่าเช่า/ที่พัก" 
                value={currentEdit?.category || ""} 
                onChange={(e) => setCurrentEdit(prev => prev ? {...prev, category: e.target.value} : null)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>วันที่ต้องจ่าย (1-31)</Label>
                <Input 
                  type="number" min={1} max={31} 
                  value={currentEdit?.dueDay || ""} 
                  onChange={(e) => setCurrentEdit(prev => prev ? {...prev, dueDay: parseInt(e.target.value)} : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>จำนวนเงินโดยประมาณ</Label>
                <Input 
                  type="number" 
                  placeholder="ไม่บังคับ" 
                  value={currentEdit?.amount || ""} 
                  onChange={(e) => setCurrentEdit(prev => prev ? {...prev, amount: e.target.value} : null)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>ยกเลิก</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Popup Overlay */}
      {showPaidSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 flex flex-col items-center justify-center gap-4 shadow-2xl animate-in zoom-in-95 duration-200 scale-110">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-12 h-12 text-green-500" strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">บันทึกจ่ายบิลสำเร็จ</h2>
          </div>
        </div>
      )}
      </div>
    </PullToRefresh>
  );
}
