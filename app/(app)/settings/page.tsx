"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Textarea } from "@/components/ui/textarea";

export default function SettingsPage() {
  const router = useRouter();
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState("");

  async function handleClearData() {
    const res = await fetch("/api/settings", { method: "DELETE" });
    if (res.ok) {
      setMessage("ล้างข้อมูลทั้งหมดแล้ว");
      router.refresh();
    }
  }

  async function handleGenerateInsights() {
    setGeneratingInsights(true);
    setMessage("");
    const res = await fetch("/api/insights", { method: "POST" });
    setGeneratingInsights(false);
    if (res.ok) {
      setMessage("สร้างคำแนะนำจาก AI แล้ว — ดูที่หน้าหลัก");
    } else {
      const data = await res.json();
      setMessage(data.error ?? "สร้างคำแนะนำไม่สำเร็จ");
    }
  }

  async function handleSeedDemo() {
    setSeeding(true);
    setMessage("");
    const res = await fetch("/api/seed", { method: "POST" });
    setSeeding(false);
    if (res.ok) {
      const data = await res.json();
      setMessage(data.message);
    } else {
      setMessage("โหลดข้อมูลตัวอย่างไม่สำเร็จ");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">ตั้งค่า</h1>
        <p className="text-sm text-muted-foreground">จัดการร้านและข้อมูล</p>
      </div>

      {message && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-sm">{message}</CardContent>
        </Card>
      )}



      <Card>
        <CardHeader>
          <CardTitle className="text-base">หมวดหมู่ (Categories)</CardTitle>
          <CardDescription>จัดการหมวดหมู่รายรับและรายจ่ายของร้าน</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => router.push("/settings/categories")}>
            จัดการหมวดหมู่
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI คำแนะนำ
          </CardTitle>
          <CardDescription>
            วิเคราะห์ข้อมูล 3 เดือนล่าสุดและสร้างคำแนะนำประหยัด
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGenerateInsights}
            disabled={generatingInsights}
            className="gap-2"
          >
            {generatingInsights ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            สร้างคำแนะนำจาก AI
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            ข้อมูลตัวอย่าง (Demo)
          </CardTitle>
          <CardDescription>
            โหลดธุรกรรมตัวอย่างสำหรับ pitch / demo บนเวที
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleSeedDemo}
            disabled={seeding}
            className="gap-2"
          >
            {seeding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            โหลดข้อมูลตัวอย่าง
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            ล้างข้อมูลทั้งหมด
          </CardTitle>
          <CardDescription>
            ลบธุรกรรม สลิป และคำแนะนำทั้งหมด — ไม่สามารถกู้คืนได้
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">ล้างข้อมูลทั้งหมด</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ยืนยันล้างข้อมูล?</AlertDialogTitle>
                <AlertDialogDescription>
                  การดำเนินการนี้จะลบธุรกรรม สลิป และคำแนะนำ AI
                  ทั้งหมดของร้านคุณ ไม่สามารถกู้คืนได้
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearData}>
                  ล้างข้อมูล
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
