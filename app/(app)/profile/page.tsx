"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Calendar, UserCircle } from "lucide-react";
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
  "ร้านอาหาร",
  "ร้านกาแฟ / เครื่องดื่ม",
  "ร้านขายของชำ / มินิมาร์ท",
  "ร้านขายเสื้อผ้า / แฟชั่น",
  "ร้านเสริมสวย / คลินิก",
  "ฟรีแลนซ์ / รับจ้างทั่วไป",
  "บริการ / ซ่อมแซม",
  "ขายของออนไลน์",
  "อื่นๆ"
];

export default function ProfilePage() {
  const router = useRouter();
  const [showBehaviorModal, setShowBehaviorModal] = useState(false);
  const [showRemindersModal, setShowRemindersModal] = useState(false);

  // Shop Profile State
  const [shopName, setShopName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [customBusinessType, setCustomBusinessType] = useState("");
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
          const type = data.shop.preferences.businessType || "";
          if (BUSINESS_TYPES.includes(type) || type === "") {
            setBusinessType(type);
          } else {
            setBusinessType("อื่นๆ");
            setCustomBusinessType(type);
          }
          setDescription(data.shop.preferences.description || "");
        }
      }
    }
    load();
  }, []);

  async function handleSaveShopProfile() {
    setSaving(true);
    setMessage("");
    
    const finalBusinessType = businessType === "อื่นๆ" ? customBusinessType : businessType;
    
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopName, businessType: finalBusinessType, description }),
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
            <Label htmlFor="businessType">ประเภทธุรกิจ</Label>
            <Select value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger id="businessType">
                <SelectValue placeholder="เลือกประเภทธุรกิจ" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {businessType === "อื่นๆ" && (
            <div className="space-y-2">
              <Label htmlFor="customBusinessType">โปรดระบุประเภทธุรกิจ</Label>
              <Input
                id="customBusinessType"
                value={customBusinessType}
                onChange={(e) => setCustomBusinessType(e.target.value)}
                placeholder="พิมพ์ประเภทธุรกิจของคุณ"
              />
            </div>
          )}
          
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
