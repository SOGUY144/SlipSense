"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, AlertCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Alert {
  id: string;
  title: string;
  dueDay: number;
  daysLeft: number;
}

export function NotificationBell() {
  const [hasAlerts, setHasAlerts] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/dashboard/reminders-alerts", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (data.alerts && data.alerts.length > 0) {
          setHasAlerts(true);
          setAlerts(data.alerts);
          
          // Show popup only once per session if not on reminders page
          const hasSeenPopup = sessionStorage.getItem("hasSeenAlertPopup");
          if (!hasSeenPopup && pathname !== "/reminders") {
            setShowPopup(true);
            sessionStorage.setItem("hasSeenAlertPopup", "true");
          }
        } else {
          setHasAlerts(false);
        }
      })
      .catch(console.error);
  }, [pathname]);

  return (
    <>
      <Link 
        href="/reminders" 
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="การแจ้งเตือน"
      >
        <Bell className="h-5 w-5" />
        {hasAlerts && (
          <span className="absolute top-1.5 right-2 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background animate-pulse" />
        )}
      </Link>

      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              มีบิลใกล้ถึงกำหนดจ่าย!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              คุณมีบิลที่กำลังจะถึงกำหนด หรือเลยกำหนดมาแล้ว อย่าลืมจัดการนะครับ:
            </p>
            <div className="space-y-2">
              {alerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="flex justify-between items-center p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <span className="font-medium text-sm">{alert.title}</span>
                  <span className="text-xs text-warning font-bold">
                    {alert.daysLeft < 0 
                      ? `เลยมา ${Math.abs(alert.daysLeft)} วัน` 
                      : alert.daysLeft === 0 
                      ? "วันนี้!" 
                      : `อีก ${alert.daysLeft} วัน`}
                  </span>
                </div>
              ))}
              {alerts.length > 3 && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  และบิลอื่นๆ อีก {alerts.length - 3} รายการ
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowPopup(false)}>
              เดี๋ยวค่อยดู
            </Button>
            <Link href="/reminders" onClick={() => setShowPopup(false)} className="w-full sm:w-auto">
              <Button className="w-full">
                ดูรายละเอียดบิล
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
