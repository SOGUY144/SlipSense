"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction } from "@/lib/db/schema";
import { Loader2, Printer, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportData {
  shopName: string;
  month: string;
  summary: { income: number; expense: number; profit: number };
  transactions: Transaction[];
}

export default function ReportPage() {
  const router = useRouter();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // For simplicity, we fetch dashboard summary which has month data, and then we'd ideally fetch ALL transactions for the month.
      // But we can just use the dashboard's recent ones or fetch a custom endpoint. Let's create a quick API fetch for the current month.
      
      const res = await fetch("/api/transactions?limit=100"); // Let's just fetch recent 100 for the report
      const summaryRes = await fetch("/api/dashboard/summary");
      
      if (res.ok && summaryRes.ok) {
        const txs = await res.json();
        const summary = await summaryRes.json();
        
        setData({
          shopName: summary.shopName,
          month: new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }),
          summary: summary.current,
          transactions: txs.transactions || txs,
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">กำลังเตรียมรายงาน...</p>
      </div>
    );
  }

  if (!data) return <div className="p-4 text-center">เกิดข้อผิดพลาดในการดึงข้อมูล</div>;

  return (
    <div className="max-w-3xl mx-auto bg-white min-h-screen pb-20">
      {/* Controls - Hidden when printing */}
      <div className="print:hidden sticky top-0 bg-background/95 backdrop-blur z-10 border-b p-4 flex items-center justify-between shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-1" /> กลับ
        </Button>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" /> บันทึก PDF / พิมพ์
        </Button>
      </div>

      {/* Report Content - Styled for A4 */}
      <div className="p-8 print:p-0 print:m-0 bg-white text-black">
        <div className="text-center mb-8 border-b pb-6">
          <h1 className="text-3xl font-bold mb-2">{data.shopName}</h1>
          <h2 className="text-xl text-gray-600">รายงานสรุปรายรับ - รายจ่าย</h2>
          <p className="text-gray-500 mt-1">ประจำเดือน {data.month}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-10 text-center">
          <div className="p-4 bg-gray-50 rounded-lg border">
            <p className="text-sm text-gray-500 mb-1">รายรับทั้งหมด</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(data.summary.income)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border">
            <p className="text-sm text-gray-500 mb-1">รายจ่ายทั้งหมด</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(data.summary.expense)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border">
            <p className="text-sm text-gray-500 mb-1">ยอดสุทธิ (กำไร)</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(data.summary.profit)}</p>
          </div>
        </div>

        <h3 className="text-lg font-bold mb-4 border-b pb-2">รายละเอียดรายการ</h3>
        
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="p-3 font-semibold w-1/4">วันที่-เวลา</th>
              <th className="p-3 font-semibold w-1/4">หมวดหมู่</th>
              <th className="p-3 font-semibold w-1/4">ผู้โอน / รับเงิน</th>
              <th className="p-3 font-semibold text-right w-1/4">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {data.transactions.length > 0 ? (
              data.transactions.map((tx: any, i: number) => (
                <tr key={tx.id} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="p-3 text-gray-600">{formatDate(tx.occurredAt)}</td>
                  <td className="p-3 font-medium">{tx.category}</td>
                  <td className="p-3 text-gray-600 truncate max-w-[150px]">{tx.counterparty || '-'}</td>
                  <td className={`p-3 text-right font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(tx.amount))}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  ไม่มีรายการในเดือนนี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        <div className="mt-12 text-center text-sm text-gray-400">
          <p>เอกสารสรุปรายรับ-รายจ่าย สร้างโดยระบบ SlipSense</p>
          <p>พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}</p>
        </div>
      </div>
      
      {/* Global Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          @page { margin: 1cm; }
        }
      `}} />
    </div>
  );
}
