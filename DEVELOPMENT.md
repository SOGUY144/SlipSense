# 🚀 SlipSense - Developer & Handoff Guide

เอกสารนี้ถูกจัดทำขึ้นเพื่อนักพัฒนา (Developer) หรือผู้ที่เข้ามารับช่วงต่อในการพัฒนาแอปพลิเคชัน **SlipSense** เพื่อให้เข้าใจโครงสร้างระบบ การทำงาน และจุดประสงค์ของแต่ละฟีเจอร์อย่างละเอียด

---

## 🏗️ โครงสร้างเทคโนโลยี (Tech Stack)

*   **Framework**: Next.js 15 (App Router) + React 19
*   **Styling**: Tailwind CSS v4 + `shadcn/ui`
*   **Database**: Neon Serverless Postgres
*   **ORM**: Drizzle ORM
*   **Authentication & Storage**: Supabase (Auth: OTP Phone Number, Storage: Slip Images)
*   **AI Engine**: Google Gemini 2.5 Flash (ใช้งานผ่าน `@google/generative-ai` และ `ai` SDK)

---

## 📂 โครงสร้างโฟลเดอร์หลัก (Key Directories)

*   `app/(app)/*` - หน้า UI หลักของแอป (Dashboard, Analytics, Transactions, Upload, Chat, Settings) ทุกหน้าถูกหุ้มด้วย `layout.tsx` ที่มีการตรวจสอบสิทธิ์ (Auth check) และโครงสร้างเมนู
*   `app/api/*` - Backend API Routes (RESTful APIs สำหรับดึงข้อมูลและทำงานหลังบ้าน)
*   `components/*` - React Components (รวมถึง `shadcn/ui` ในโฟลเดอร์ `ui/`)
*   `lib/db/schema.ts` - โครงสร้าง Database Schema (ตาราง `users`, `shops`, `transactions`, ฯลฯ)
*   `lib/ai/slip-extraction.ts` - ระบบสกัดข้อมูลจากสลิปด้วย AI

---

## 🛠️ ระบบการทำงานหลัก (Core Features)

### 1. ระบบอัปโหลดและวิเคราะห์สลิป (Slip Extraction)
ระบบนี้คือหัวใจหลักของแอป เมื่อผู้ใช้อัปโหลดรูปสลิป:
1. ไฟล์ภาพจะถูกส่งไปเก็บที่ **Supabase Storage**
2. ระบบจะสร้าง Job (`slip_jobs`) ในฐานข้อมูลด้วยสถานะ `processing`
3. เรียกใช้ **Google Gemini 2.5 Flash** ส่ง Prompt เฉพาะทางให้ AI อ่านตัวอักษรบนภาพ และแยกข้อมูลออกมาเป็น JSON (ประกอบด้วย จำนวนเงิน, วันที่, คู่กรณี, และ **ประเภทธุรกรรมอัจฉริยะ (รายรับ/รายจ่าย) พร้อมหมวดหมู่**)
4. หากสำเร็จ จะสร้างรายการธุรกรรม (`transactions`) ลงฐานข้อมูลโดยอัตโนมัติ

### 2. ระบบแดชบอร์ดและการวิเคราะห์ (Dashboard & Analytics)
*   **API `GET /api/dashboard/summary`**: สรุปยอดรวมรายรับรายจ่ายของเดือนปัจจุบัน เทียบกับเดือนที่แล้ว พร้อมดึงประวัติการทำธุรกรรมล่าสุด โดยตั้งใจเรียงลำดับรายการด้วย `ORDER BY created_at DESC` เพื่อให้รายการที่เพิ่งถูกเพิ่ม (เช่น เพิ่งถ่ายสลิปเมื่อกี้) เด้งขึ้นมาอยู่บนสุดเสมอ ไม่ว่าสลิปนั้นจะลงวันที่อะไร
*   **API `GET /api/analytics`**: ดึงข้อมูลสรุปเป็นรายเดือนย้อนหลัง โดยคำนวณจากวันที่ของสลิปใบแรกสุดในระบบ ไปจนถึงปัจจุบัน (Dynamic Data Range) เพื่อให้ Recharts วาดกราฟเส้นได้สวยงาม

### 3. ระบบผู้ช่วย AI (Financial Chatbot)
*   **API `POST /api/chat`**: สร้างอยู่บน Vercel AI SDK (`ai` และ `@ai-sdk/google`)
*   **System Prompt**: จะทำการดึงข้อมูลธุรกรรมล่าสุดของผู้ใช้ 100 รายการมาแปะไว้ใน Prompt เป็นบริบทหลังบ้านเสมอ (RAG - Retrieval-Augmented Generation แบบพื้นฐาน) ทำให้ผู้ใช้สามารถแชทถามคำถามเจาะจงเกี่ยวกับบัญชีตัวเองได้ เช่น "เดือนนี้ใช้เงินไปเท่าไหร่แล้ว"
*   **UI (`app/(app)/chat/page.tsx`)**: หน้าจอแชทที่มีการรองรับการแสดงผล Markdown ด้วย `react-markdown`

### 4. ระบบข้อมูลตัวอย่าง (Demo Data Seeding)
มีปุ่มสำหรับล้างข้อมูลหรือใส่ข้อมูลสมมติ (Demo Transactions) สำหรับใช้เวลา Demo แอปให้นักลงทุนดูได้ทันที อยู่ที่เมนู `Settings` -> เรียก API `POST /api/seed`

---

## 🔑 ข้อมูลสำคัญสำหรับการตั้งค่า (Environment Variables)

ในการรันโปรเจกต์ จำเป็นต้องมี `.env.local` ดังนี้:

*   `DATABASE_URL` - ลิงก์เชื่อมต่อ Neon DB
*   `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - สำหรับ Supabase Auth & Storage
*   `GEMINI_API_KEY` - API Key ของ Google (จำเป็นต้องใช้รูปแบบ `AQ...` หรือ `AIza...` และเปิดใช้งาน Gemini 2.5 Flash ได้)

> 💡 **ข้อสังเกตสำคัญ:** 
> แอปนี้เคยถูกสร้างด้วย Anthropic Claude มาก่อนแต่ติดปัญหาเรื่องภูมิภาค จึงย้ายมาใช้ Google Gemini ถาวร และถูกปรับให้ใช้โมเดลรุ่น **2.5 Flash** เท่านั้น เพื่อให้รองรับกับระบบ Key ใหม่ (AQ) ของ Google

---

หวังว่าเอกสารฉบับนี้จะช่วยให้คุณสามารถพัฒนาต่อยอด SlipSense ได้อย่างราบรื่นครับ! 🚀
