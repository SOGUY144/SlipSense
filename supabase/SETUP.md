# คู่มือการตั้งค่า Supabase สำหรับ SlipSense

ทำตามขั้นตอนเหล่านี้เพื่อตั้งค่า Supabase สำหรับโปรเจคของคุณ

## 1. สร้างโปรเจค (Create Project)

1. ไปที่ [supabase.com/dashboard](https://supabase.com/dashboard)
2. สร้างโปรเจคใหม่ (เลือกโซน **Singapore** เพื่อความเร็วสำหรับผู้ใช้ในไทย)
3. บันทึกรหัสผ่านฐานข้อมูล (Database Password) ของคุณไว้ให้ดี

## 2. เปิดใช้งานการเข้าสู่ระบบด้วยเบอร์โทร (Enable Phone Auth)

1. ไปที่เมนู **Authentication → Providers**
2. เปิดการใช้งาน **Phone**
3. ตั้งค่าผู้ให้บริการ SMS (แนะนำให้ใช้ Twilio สำหรับใช้งานจริง; หรือใช้ Test OTP ของ Supabase สำหรับตอนพัฒนา)
4. สำหรับช่วงพัฒนา/ทดสอบ ให้เพิ่มเบอร์โทรศัพท์จำลอง (Test phone numbers) ในเมนู **Authentication → Phone Auth**

## 3. รัน Database Migration (สร้างตารางในฐานข้อมูล)

1. ไปที่เมนู **SQL Editor**
2. คัดลอกโค้ดทั้งหมดจากไฟล์ `supabase/migrations/001_initial_schema.sql` ไปวาง
3. กดปุ่ม **Run**

ขั้นตอนนี้จะสร้างตารางทั้งหมด, กฎความปลอดภัย (RLS policies), พื้นที่จัดเก็บไฟล์ (Storage bucket) และ Triggers อัตโนมัติ

## 4. นำค่าตัวแปรระบบมาใส่ (Get Environment Variables)

ไปที่ **Project Settings → API**:
- `NEXT_PUBLIC_SUPABASE_URL` = ค่า Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = ค่า anon public key
- `SUPABASE_SERVICE_ROLE_KEY` = ค่า service_role key (เก็บเป็นความลับ)

ไปที่ **Project Settings → Database → Connection string → URI** (ส่วน Transaction pooler):
- `DATABASE_URL` = postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

## 5. ตั้งค่าโปรเจคในเครื่อง (Configure Local Environment)

ให้คัดลอกไฟล์ `.env.example` เป็น `.env.local` และใส่ค่าต่างๆ ให้ครบถ้วน
```bash
cp .env.example .env.local
```

## 6. คีย์สำหรับใช้งาน AI (Anthropic API Key)

1. ไปเอา API key จาก [console.anthropic.com](https://console.anthropic.com)
2. นำมาใส่ในตัวแปร `ANTHROPIC_API_KEY` ในไฟล์ `.env.local`

## 7. อัปโหลดขึ้นระบบจริงด้วย Vercel (Deploy to Vercel)

1. Push โค้ดทั้งหมดขึ้น GitHub
2. นำโปรเจคไปเชื่อมต่อใน [vercel.com](https://vercel.com)
3. ใส่ค่า Environment variables ทั้งหมดที่ได้เตรียมไว้ (จากไฟล์ `.env.example`)
4. กด Deploy (ระบบจะใช้โซน `sin1` หรือสิงคโปร์ ตามที่ตั้งไว้ในไฟล์ `vercel.json`)

## รายการตรวจสอบหลังทำเสร็จ (Testing Checklist)

- [ ] ลองเข้าสู่ระบบด้วยเบอร์โทรศัพท์ (OTP) ว่าใช้ได้ไหม
- [ ] ลองอัปโหลดรูปสลิป → ดูว่า AI ดึงข้อมูลได้ไหม
- [ ] หน้าตรวจสอบข้อมูล (Review page) แสดงระดับความมั่นใจของ AI 
- [ ] หน้า Dashboard แสดงผลรวมรายเดือนได้
- [ ] กราฟในหน้า Analytics แสดงผลได้ถูกต้อง
- [ ] ลองสร้างข้อมูลทดสอบ (Seed demo data) จากหน้า Settings
- [ ] สร้างคำแนะนำทางการเงินจาก AI (ต้องมีรายการอย่างน้อย 3 รายการ)
- [ ] ลองกดล้างข้อมูล (Clear all data) ว่าทำงานได้
- [ ] ทดสอบอัปโหลดสลิปของจริง: KBank, SCB, PromptPay
