"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export default function LineSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  
  const [settings, setSettings] = useState({
    lineChannelSecret: "",
    lineAccessToken: "",
    isLineActive: false,
    shopId: "",
    hasChannelSecret: false,
    hasAccessToken: false,
  });

  useEffect(() => {
    async function fetchSettings() {
      const res = await fetch("/api/settings/line");
      if (res.ok) {
        const data = await res.json();
        setSettings({
          ...settings,
          shopId: data.shopId,
          isLineActive: data.isLineActive,
          hasChannelSecret: data.hasChannelSecret,
          hasAccessToken: data.hasAccessToken,
        });
      }
      setLoading(false);
    }
    fetchSettings();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/settings/line", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lineChannelSecret: settings.lineChannelSecret || undefined,
        lineAccessToken: settings.lineAccessToken || undefined,
        isLineActive: settings.isLineActive,
      }),
    });
    
    setSaving(false);
    if (res.ok) {
      setMessage("บันทึกการตั้งค่าเรียบร้อยแล้ว");
      if (settings.lineChannelSecret) setSettings(s => ({ ...s, hasChannelSecret: true, lineChannelSecret: "" }));
      if (settings.lineAccessToken) setSettings(s => ({ ...s, hasAccessToken: true, lineAccessToken: "" }));
      router.refresh();
    } else {
      setMessage("เกิดข้อผิดพลาดในการบันทึก");
    }
  }

  const webhookUrl = settings.shopId 
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/line/${settings.shopId}`
    : "";

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-[#00B900]/10 text-[#00B900] rounded-xl">
          <MessageCircle className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">LINE OA Integration</h1>
          <p className="text-sm text-slate-500">
            เชื่อมต่อ LINE Official Account เพื่อรับและตรวจสลิปอัตโนมัติ
          </p>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <p className="font-medium text-sm">{message}</p>
        </div>
      )}

      <Card className="border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden rounded-[1.5rem]">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-lg">1. ตั้งค่าการเชื่อมต่อ (API Keys)</CardTitle>
          <CardDescription>
            นำค่าเหล่านี้มาจากเว็บ LINE Developers (Messaging API)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label>Channel Secret</Label>
            <Input 
              type="password" 
              placeholder={settings.hasChannelSecret ? "•••••••••••••••• (บันทึกไว้แล้ว)" : "ใส่ Channel Secret ที่นี่"} 
              value={settings.lineChannelSecret}
              onChange={(e) => setSettings({ ...settings, lineChannelSecret: e.target.value })}
              className="bg-slate-50 focus:bg-white transition-colors"
            />
          </div>
          <div className="space-y-2">
            <Label>Channel Access Token</Label>
            <Input 
              type="password" 
              placeholder={settings.hasAccessToken ? "•••••••••••••••• (บันทึกไว้แล้ว)" : "ใส่ Channel Access Token ที่นี่"} 
              value={settings.lineAccessToken}
              onChange={(e) => setSettings({ ...settings, lineAccessToken: e.target.value })}
              className="bg-slate-50 focus:bg-white transition-colors"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden rounded-[1.5rem]">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-lg">2. ตั้งค่า Webhook URL</CardTitle>
          <CardDescription>
            คัดลอก URL ด้านล่างนี้ไปวางที่ช่อง Webhook URL ใน LINE Developers
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Input 
              readOnly 
              value={webhookUrl} 
              className="bg-slate-100 font-mono text-xs text-slate-600"
            />
            <Button variant="outline" size="icon" onClick={copyWebhook} className="shrink-0">
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden rounded-[1.5rem]">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-lg">3. เปิดใช้งานระบบตอบกลับ</CardTitle>
          <CardDescription>
            หากเปิดใช้งาน AI จะสแกนสลิปและพิมพ์ตอบกลับลูกค้าทาง LINE ทันที
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">บอทตอบกลับอัตโนมัติ</Label>
              <p className="text-sm text-slate-500">ตอบลูกค้าเมื่อรับยอดสำเร็จ หรือเตือนเมื่อพบสลิปซ้ำ</p>
            </div>
            <Switch 
              checked={settings.isLineActive}
              onCheckedChange={(checked) => setSettings({ ...settings, isLineActive: checked })}
            />
          </div>
        </CardContent>
        <CardFooter className="p-6 pt-0 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-[#00B900] hover:bg-[#009900] text-white rounded-full px-8 shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            บันทึกการตั้งค่าทั้งหมด
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
