"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, FileText, Loader2, Table } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { THSarabun, THSarabunBold } from "@/lib/fonts/Sarabun";
import { triggerHaptic } from "@/lib/utils";

export function ExportButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [type, setType] = useState("income");

  const months = [
    { value: "1", label: "มกราคม" }, { value: "2", label: "กุมภาพันธ์" },
    { value: "3", label: "มีนาคม" }, { value: "4", label: "เมษายน" },
    { value: "5", label: "พฤษภาคม" }, { value: "6", label: "มิถุนายน" },
    { value: "7", label: "กรกฎาคม" }, { value: "8", label: "สิงหาคม" },
    { value: "9", label: "กันยายน" }, { value: "10", label: "ตุลาคม" },
    { value: "11", label: "พฤศจิกายน" }, { value: "12", label: "ธันวาคม" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - i;
    return { value: y.toString(), label: (y + 543).toString() }; // Thai year
  });

  const handleExportExcel = () => {
    window.location.href = `/api/export/excel?month=${month}&year=${year}&type=${type}`;
    setOpen(false);
  };

  const handleExportPDF = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/export/data?month=${month}&year=${year}&type=${type}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const { shopName, transactions } = await res.json();

      const doc = new jsPDF();
      
      // Add Thai font
      doc.addFileToVFS("THSarabun.ttf", THSarabun);
      doc.addFileToVFS("THSarabun-Bold.ttf", THSarabunBold);
      doc.addFont("THSarabun.ttf", "THSarabun", "normal");
      doc.addFont("THSarabun-Bold.ttf", "THSarabun", "bold");
      doc.setFont("THSarabun");

      const title = type === "income" ? "รายงานภาษีขาย (รายรับ)" : "รายงานภาษีซื้อ (รายจ่าย)";
      const subtitle = `ประจำเดือน ${months.find(m => m.value === month)?.label} ปี ${Number(year) + 543} | ชื่อสถานประกอบการ: ${shopName}`;

      doc.setFontSize(20);
      doc.setFont("THSarabun", "bold");
      doc.text(title, 105, 15, { align: "center" });

      doc.setFontSize(16);
      doc.setFont("THSarabun", "normal");
      doc.text(subtitle, 105, 23, { align: "center" });

      let sumSubtotal = 0;
      let sumTax = 0;
      let sumTotal = 0;

      const tableData = transactions.map((tx: any, idx: number) => {
        const dateStr = new Date(tx.occurredAt).toLocaleDateString("th-TH");
        const taxInvoiceDateStr = tx.taxInvoiceDate ? new Date(tx.taxInvoiceDate).toLocaleDateString("th-TH") : "-";
        
        const total = parseFloat(tx.amount);
        let subtotal = total;
        let tax = 0;

        if (tx.isVatRegistered) {
          subtotal = Math.round((total / 1.07) * 100) / 100;
          tax = Math.round((total - subtotal) * 100) / 100;
        }

        sumSubtotal += subtotal;
        sumTax += tax;
        sumTotal += total;

        const partnerName = tx.partnerName || tx.sender || tx.receiver || "-";

        return [
          idx + 1,
          dateStr,
          tx.taxInvoiceNo || "-",
          taxInvoiceDateStr,
          tx.taxId || "-",
          partnerName,
          subtotal.toLocaleString("th-TH", { minimumFractionDigits: 2 }),
          tax.toLocaleString("th-TH", { minimumFractionDigits: 2 }),
          total.toLocaleString("th-TH", { minimumFractionDigits: 2 })
        ];
      });

      let finalSumSubtotal = Math.round(sumSubtotal * 100) / 100;
      let finalSumTax = Math.round(sumTax * 100) / 100;
      const finalSumTotal = Math.round(sumTotal * 100) / 100;

      const currentCalculatedTotal = Math.round((finalSumSubtotal + finalSumTax) * 100) / 100;
      const diff = Math.round((finalSumTotal - currentCalculatedTotal) * 100) / 100;

      if (diff !== 0 && tableData.length > 0) {
        const lastRow = tableData[tableData.length - 1];
        const currentTaxVal = Number(lastRow[7].toString().replace(/,/g, '')) || 0;
        const newTaxVal = Math.round((currentTaxVal + diff) * 100) / 100;
        lastRow[7] = newTaxVal.toLocaleString("th-TH", { minimumFractionDigits: 2 });
        finalSumTax = Math.round((finalSumTax + diff) * 100) / 100;
      }

      tableData.push([
        "", "", "", "", "", "รวมทั้งสิ้น",
        finalSumSubtotal.toLocaleString("th-TH", { minimumFractionDigits: 2 }),
        finalSumTax.toLocaleString("th-TH", { minimumFractionDigits: 2 }),
        finalSumTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })
      ]);

      autoTable(doc, {
        startY: 30,
        head: [["ลำดับ", "วัน/เดือน/ปี", "เลขที่ใบกำกับ", "วันที่", "เลขประจำตัวผู้เสียภาษี", "ชื่อคู่ค้า", "มูลค่าก่อนภาษี", "ภาษี", "ยอดรวม"]],
        body: tableData,
        styles: { font: "THSarabun", fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { halign: 'center' },
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' },
          6: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'right' },
        },
        willDrawCell: (data: any) => {
          if (data.row.index === tableData.length - 1) {
            doc.setFont("THSarabun", "bold");
          }
        },
      });

      doc.save(`tax-report-${year}-${month}.pdf`);
      triggerHaptic("success");
      setOpen(false);
    } catch (error) {
      console.error(error);
      alert("ไม่สามารถสร้าง PDF ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" /> Export รายงาน
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>ดาวน์โหลดรายงานภาษี</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium">ประเภท</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">รายงานภาษีขาย (รายรับ)</SelectItem>
                <SelectItem value="expense">รายงานภาษีซื้อ (รายจ่าย)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium">เดือน</label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium">ปี</label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200" onClick={handleExportExcel} disabled={loading}>
            <Table className="h-4 w-4" /> Excel (.xlsx)
          </Button>
          <Button className="gap-2 bg-red-600 hover:bg-red-700 text-white" onClick={handleExportPDF} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
