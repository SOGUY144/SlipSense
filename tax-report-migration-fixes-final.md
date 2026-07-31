# 🛠️ แผนแก้ไขฉบับสมบูรณ์: Migration Script + Tax Report System

> เอกสารนี้รวบรวมปัญหาทั้งหมดที่พบระหว่างการรีวิวหลายรอบ โดยเฉพาะปัญหาสำคัญของ **Migration Script** ที่ยังไม่พร้อมใช้งานจริงบน Production ให้ AI/ทีมพัฒนาแก้ไขให้ครบก่อนนำไป deploy จริง

---

## 🚨 [Critical - ต้องแก้ก่อน Deploy] ปัญหาที่ 1: DO Block ไม่สามารถคั่นด้วย CLI command ได้จริง

**ปัญหา:**
สคริปต์ migration ล่าสุดเขียนไว้แบบนี้:
```sql
DO $$ 
DECLARE 
  snapshot_time TIMESTAMP WITH TIME ZONE;
BEGIN
  snapshot_time := CURRENT_TIMESTAMP; 
  -- 2. รัน Drizzle Push (Schema เปลี่ยน) ... (ทำผ่าน CLI)
  -- 3. อัปเดตข้อมูลเก่าทั้งหมด...
  UPDATE transactions ...
END $$;
```

บรรทัด `-- รัน Drizzle Push (ทำผ่าน CLI)` เป็นแค่คอมเมนต์ ไม่ใช่คำสั่งที่รันจริง `DO $$ ... $$` เป็น transaction เดียวจบในตัว **ไม่สามารถหยุดกลางคันเพื่อรอ `drizzle-kit push` จาก CLI ภายนอกแล้วค่อยรันต่อได้** ถ้ารันจริง column `is_vat_registered` อาจยังไม่ถูกสร้าง (ถ้า schema ยังไม่ push) ทำให้ error ทันที

**สิ่งที่ต้องแก้:**
ต้องแยกเป็น 3 ขั้นตอนที่รันคนละคำสั่ง คนละครั้งจริงๆ:

1. **จับเวลา snapshot แยกเดี่ยวๆ ก่อน และบันทึกผลลง `migration-audit.log` ทันที**
   ```sql
   SELECT CURRENT_TIMESTAMP AS snapshot_time;
   ```
   → เอาค่าที่ได้ (ต้องเก็บระดับ microsecond เต็ม ไม่ตัดทอน) บันทึกลงไฟล์ log จริง

2. **รัน `drizzle-kit push` แยกเป็น process ของตัวเอง** ผ่าน CLI จริง (คนละ step กับ SQL ข้างบน)

3. **รัน UPDATE แยกเป็นอีกคำสั่ง** โดยใช้ค่า timestamp จากขั้นตอนที่ 1 ใส่ตรงๆ แบบ literal (**ห้ามเรียก `CURRENT_TIMESTAMP` ซ้ำใหม่ในขั้นนี้** เพราะจะกลายเป็นเวลาใหม่ที่ไม่ตรงกับตอน snapshot):
   ```sql
   UPDATE transactions 
   SET is_vat_registered = true 
   WHERE created_at <= '<ค่า timestamp จากขั้นตอนที่ 1 แบบเป๊ะ ระดับ microsecond>'
   AND (is_vat_registered = false OR is_vat_registered IS NULL);
   ```

**Verification ที่ต้องทำหลังรัน:**
- รัน verification script เดิม (เช็คแถวที่ `created_at > snapshot_time AND is_vat_registered = true`) ซ้ำอีกครั้งบน staging เพื่อยืนยันว่าไม่มีแถวหลุดจาก precision loss เหมือนที่เจอครั้งก่อน (ตอนนั้นเจอ 15 แถวหลุดเพราะ JS ตัดทศนิยม millisecond ทิ้งจาก PostgreSQL microsecond — ต้องมั่นใจว่าตอนนี้ timestamp มาจาก PostgreSQL เองแล้ว ไม่ผ่าน JavaScript อีก)
- ต้องทดสอบบน **staging ตามลำดับ 3 ขั้นตอนจริง** ก่อน แล้วค่อยไปรันบน production

---

## ✅ สิ่งที่ผ่านการรีวิวแล้วและถูกต้อง (ไม่ต้องแก้ซ้ำ)

รายการนี้ยืนยันแล้วว่าถูกต้องตามหลักการที่ตกลงกัน ไม่ต้องแตะอีก เว้นแต่มี regression:

1. **Rounding logic**: ใช้ `Math.round((...)*100)/100` และคำนวณ `tax = total - subtotal` ทำให้ `subtotal + tax = total` เป๊ะเสมอในทุกแถวโดยอัตโนมัติ (ยืนยันด้วย demo เคส 333/333/334 → รวม 1000.00 พอดี)
2. **Reconciliation safety net**: โค้ดปรับเศษที่แถวสุดท้ายยังคงไว้เป็น safety net เผื่อมีคน manual edit ข้อมูลในฐานข้อมูลตรงๆ จนยอดไม่ตรง — ออกแบบถูกต้อง ไม่ต้องเอาออก
3. **VAT default แยกเก่า/ใหม่**: schema ใหม่ default `isVatRegistered = false` สำหรับ transaction ใหม่ ส่วน transaction เก่าทั้งหมดต้องถูกตั้งเป็น `true` เพื่อคงยอดรายงานเดิมที่เคย export ไปแล้ว
4. **Schema fields ครบ**: `taxId`, `taxInvoiceNo`, `taxInvoiceDate`, `partnerName`, `partnerAddress`, `isVatRegistered`
5. **Backend routes**: `export/excel/route.ts`, `export/data/route.ts`, `api/transactions/[id]/route.ts` เพิ่ม field และ logic ตามข้อ 1-4 แล้ว
6. **Frontend UI**: หน้าแก้ไข transaction มี section ข้อมูลใบกำกับภาษี + สวิตช์ VAT + warning เตือนกรอกไม่ครบ, `export-button.tsx` วาดคอลัมน์ตรงกับ Excel

---

## 📋 Checklist ก่อนรันบน Production จริง

- [ ] แก้ migration script ให้แยก 3 ขั้นตอนจริง (ไม่ใช้ DO block เดียวคั่นด้วย CLI comment)
- [ ] Snapshot timestamp ต้องมาจาก PostgreSQL (`CURRENT_TIMESTAMP`) ไม่ใช่ JavaScript `new Date().toISOString()`
- [ ] ทดสอบลำดับ 3 ขั้นตอนบน **staging** ให้ผ่านก่อน
- [ ] รัน verification query ยืนยันว่าไม่มีแถวหลุดจาก precision loss อีก (`created_at > snapshot_time AND is_vat_registered = true` ต้องได้ 0 แถว)
- [ ] Backup ฐานข้อมูล production ก่อนรันจริง
- [ ] บันทึก snapshot timestamp ลง `migration-audit.log` แบบถาวร (ไม่ใช่แค่ print console)
- [ ] เลือกช่วง off-peak สำหรับ deploy จริง และมีคนคอย monitor ระหว่างรัน
- [ ] หลังรันจริงบน production ให้รัน verification query เดิมอีกครั้งและแปะผลลัพธ์จริงมาให้ตรวจสอบ (จำนวนแถวที่ update, จำนวนแถวที่หลุด (ควรเป็น 0), เนื้อหาไฟล์ audit log)

---

## หมายเหตุสำหรับ AI ที่รับงานนี้ไปทำ

- **ห้ามรันคำสั่งใดๆ บนฐานข้อมูล production จริงโดยไม่ขอ approve ก่อน** ให้เสนอแผน/สคริปต์มาให้ดูก่อนเสมอ
- ถ้าพบ edge case หรือปัญหาที่ไม่ได้ระบุไว้ในเอกสารนี้ระหว่างทำ ให้รายงานทันทีแบบละเอียด (ไม่ใช่แค่วงเล็บผ่านๆ) พร้อมผลกระทบที่อาจเกิดขึ้น ก่อนจะแก้ไขต่อเอง
- ทุกครั้งที่รายงานว่า "เสร็จแล้ว" ให้แนบผลลัพธ์จริง (query results, log file content, ตัวอย่างไฟล์ export) มาด้วยเสมอ ไม่ใช่แค่คำอธิบายว่าทำอะไรไปแล้ว
