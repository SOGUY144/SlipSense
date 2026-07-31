import { requireAuth } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import ExcelJS from "exceljs";

export async function GET(request: Request) {
  try {
    const { shop } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const type = searchParams.get("type"); // "income" or "expense"

    if (!month || !year || !type) {
      return new Response("Missing required parameters", { status: 400 });
    }

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 1);

    const txs = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.shopId, shop.id),
          eq(transactions.type, type as "income" | "expense"),
          gte(transactions.occurredAt, startDate),
          lt(transactions.occurredAt, endDate)
        )
      )
      .orderBy(desc(transactions.occurredAt));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SlipSense";
    workbook.created = new Date();

    const title = type === "income" ? "รายงานภาษีขาย (รายรับ)" : "รายงานภาษีซื้อ (รายจ่าย)";
    const worksheet = workbook.addWorksheet(title);

    // Header styling
    worksheet.mergeCells("A1:M2"); // Now 13 columns (A to M)
    const titleCell = worksheet.getCell("A1");
    titleCell.value = title;
    titleCell.font = { name: "Kanit", size: 22, bold: true, color: { argb: "FF111827" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    worksheet.mergeCells("A3:M3");
    const subtitleCell = worksheet.getCell("A3");
    subtitleCell.value = `ประจำเดือน ${month} ปี ${year}  |  ชื่อสถานประกอบการ: ${shop.name}`;
    subtitleCell.font = { name: "Sarabun", size: 14, color: { argb: "FF4B5563" } };
    subtitleCell.alignment = { horizontal: "center", vertical: "middle" };

    worksheet.addRow([]); // Empty row 4

    const headerRow = worksheet.getRow(5);
    headerRow.values = [
      "ลำดับ",
      "วัน/เดือน/ปี",
      "เลขที่อ้างอิง",
      "เลขที่ใบกำกับภาษี",
      "วันที่ใบกำกับภาษี",
      "เลขประจำตัวผู้เสียภาษี",
      "ชื่อคู่ค้า",
      "ที่อยู่คู่ค้า",
      "หมวดหมู่",
      "มูลค่าก่อนภาษี (บาท)",
      "ภาษีมูลค่าเพิ่ม (บาท)",
      "ยอดรวมทั้งสิ้น (บาท)",
      "หมายเหตุ"
    ];
    headerRow.font = { name: "Sarabun", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    headerRow.height = 35;

    // Header Background
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" } // blue-900
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } }
      };
    });

    // Freeze panes at row 5
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 5 }
    ];

    // Columns width
    worksheet.columns = [
      { key: "index", width: 8 },
      { key: "date", width: 14 },
      { key: "ref", width: 18 },
      { key: "taxInvoiceNo", width: 18 },
      { key: "taxInvoiceDate", width: 14 },
      { key: "taxId", width: 18 },
      { key: "partnerName", width: 25 },
      { key: "partnerAddress", width: 30 },
      { key: "category", width: 20 },
      { key: "subtotal", width: 22 },
      { key: "tax", width: 22 },
      { key: "total", width: 22 },
      { key: "note", width: 30 },
    ];

    let sumSubtotal = 0;
    let sumTax = 0;
    let sumTotal = 0;
    const accountingFormat = '_-* #,##0.00_-;-* #,##0.00_-;_-* "-"??_-;_-@_-';

    txs.forEach((tx, idx) => {
      const dateStr = tx.occurredAt.toLocaleDateString("th-TH");
      const taxInvoiceDateStr = tx.taxInvoiceDate ? new Date(tx.taxInvoiceDate).toLocaleDateString("th-TH") : "-";
      
      const total = parseFloat(tx.amount);
      let subtotal = total;
      let tax = 0;

      if (tx.isVatRegistered) {
        // Round to 2 decimal places to avoid floating point errors
        subtotal = Math.round((total / 1.07) * 100) / 100;
        tax = Math.round((total - subtotal) * 100) / 100;
      }

      sumSubtotal += subtotal;
      sumTax += tax;
      sumTotal += total;

      const partnerName = tx.partnerName || tx.sender || tx.receiver || "-";

      const row = worksheet.addRow({
        index: idx + 1,
        date: dateStr,
        ref: tx.transRef || "-",
        taxInvoiceNo: tx.taxInvoiceNo || "-",
        taxInvoiceDate: taxInvoiceDateStr,
        taxId: tx.taxId || "-",
        partnerName: partnerName,
        partnerAddress: tx.partnerAddress || "-",
        category: tx.category,
        subtotal: subtotal,
        tax: tax,
        total: total,
        note: tx.note || ""
      });

      row.font = { name: "Sarabun", size: 14, color: { argb: "FF374151" } };
      row.height = 25;
      
      // Alignment
      row.getCell("index").alignment = { horizontal: "center", vertical: "middle" };
      row.getCell("date").alignment = { horizontal: "center", vertical: "middle" };
      row.getCell("taxInvoiceDate").alignment = { horizontal: "center", vertical: "middle" };
      row.getCell("ref").alignment = { vertical: "middle" };
      row.getCell("taxInvoiceNo").alignment = { vertical: "middle" };
      row.getCell("taxId").alignment = { horizontal: "center", vertical: "middle" };
      row.getCell("partnerName").alignment = { vertical: "middle" };
      row.getCell("partnerAddress").alignment = { vertical: "middle" };
      row.getCell("category").alignment = { vertical: "middle" };
      row.getCell("note").alignment = { vertical: "middle" };
      
      // Number formatting & alignment
      ['subtotal', 'tax', 'total'].forEach(col => {
        const cell = row.getCell(col);
        cell.numFmt = accountingFormat;
        cell.alignment = { horizontal: "right", vertical: "middle" };
      });

      // Zebra striping for even rows
      if (idx % 2 !== 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9FAFB" } // gray-50
          };
        });
      }
    });

    // Reconciliation Check
    let finalSumSubtotal = Math.round(sumSubtotal * 100) / 100;
    let finalSumTax = Math.round(sumTax * 100) / 100;
    const finalSumTotal = Math.round(sumTotal * 100) / 100;

    const currentCalculatedTotal = Math.round((finalSumSubtotal + finalSumTax) * 100) / 100;
    const diff = Math.round((finalSumTotal - currentCalculatedTotal) * 100) / 100;

    if (diff !== 0 && txs.length > 0) {
      // Adjust the last row's tax by the difference to reconcile
      const lastDataRow = worksheet.getRow(5 + txs.length - 1);
      const lastTaxCell = lastDataRow.getCell("tax");
      const currentTaxVal = Number(lastTaxCell.value) || 0;
      
      const newTaxVal = Math.round((currentTaxVal + diff) * 100) / 100;
      lastTaxCell.value = newTaxVal;
      
      // Update the aggregate sum
      finalSumTax = Math.round((finalSumTax + diff) * 100) / 100;
    }

    // Summary row
    const sumRow = worksheet.addRow({
      index: "",
      date: "",
      ref: "",
      taxInvoiceNo: "",
      taxInvoiceDate: "",
      taxId: "",
      partnerName: "",
      partnerAddress: "",
      category: "รวมทั้งสิ้น",
      subtotal: finalSumSubtotal,
      tax: finalSumTax,
      total: finalSumTotal,
      note: ""
    });
    
    sumRow.font = { name: "Sarabun", size: 15, bold: true, color: { argb: "FF111827" } };
    sumRow.height = 30;
    sumRow.getCell("category").alignment = { horizontal: "right", vertical: "middle" };
    
    ['subtotal', 'tax', 'total'].forEach(col => {
      const cell = sumRow.getCell(col);
      cell.numFmt = accountingFormat;
      cell.alignment = { horizontal: "right", vertical: "middle" };
    });

    // Summary background color
    sumRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDBEAFE" } // blue-100
      };
    });

    // Add borders to all data and summary cells
    const rowCount = worksheet.rowCount;
    for (let i = 5; i <= rowCount; i++) {
      worksheet.getRow(i).eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFD1D5DB" } },
          left: { style: "thin", color: { argb: "FFD1D5DB" } },
          bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
          right: { style: "thin", color: { argb: "FFD1D5DB" } }
        };
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Disposition": `attachment; filename="tax-report-${year}-${month}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Export Excel error:", error);
    return new Response("Failed to generate Excel", { status: 500 });
  }
}
