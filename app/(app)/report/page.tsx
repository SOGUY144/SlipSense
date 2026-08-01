"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction } from "@/lib/db/schema";
import { Loader2, Printer, ChevronLeft, Download, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportData {
  shopName: string;
  month: string;
  summary: { income: number; expense: number; profit: number };
  transactions: Transaction[];
}

interface TaxPackageData {
  shopName: string;
  period: string;
  totalTaxInvoicesCount: number;
  totalTaxAmount: string;
  invoices: Transaction[];
}

export default function ReportPage() {
  const router = useRouter();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingTax, setExportingTax] = useState(false);
  const [taxExportResult, setTaxExportResult] = useState<TaxPackageData | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/transactions?limit=100");
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

  async function handleExportTaxPackage() {
    try {
      setExportingTax(true);
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const res = await fetch(`/api/export/tax-package?month=${monthStr}`);
      const json = await res.json();

      const payloadData = json.data || json;

      if (res.ok && payloadData && (payloadData.invoices || payloadData.shopName)) {
        setTaxExportResult(payloadData);

        // Trigger JSON file download
        const blob = new Blob([JSON.stringify(payloadData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tax-package-${monthStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert(json.error || "ไม่สามารถส่งออกเอกสารภาษีได้");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการส่งออกเอกสารภาษี");
    } finally {
      setExportingTax(false);
    }
  }

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

      {/* Tax Package Exporter Card - Hidden when printing */}
      <div className="print:hidden p-6 bg-slate-50 border-b">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  📦 ชุดเอกสารภาษีส่งสำนักงานบัญชี (Tax Package Exporter)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ส่งออกใบกำกับภาษี VAT 7% / WHT รายเดือน เพื่อยื่นภาษีกับสำนักงานบัญชี
                </p>
              </div>
            </div>
            <Button
              onClick={handleExportTaxPackage}
              disabled={exportingTax}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 font-bold text-xs h-9 px-4 shrink-0"
            >
              {exportingTax ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              ส่งออกเอกสารภาษี
            </Button>
          </div>

          {taxExportResult && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  ส่งออกสำเร็จ ({taxExportResult.totalTaxInvoicesCount} ใบกำกับภาษี • ยอดภาษี {formatCurrency(Number(taxExportResult.totalTaxAmount))})
                </span>
              </div>
              <span className="font-semibold text-[10px] text-emerald-600">ดาวน์โหลดแล้ว</span>
            </div>
          )}
        </div>
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
                  <td className="p-3 text-gray-600 truncate max-w-[150px]">{tx.type === "income" ? tx.sender || '-' : tx.receiver || '-'}</td>
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
