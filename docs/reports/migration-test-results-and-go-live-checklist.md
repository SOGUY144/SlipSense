# ✅ สรุปผลทดสอบ Migration Script + Checklist ก่อนขึ้น Production

> เอกสารนี้ต่อยอดจาก `tax-report-migration-fixes-final.md` และ `migration-precision-check.md` สรุปผลการทดสอบล่าสุดที่ผ่านแล้ว พร้อมสิ่งที่เหลือต้องทำก่อนรันจริงบน Production

---

## ✅ ผลทดสอบที่ผ่านแล้ว (ยืนยันด้วยหลักฐานจริง ไม่ใช่ False Positive)

ทดสอบด้วยสคริปต์ `run-test.ts` ที่จำลอง boundary case และ race condition โดยเฉพาะ:

| ทดสอบ | เงื่อนไข | ผลลัพธ์ | สรุป |
|---|---|---|---|
| TX1 (Boundary Match) | `created_at` มีเศษ microsecond ตรงกับ snapshot time เป๊ะ | ถูกอัปเดตเป็น `true` | ✅ ไม่มีปัญหา precision loss จาก JS Date อีกแล้ว |
| TX2 (Future Leak Test) | `created_at` เกิดหลัง snapshot 1 millisecond | ยังคงเป็น `false` | ✅ Race condition ถูกป้องกันได้จริงระดับ microsecond |
| Rows affected | คาดไว้ 46 (เก่า) + 1 (TX1) = 47 | ได้ 47 ตรงตามคาด | ✅ ไม่ใช่ตัวเลขลอยๆ คำนวณตรงสถานการณ์ที่จำลอง |

**สรุป:** โค้ดที่ใช้ `::text` cast ตอนดึง snapshot และ `::timestamptz` cast ตอนใส่กลับเข้า query ทำงานถูกต้อง ไม่มีจุดไหนผ่าน JS `Date` object เลยตลอดทาง — ปัญหา precision loss ที่เจอในรอบก่อน (15 แถวหลุด) ถูกแก้แล้วจริง

---

## 🧹 สิ่งที่ต้องทำก่อนไปต่อ: ทำความสะอาด Test Data

ตอนนี้ dev/staging database มีข้อมูลทดสอบปลอมปนอยู่ (TX1, TX2 และ 46 แถวเดิมที่ถูกปรับเป็น `true` เพื่อทดสอบ) ต้อง:
- [ ] ลบ TX1 และ TX2 (transaction ปลอมที่สร้างขึ้นมาเพื่อทดสอบ) ออกจาก dev/staging
- [ ] Reset สถานะ `is_vat_registered` ของข้อมูลเดิมให้กลับไปตรงกับสถานะที่ถูกต้องจริง (ไม่ใช่ค่าที่เกิดจากการรันทดสอบซ้ำหลายรอบ)
- [ ] ยืนยันว่าสคริปต์ตัวจริงที่จะใช้รันบน Production คือตัวที่ผ่านการทดสอบนี้ (ใช้ `::text` / `::timestamptz`) ไม่ใช่ตัวเก่าที่มี `DO $$` block หรือผ่าน JS `Date`

---

## 📋 Checklist ก่อนรันจริงบน Production

จาก `tax-report-migration-fixes-final.md` ตอนนี้เคลียร์ไปแล้วส่วนใหญ่ เหลือดังนี้:

- [x] โครงสร้างแยก 4 ขั้นตอนเป็นคนละ process จริง (ไม่ใช้ DO block คั่นด้วย CLI comment)
- [x] Timestamp ไม่ผ่าน JS Date object ตลอดทาง (ยืนยันด้วย `::text`/`::timestamptz`)
- [x] ทดสอบ boundary case (microsecond ตรงเป๊ะ) บน staging แล้วผ่าน
- [x] ทดสอบ race condition (transaction เกิดหลัง 1ms) บน staging แล้วผ่าน
- [ ] **Backup ฐานข้อมูล Production** ก่อนรันจริง (ยังไม่มีการยืนยัน ต้องทำก่อนแตะ Production)
- [ ] **ทำความสะอาด test data** บน dev/staging ตามหัวข้อด้านบน
- [ ] **บันทึก audit log แบบถาวร** ของรอบที่รันจริงบน Production (ที่ผ่านมาเป็น log ของ dev/staging เท่านั้น ต้องมีของ production แยกต่างหาก)
- [ ] **เลือกช่วง off-peak** สำหรับรันจริงบน Production
- [ ] **มีคน monitor สด** ระหว่างรัน เผื่อต้อง rollback ทันทีหากมีความผิดปกติ
- [ ] หลังรันจริงบน Production เสร็จ ให้รัน verification query (step4) อีกครั้งพร้อมแปะผลลัพธ์จริงมาให้ตรวจสอบ (จำนวนแถวที่อัปเดต, จำนวนแถวหลุด — ต้องเป็น 0, เนื้อหาไฟล์ audit log)

---

## หมายเหตุสำหรับ AI/ทีมที่รับงานนี้ไปทำ

- **ห้ามรันสคริปต์ใดๆ บน Production จริงจนกว่าจะติ๊กครบทุกข้อในหัวข้อ Checklist ข้างต้น**
- ถ้ามีการรันซ้ำหรือทดสอบเพิ่มเติมก่อนขึ้น Production ต้องแนบผลลัพธ์จริงจาก console/log มาด้วยเสมอ (ไม่ใช่แค่สรุปด้วยคำพูดว่า "ผ่านแล้ว")
- เมื่อรันบน Production จริงเสร็จ ให้ปิดงานด้วยการแปะผลลัพธ์ครบ 3 อย่าง: (1) จำนวนแถวที่ migrate, (2) ผล verification query ว่า 0 แถวหลุด, (3) เนื้อหาไฟล์ audit log ของรอบ production จริง
