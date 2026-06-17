"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, MapPin, Wallet, Users, Briefcase } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  onComplete?: () => void;
  onSkipOrDone?: () => void;
  forceOpen?: boolean;
}

export function SpendingBehaviorModal({ onComplete, onSkipOrDone, forceOpen }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Data
  const [dailyBudget, setDailyBudget] = useState("");
  const [location, setLocation] = useState("");
  const [familyStatus, setFamilyStatus] = useState("");
  const [jobStatus, setJobStatus] = useState("");

  useEffect(() => {
    fetch("/api/preferences")
      .then((res) => res.json())
      .then((data) => {
        if (data.preferences) {
          setDailyBudget(data.preferences.dailyBudget?.toString() || "");
          setLocation(data.preferences.location || "");
          setFamilyStatus(data.preferences.familyStatus || "");
          setJobStatus(data.preferences.jobStatus || "");
        }

        if (!data.preferences || forceOpen) {
          // If no preferences saved or forced, open the modal
          setOpen(true);
        } else {
          if (onSkipOrDone) onSkipOrDone();
        }
      })
      .catch((e) => {
        console.error(e);
        if (onSkipOrDone) onSkipOrDone();
      })
      .finally(() => setLoading(false));
  }, [forceOpen]);

  const handleSave = async () => {
    if (!dailyBudget || !location || !familyStatus || !jobStatus) {
      alert("กรุณาตอบคำถามให้ครบถ้วนเพื่อที่ AI จะได้แนะนำคุณได้อย่างแม่นยำครับ");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        dailyBudget: parseFloat(dailyBudget),
        location,
        familyStatus,
        jobStatus,
      };

      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setOpen(false);
        if (onComplete) onComplete();
        if (onSkipOrDone) onSkipOrDone();
      }
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    }
    setSaving(false);
  };

  // Skip for now is optional, but since it's core to AI we can allow skipping but ask again later,
  // or just force it for the best experience. Let's force it softly.
  const handleSkip = () => {
    setOpen(false);
    if (onSkipOrDone) onSkipOrDone();
  };

  if (loading) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            รู้จักคุณให้มากขึ้นอีกนิด 🤝
          </DialogTitle>
          <DialogDescription className="text-center">
            เพื่อให้ AI ของเราวิเคราะห์และให้คำแนะนำการเงินที่เหมาะกับ "ตัวคุณจริงๆ" รบกวนเวลาตอบคำถาม 4 ข้อสั้นๆ ครับ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" /> 
              เป้าหมายการใช้เงินต่อวัน (บาท)
            </Label>
            <Input 
              type="number" 
              placeholder="เช่น 300" 
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" /> 
              อาศัยอยู่โซนไหน (เพื่อประเมินค่าครองชีพ)
            </Label>
            <Select onValueChange={setLocation} value={location}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกโซนที่อยู่อาศัย" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="กรุงเทพฯ ชั้นใน (สุขุมวิท, สาทร, สีลม)">กรุงเทพฯ ชั้นใน (ค่าครองชีพสูง)</SelectItem>
                <SelectItem value="กรุงเทพฯ ชั้นนอก / ปริมณฑล">กรุงเทพฯ ชั้นนอก / ปริมณฑล</SelectItem>
                <SelectItem value="ต่างจังหวัด (เมืองใหญ่/ท่องเที่ยว)">ต่างจังหวัด (หัวเมืองใหญ่)</SelectItem>
                <SelectItem value="ต่างจังหวัด (ทั่วไป)">ต่างจังหวัด (ทั่วไป)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" /> 
              สถานะครอบครัว
            </Label>
            <Select onValueChange={setFamilyStatus} value={familyStatus}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกสถานะครอบครัว" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="อยู่คนเดียว ไม่มีภาระ">อยู่คนเดียว ไม่มีภาระเยอะ</SelectItem>
                <SelectItem value="มีครอบครัว / มีลูกต้องดูแล">มีครอบครัว / มีลูกต้องดูแล</SelectItem>
                <SelectItem value="ต้องส่งเงินให้ที่บ้าน/พ่อแม่เป็นประจำ">ต้องส่งเงินให้ที่บ้าน/พ่อแม่</SelectItem>
                <SelectItem value="เป็นเสาหลักครอบครัว">เป็นเสาหลักครอบครัว (แบกทุกอย่าง)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" /> 
              ลักษณะอาชีพ / รายได้
            </Label>
            <Select onValueChange={setJobStatus} value={jobStatus}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกลักษณะอาชีพ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="พนักงานประจำ (รายได้แน่นอน)">พนักงานประจำ (รายได้สม่ำเสมอ)</SelectItem>
                <SelectItem value="ฟรีแลนซ์ / ธุรกิจส่วนตัว (รายได้ไม่แน่นอน)">ฟรีแลนซ์ / ธุรกิจส่วนตัว (ไม่แน่นอน)</SelectItem>
                <SelectItem value="เจ้าของกิจการ / ร้านขายของชำ">เจ้าของกิจการ / ร้านขายของชำ</SelectItem>
                <SelectItem value="นักเรียน / นักศึกษา">นักเรียน / นักศึกษา</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleSkip} className="w-full sm:w-auto text-muted-foreground">
            ไว้ก่อน (ข้าม)
          </Button>
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? "กำลังบันทึก..." : "เริ่มต้นใช้งาน AI อัจฉริยะ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
