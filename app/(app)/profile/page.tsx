"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Calendar, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { SpendingBehaviorModal } from "@/components/onboarding/spending-behavior-modal";
import { OnboardingReminders } from "@/components/reminders/onboarding-reminders";

const BUSINESS_TYPES = [
  "ร้านอาหาร / ร้านข้าว",
  "ร้านกาแฟ / ชา / เครื่องดื่ม",
  "ร้านขายของชำ / มินิมาร์ท",
  "ร้านขายเสื้อผ้า / แฟชั่น / รองเท้า",
  "ร้านเสริมสวย / คลินิกความงาม / สปา",
  "ร้านขายอุปกรณ์ไอที / มือถือ / ซ่อมมือถือ",
  "ร้านขายเครื่องสำอาง / สกินแคร์",
  "ร้านขายหนังสือ / เครื่องเขียน / อุปกรณ์สำนักงาน",
  "ร้านขายสัตว์เลี้ยง / อุปกรณ์สัตว์เลี้ยง",
  "คลินิกสัตว์ / โรงพยาบาลสัตว์",
  "ร้านขายยา / อุปกรณ์การแพทย์",
  "ร้านขายของเล่น / อุปกรณ์แม่และเด็ก",
  "ร้านขายเครื่องใช้ไฟฟ้า / อิเล็กทรอนิกส์",
  "ร้านเฟอร์นิเจอร์ / ของแต่งบ้าน",
  "ร้านวัสดุก่อสร้าง / เครื่องมือช่าง",
  "อู่ซ่อมรถ / คาร์แคร์ / ประดับยนต์",
  "ฟรีแลนซ์ / รับจ้างทั่วไป / กราฟิก",
  "บริการทำความสะอาด / แม่บ้าน",
  "บริการ / ซ่อมแซมทั่วไป (แอร์, ประปา)",
  "ขายของออนไลน์ / พ่อค้าแม่ค้าออนไลน์",
  "ตัวแทนจำหน่าย / Dropship",
  "อสังหาริมทรัพย์ / ปล่อยเช่า / หอพัก",
  "ครีเอเตอร์ / อินฟลูเอนเซอร์ / สตรีมเมอร์",
  "เกษตรกร / ขายผลผลิตทางการเกษตร",
];

export default function ProfilePage() {
  const router = useRouter();
  const [showBehaviorModal, setShowBehaviorModal] = useState(false);
  const [showRemindersModal, setShowRemindersModal] = useState(false);

  // Shop Profile State
  const [shopName, setShopName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setShopName(data.shop.name);
        if (data.shop.preferences) {
          setBusinessCategory(data.shop.preferences.businessCategory || "");
          setBusinessType(data.shop.preferences.businessType || "");
          setDescription(data.shop.preferences.description || "");
        }
      }
    }
    load();
  }, []);

  async function handleSaveShopProfile() {
    setSaving(true);
    setMessage("");
    
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopName, businessCategory, businessType, description }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("บันทึกข้อมูลร้านแล้ว");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserCircle className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-xl font-bold">โปรไฟล์ของฉัน</h1>
          <p className="text-sm text-muted-foreground">จัดการข้อมูลเพื่อความแม่นยำของ AI</p>
        </div>
      </div>

      {message && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-sm">{message}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ข้อมูลร้าน (Shop Profile)</CardTitle>
          <CardDescription>
            ข้อมูลที่นี่จะช่วยให้ AI เข้าใจธุรกิจคุณและแยกแยะบัญชีได้แม่นยำขึ้น
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shopName">ชื่อร้านค้า / แบรนด์</Label>
            <Input
              id="shopName"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="เช่น SlipSense Cafe"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="businessCategory">หมวดหมู่ธุรกิจ (เลือกหลัก)</Label>
            <Select value={businessCategory} onValueChange={setBusinessCategory}>
              <SelectTrigger id="businessCategory">
                <SelectValue placeholder="เลือกหมวดหมู่ธุรกิจ" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
                <SelectItem value="อื่นๆ">อื่นๆ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessType">ประเภทธุรกิจแบบเจาะจง (พิมพ์เพิ่มเติมได้เลย)</Label>
            <Input
              id="businessType"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="เช่น ร้านข้าวแกง, ขายเสื้อผ้าวินเทจ"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">คำแนะนำเพิ่มเติมให้ AI (Custom Rules)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น 'ถ้าโอนจ่ายค่าไข่หรือแป้ง ให้จัดเป็น ค่าวัตถุดิบ 100%' หรือ 'รายได้ทั้งหมดมาจากขายสบู่'"
              className="h-20"
            />
            <p className="text-xs text-muted-foreground">
              อธิบายสั้นๆ ว่าร้านทำอะไร หรือตั้งกฎพิเศษให้ AI อ่านสลิปของร้านคุณโดยเฉพาะ
            </p>
          </div>
          
          <Button onClick={handleSaveShopProfile} disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลร้าน"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            ข้อมูลแบบสอบถาม AI
          </CardTitle>
          <CardDescription>
            แก้ไขเป้าหมายรายวันและข้อมูลส่วนตัวเพื่อให้ AI วิเคราะห์ได้แม่นยำที่สุด
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowBehaviorModal(true)} variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            แก้ไขข้อมูลสำหรับ AI
          </Button>
          {showBehaviorModal && (
            <SpendingBehaviorModal 
              forceOpen={true} 
              onComplete={() => setShowBehaviorModal(false)} 
              onSkipOrDone={() => setShowBehaviorModal(false)} 
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            ตั้งค่าบิลประจำเดือนอย่างรวดเร็ว
          </CardTitle>
          <CardDescription>
            เพิ่มบิลที่คุณต้องจ่ายประจำทุกเดือน พร้อมตัวเลือกสำเร็จรูป
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowRemindersModal(true)} variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            เปิดหน้าต่างตั้งค่าบิล
          </Button>
          {showRemindersModal && (
            <OnboardingReminders 
              forceOpen={true} 
              onComplete={() => {
                setShowRemindersModal(false);
                router.refresh();
              }} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
