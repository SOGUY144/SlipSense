# 🔍 ตรวจสอบก่อนรัน: ความเสี่ยง Precision Loss ใน Migration Scripts (4 ไฟล์)

> เอกสารนี้ต่อยอดจาก `tax-report-migration-fixes-final.md` — ใช้ตรวจสอบสคริปต์ 4 ไฟล์ (`step1-snapshot.ts`, `step2-schema-push.ts`, `step3-update-data.ts`, `step4-verify.ts`) ก่อนรันจริง เพราะบั๊ก precision loss ที่เคยเจอมาก่อน (JS ตัด microsecond เหลือ millisecond) อาจกลับมาเกิดซ้ำได้ที่รอยต่อของไฟล์เหล่านี้

---

## สรุปโครงสร้างที่เสนอมา (ถูกต้องแล้ว)

- แยกเป็น 4 ไฟล์ คนละ process จริง ไม่ใช้ `DO $$` block เดียวคั่นด้วย CLI comment
- `step1`: ดึง `CURRENT_TIMESTAMP` จาก PostgreSQL เขียนลง `migration-audit.log`
- `step2`: รัน `drizzle-kit push` แยก process ผ่าน `execSync`
- `step3`: อ่านค่า timestamp จาก log มาใช้ในเงื่อนไข `WHERE created_at <= ...`
- `step4`: verify ว่าไม่มีแถวที่ `created_at > snapshot_time AND is_vat_registered = true`

โครงสร้างนี้ผ่านการรีวิวแล้ว ไม่ต้องแก้ **แต่ต้องตรวจสอบรายละเอียดการจัดการ timestamp ก่อนรันจริง** ตามหัวข้อด้านล่าง

---

## 🚨 จุดเสี่ยงที่ต้องเช็ค: Timestamp โดนตัดทอนซ้ำที่รอยต่อไฟล์

ต้นเหตุของบั๊กรอบก่อน (เจอ 15 แถวหลุด) คือ timestamp ผ่าน JavaScript `Date` object แล้วถูกตัดจาก microsecond (6 หลัก) เหลือ millisecond (3 หลัก) ตอนนี้ flow ใหม่มี 2 รอยต่อที่อาจเกิดปัญหาเดิมซ้ำ:

```
PostgreSQL (เก็บเวลาละเอียดระดับ microsecond)
   ↓
[รอยต่อ 1] step1: ดึงค่ามาเป็น JS value → เขียนลงไฟล์ log
   ↓
[รอยต่อ 2] step3: อ่านจากไฟล์ → ใส่กลับเข้า SQL query
```

### รอยต่อ 1 — `step1-snapshot.ts`
ถ้าโค้ดดึง `snapshot_time` จาก query result แล้วแปลงเป็น JS `Date` object (เช่นเรียก `.toISOString()` หรือ `JSON.stringify()` ก่อนเขียนไฟล์) — JS `Date` เก็บได้แค่ millisecond โดยธรรมชาติ ต่อให้ query จาก PostgreSQL มาถูกต้อง พอแปลงเป็น `Date` ก็ตัดทอนทันที

**ต้องยืนยัน:** ค่าที่เขียนลง `migration-audit.log` เป็น **raw string ตรงจาก PostgreSQL driver** ไม่ผ่านการแปลงเป็น `Date` object ก่อน

### รอยต่อ 2 — `step3-update-data.ts`
ถ้าอ่านค่าจากไฟล์ log ขึ้นมาแล้วแปลงเป็น `Date` object ก่อนส่งเข้า query (แทนที่จะส่ง string ตรงๆ) จะตัดทอนซ้ำอีกรอบเช่นกัน

**ต้องยืนยัน:** ค่าที่อ่านจากไฟล์แล้วส่งเข้า `WHERE created_at <= ${snapshotTime}` เป็น string เดิมแบบเป๊ะ ไม่ผ่านการแปลงเป็น `Date` object

### เพิ่มเติม — PostgreSQL driver auto-parsing
บาง PostgreSQL client (เช่น `node-postgres`/`pg`) จะ **auto-parse timestamp column เป็น JS Date object โดยอัตโนมัติ** โดยที่โค้ดไม่ได้เรียก `.toISOString()` เองด้วยซ้ำ ต้องตรวจสอบว่า:
- มีการ config ปิด auto-parse สำหรับ timestamp type หรือไม่ (เช่น `types.setTypeParser` ใน `pg`)
- หรือดึงค่าดิบแบบ raw/text mode แทน

---

## ✅ Checklist ที่ต้องตอบให้ครบก่อนรันจริง

- [ ] `step1-snapshot.ts`: ขอดูโค้ดบรรทัดที่ดึงค่า `snapshot_time` และเขียนลงไฟล์ — ยืนยันว่าไม่ผ่าน `Date` object
- [ ] `step3-update-data.ts`: ขอดูโค้ดบรรทัดที่อ่านค่าจากไฟล์และใส่เข้า query — ยืนยันว่าไม่ผ่าน `Date` object
- [ ] ตรวจสอบ config ของ PostgreSQL client ว่ามี auto-parse timestamp เป็น `Date` หรือไม่ ถ้ามีต้องปิดหรือใช้ raw mode
- [ ] รันจำลองครบ step 1 → 4 บน **Staging/Dev เท่านั้น**
- [ ] ผลลัพธ์ของ `step4-verify.ts` ต้องได้ **0 แถว** เท่านั้นถึงจะถือว่าผ่าน
- [ ] ถ้าเจอแม้แต่ 1 แถวหลุดใน step4 → หยุดทันที กลับไปเช็ค 2 รอยต่อข้างต้นซ้ำก่อนรันใหม่

---

## ข้อจำกัดสำคัญ

**ห้ามอนุมัติให้รันบน Production จนกว่าจะ:**
1. ยืนยันโค้ดทั้ง 2 รอยต่อแล้วว่าไม่มีการแปลงผ่าน `Date` object
2. รันบน Staging/Dev แล้วเห็นผล step4 = 0 แถวจริง พร้อมแนบ log ผลลัพธ์จริงมาให้ตรวจสอบ (ไม่ใช่แค่คำอธิบายว่า "น่าจะผ่าน")
