# Walkthrough - Banjii Conversational Financial AI Agent

เว็บแอปพลิเคชัน **Banjii Conversational Financial AI Agent** ได้รับการพัฒนาและ Deploy พร้อมใช้งานเรียบร้อยแล้ว ทั้งบน GitHub และ Netlify Production

---

## 🌐 ลิงก์ระบบที่พร้อมใช้งาน
- **Live Production URL:** [https://banjii-agent.netlify.app](https://banjii-agent.netlify.app)
- **GitHub Repository:** [https://github.com/newton1306/Banjii-agent](https://github.com/newton1306/Banjii-agent)

---

## 🎯 สรุปผลการตอบกลับและฟอร์แมตมาตรฐาน (Consistent Response Format)

Agent ถูกกำหนดให้ตอบกลับในโครงสร้างที่เป็นระเบียบ สวยงาม และคงที่ทุกครั้ง:
1. 🎯 **สถานะ / สรุปรายการ:** สรุปการทำรายการชัดเจน
2. 📊 **รายละเอียด:** จำนวนเงิน, บัญชี, หมวดหมู่, สมาชิก, ส่วนของผู้ใช้
3. 💡 **ข้อมูลอัพเดต:** ยอดเงินคงเหลือล่าสุดของบัญชี หรือสถานะหนี้ค้าง
4. 🃏 **Interactive Rich Cards:** แสดงผลการ์ดธุรกรรมตามประเภท (รายจ่าย, บิลหาร, โอนเงิน, คืนเงินหนี้, สรุปภาพรวม)

---

## 🛡️ การจัดการความปลอดภัยและ Edge Cases (สมบูรณ์ 100%)

| ข้อกำหนด | ผลการตรวจสอบ |
|---|---|
| **ป้องกันการลบข้อมูล (Prevent Data Wipe)** | มีฟังก์ชัน `preventDestructiveWipe()` สกัดกั้นการ Wipe/Purge/Truncate ฐานข้อมูลอย่างเด็ดขาด |
| **ห้ามนำ `.env` ขึ้น GitHub** | กำหนด `.gitignore` อย่างเข้มงวด ตรวจสอบด้วย `git check-ignore -v .env` และ Push ขึ้น GitHub โดยปราศจาก `.env` 100% |
| **Auto Friend Creation** | เมื่อหารบิลกับเพื่อนที่ยังไม่มีชื่อใน `app_settings.friends` ระบบจะสร้าง Object เพื่อนใหม่ทันที และไม่ปล่อยให้ `name` เป็นค่าว่าง |
| **BigInt `linked_transaction_id`** | บันทึก `transactions` ก่อนเสมอเพื่อรับตัวเลข BigInt ID จริง แล้วจึงส่งไปยัง `split_bills.linked_transaction_id` ป้องกัน Error `22P02` |
| **Non-null `bill_id`** | `split_bill_members` ทุกคนถูกผูกกับ `bill_id` ที่ได้จาก `split_bills.id` เสมอ |
| **อัพเดตยอดคงเหลือในบัญชี** | ทุกธุรกรรมจะคำนวณและอัพเดต `app_settings.accounts` ทันที (Expense -, Income +, Transfer ต้นทาง- ปลายทาง+) |
| **Debt Settlement** | เมื่อเพื่อนโอนคืน ระบบตัดหนี้ใน `split_bill_members` (ปรับ `paid_amount`, `is_paid = true`), บันทึก Transaction Income `[debt_repayment]`, และเพิ่มเงินเข้าบัญชี |
| **3 Strict Banks & GMT+7** | จำกัดเฉพาะ `ktb` (KTB SME), `kbank` (KBANK), `bbl` (KMUTT Student) และใช้วันที่ Asia/Bangkok `YYYY-MM-DD` เสมอ |

---

## 🧪 ผลการทดสอบคำสั่งจริง (Test Results)

1. **"ตอนนี้เหลือเงินแต่ละบัญชีเท่าไหร่ และใครติดเงินเราบ้าง"**
   - ดึงยอดเงิน 3 บัญชีและรายการหนี้เพื่อนจาก Supabase Real-time พร้อมแสดงผลเป็นการ์ด `FinancialSummaryCard`
2. **"กินข้าวแกงกะหรี่ 180 จ่าย kbank"**
   - บันทึกรายจ่าย 180 บาท, หักบัญชี KBANK, แสดง `ExpenseCard`
3. **"จ่ายค่าคอร์ทแบด 995 ktb หารกับ Nine, Praew, Non คนละเท่าๆ กัน ส่วนเรา 70"**
   - สร้างเพื่อนใหม่ `Nine`, `Praew`, `Non` ลง `app_settings.friends`
   - บันทึก Transaction รายจ่าย (ได้รับ BigInt ID)
   - บันทึก `split_bills` และ `split_bill_members` คนละ 308.33 บาท
   - หักเงิน KTB 995 บาท, แสดง `SplitBillCard`
4. **"โอนเงินจาก ktb ไป kbank 500"**
   - บันทึก `transfer_out` และ `transfer_in` คู่กันพร้อม tag `[transfer_pair:...]`
   - KTB ลด 500, KBANK เพิ่ม 500, แสดง `TransferCard`
5. **"Non โอนคืน 150 เข้า kbank"**
   - ตัดหนี้ของ Non ใน `split_bill_members`, เพิ่มเงินเข้า KBANK 150 บาท
   - บันทึก `Auto Debt Settlement (Non)`, ยิง Confetti, แสดง `RepaymentCard`
