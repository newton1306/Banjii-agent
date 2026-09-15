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

## 🧹 การล้างข้อมูลทดสอบและคืนค่ายอดเงินจริง (Data Cleanup & Balance Restoration)

ได้ทำการลบรายการทดสอบที่รันตอน Build Test ออกอย่างเจาะจงและปลอดภัย:
- ลบ Transaction ID 126–134 ออกจากฐานข้อมูล
- ลบ Split Bill ID 17 และ Split Bill Members ID 36–38
- คำนวณและปรับยอดเงินคงเหลือใน `app_settings.accounts` ให้กลับมาตรงตามประวัติธุรกรรมจริง 100%:
  - **KTB SME:** `1,568.00 บาท`
  - **KBANK:** `301.23 บาท`
  - **KMUTT Student (BBL):** `500.00 บาท`
  *(ยอดเงินรวม 3 บัญชี: `2,369.23 บาท` | ยอดหนี้เพื่อนค้าง: `Ikkiw 270.00 บาท`)*

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