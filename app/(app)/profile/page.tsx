"use client";

import { useState } from "react";
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

import { SpendingBehaviorModal } from "@/components/onboarding/spending-behavior-modal";
import { OnboardingReminders } from "@/components/reminders/onboarding-reminders";

export default function ProfilePage() {
  const router = useRouter();
  const [showBehaviorModal, setShowBehaviorModal] = useState(false);
  const [showRemindersModal, setShowRemindersModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserCircle className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-xl font-bold">ข้อมูลส่วนตัว AI</h1>
          <p className="text-sm text-muted-foreground">จัดการข้อมูลเพื่อความแม่นยำของ AI</p>
        </div>
      </div>

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
