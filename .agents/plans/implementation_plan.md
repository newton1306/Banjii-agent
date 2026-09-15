# Implementation Plan - Banjii Conversational AI Agent Web App

สร้างเว็บแอปพลิเคชันใหม่ **Banjii Conversational AI Agent** (`Banjii-agent`) เพื่อเป็นคู่หูผู้ช่วยทางการเงินอัจฉริยะ (Conversational Financial AI Agent) สั่งงานด้วยภาษาไทยธรรมชาติ เชื่อมต่อกับฐานข้อมูลหลัก Supabase ของ Banjii โดยตรง รองรับ Gemini Function Calling และระบบ Rich Interactive Transaction Cards

---

## User Review Required

> [!IMPORTANT]
> **1. การเชื่อมต่อ AI Model (Google Gemini API & Fallback)**
> - รองรับ **Google Gemini API** (`gemini-2.0-flash` / `gemini-1.5-flash`) ผ่าน Tool Calling (Function Calling) เต็มรูปแบบ
> - สามารถตั้งค่า `VITE_GEMINI_API_KEY` ใน `.env` หรือกรอกผ่าน **Settings Modal** ในหน้าเว็บ (เก็บลง `localStorage` อย่างปลอดภัย)
> - มี **Built-in Thai NLP Rule-based Fallback Parser** ให้พร้อมใช้งานได้ทันที 100% แม้ยังไม่ได้ใส่ API Key เพื่อความสะดวกรวดเร็วในการทดสอบและใช้งาน

> [!IMPORTANT]
> **2. Netlify Deployment**
> - เตรียมพร้อม deploy ขึ้น Netlify ทันทีผ่าน Netlify CLI และ Git
> - พร้อมไฟล์ `netlify.toml` สำหรับ Single Page Application (SPA) routing และ security headers

---

## โครงสร้างโปรเจกต์ (Project Structure)

โปรเจกต์จะถูกสร้างขึ้นใน `C:\Users\nsand\Documents\self_product\Banjii-agent`:

```
Banjii-agent/
├── .agents/
│   └── plans/
│       └── implementation_plan.md
├── .env
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
├── netlify.toml
├── public/
│   ├── avatars/
│   │   ├── male-animated.svg
│   │   └── female-animated.svg
│   ├── cards/
│   │   ├── kbank-gen.png
│   │   ├── ktb-sme-gen.png
│   │   └── kmutt-bbl-isolated.png
│   └── banjii-icon.svg
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── lib/
│   │   ├── supabase.js             # Supabase Client Singleton
│   │   ├── dateUtils.js            # Asia/Bangkok (GMT+7) Timezone formatters
│   │   ├── databaseService.js      # Supabase CRUD operations & Edge cases handling
│   │   ├── agentTools.js           # 6 Tool definitions & executors
│   │   ├── geminiClient.js         # Gemini 2.0 Flash Function Calling client
│   │   └── thaiNlpParser.js        # Built-in instant Thai NLP Fallback Engine
│   ├── types/
│   │   └── constants.js            # 3 Bank Presets, Categories, Colors, Note Tags
│   └── components/
│       ├── Header.jsx              # Top bar, Account Balances Pill, Settings trigger
│       ├── ChatContainer.jsx       # Chat message thread with smooth auto-scroll
│       ├── ChatInput.jsx           # Input bar with submit & quick action triggers
│       ├── QuickPromptChips.jsx    # Quick shortcut chips (ข้าว, ตีแบด, เช็คเงิน, ใครค้าง)
│       ├── SettingsModal.jsx       # API Key config & preferences modal
│       └── cards/                  # Rich Interactive Transaction Cards
│           ├── ExpenseCard.jsx         # Card แสดงบันทึกรายจ่าย/รายรับ
│           ├── SplitBillCard.jsx       # Card แสดงรายละเอียดบิลหารและรายชื่อเพื่อน
│           ├── TransferCard.jsx        # Card แสดงการโอนเงินระหว่างบัญชี
│           ├── RepaymentCard.jsx       # Card แสดงการคืนเงินหนี้
│           ├── FinancialSummaryCard.jsx# Card แสดงสรุปยอดเงินและหนี้ค้าง
│           └── RecentTransactionsCard.jsx # Card แสดงรายการล่าสุด
```

---

## รายละเอียดการจัดการ EDGE CASES (ห้ามผิดพลาด)

| Edge Case | ปัญหาที่อาจเกิดขึ้น | วิธีการแก้ไขและป้องกันในโค้ด |
|---|---|---|
| **1. Auto Friend Creation** | เพื่อนใหม่ไม่มีในระบบ ทำให้ `name` เป็น null หรือหลุด | ก่อนบันทึกบิลหาร เช็คใน `app_settings` (`key = 'friends'`) แบบ Case-insensitive หากไม่พบ ต้องสร้าง Object: `{ id: 'friend_' + timestamp, name, gender: 'male', avatar: '/avatars/male-animated.svg', badgeColor: 'border-blue-400', totalDebt: 0 }` แล้วบันทึกลงฐานข้อมูลทันที ห้ามปล่อยให้ `name` ว่างเด็ดขาด |
| **2. BigInt `linked_transaction_id`** | ส่ง String ชั่วคราว (เช่น `tmp_...`) ทำให้ Postgres เกิด Error `22P02 invalid input syntax for type bigint` | ต้องรัน `insertTransaction` ให้เสร็จก่อน เพื่อรับ `id` ที่เป็น bigint ตัวเลขจริง (เช่น `111`) แล้วจึงส่งค่านั้นไปยัง `split_bills.linked_transaction_id` |
| **3. Non-null `bill_id`** | สมาชิกไม่มี bill_id ผูก | รัน `insertSplitBill` ให้ได้ ID ก่อน แล้วนำ `bill_id` ใส่ในทุกสมาชิกของ `split_bill_members` เสมอ |
| **4. Balance Update** | Supabase ไม่มี DB Trigger ปรับยอด | ใน `databaseService.js` ทุกครั้งที่มีธุรกรรม ต้องคำนวณและอัพเดต `app_settings.accounts` ทันที: รายจ่ายลบ, รายรับบวก, โอนเงินต้นทางลบปลายทางบวก |
| **5. Debt Settlement** | เพื่อนโอนคืนไม่ตรงบิล หรือไม่ปรับสถานะหนี้ | บันทึก Transaction รายรับ (`Auto Debt Settlement (${name})`, note: `⚡ Multi-bill auto settlement [debt_repayment]`), ค้นหาหนี้ค้างใน `split_bill_members` ของเพื่อน แล้วอัพเดต `paid_amount` และ `is_paid = true` ตามยอดเงินที่โอนคืน พร้อมเพิ่มยอดในบัญชีธนาคารปลายทาง |
| **6. Strict 3 Accounts & Timezone** | มีบัญชีแปลกปลอม หรือวันที่คลาดเคลื่อนตาม UTC | ล็อคเฉพาะ `ktb`, `kbank`, `bbl` (default `kbank`), คำนวณวันที่ตามเวลาประเทศไทย GMT+7 `YYYY-MM-DD` เสมอ |

---

## สเปก Tool Calling ทั้ง 6 ฟังก์ชัน (Agent Tools Spec)

1. `add_transaction(title, amount, type, account_id, category, date, note, target_portion)`
   - บันทึกรายรับ/รายจ่าย พร้อมปรับยอดคงเหลือในบัญชี และใส่ tag `[target_portion:...]` ตามเงื่อนไข
2. `create_split_bill(title, total_amount, account_id, date, my_share, members: [{ name, amount, is_paid }])`
   - ตรวจสอบ/สร้างเพื่อนใหม่ใน `app_settings` อัตโนมัติ
   - บันทึก Transaction รายจ่าย (ดึง BigInt ID)
   - บันทึก `split_bills` และ `split_bill_members`
   - ปรับลดเงินในบัญชี
3. `record_transfer(source_account, dest_account, amount, date)`
   - สร้าง Pair ID `tr_timestamp_rand`
   - บันทึก `transfer_out` และ `transfer_in` คู่กัน พร้อมแท็ก `[transfer_pair:...]`
   - ปรับลดยอดต้นทาง และเพิ่มยอดยังปลายทาง
4. `settle_friend_debt(friend_name, amount, deposit_account, date)`
   - ค้นหาบิลค้างชำระของเพื่อนคนนั้น
   - อัพเดต `split_bill_members` (ปรับ `paid_amount`, `is_paid = true`)
   - บันทึก Transaction รายรับ `[debt_repayment]`
   - ปรับเพิ่มเงินในบัญชีปลายทาง
5. `get_financial_summary()`
   - ดึงยอดคงเหลือ 3 บัญชีจาก `app_settings`
   - คำนวณยอดเงินที่เพื่อนแต่ละคนค้างเราอยู่ทั้งหมด
   - คืนข้อมูลให้แสดงผลเป็นการ์ดสรุปภาพรวมการเงิน
6. `get_recent_transactions(limit)`
   - ดึงประวัติรายการล่าสุดตามจำนวนที่กำหนด

---

## แผนการสร้างและการยืนยัน (Verification Plan)

### การติดตั้งและสร้างโปรเจกต์:
1. สร้างไฟล์คอนฟิก `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `netlify.toml`
2. คัดลอก assets (รูปบัตรธนาคาร, animated avatars) จาก `Banjii` มาไว้ใน `Banjii-agent/public`
3. สร้าง Database Service, AI Engine, Tool Definitions, และ Thai NLP Parser
4. สร้าง UI หน้าแชท Mobile-first Dark mode โทน Banjii Fintech (`#0A0A12`, Card `#181826`, Neon Lime `#D4F933`, Purple `#5B4EFF`)
5. ติดตั้ง dependencies (`npm install`)
6. รันทดสอบ build (`npm run build`)

### การทดสอบคำสั่งจริง (Test Prompts):
1. **ทดสอบบันทึกรายจ่ายทั่วไป**: "กินข้าวแกงกะหรี่ 180 จ่าย kbank"
   - ตรวจสอบ: transaction ถูกสร้าง, บัญชี kbank ถูกหัก 180 บาท
2. **ทดสอบหารบิลกับเพื่อนใหม่**: "จ่ายค่าคอร์ทแบด 995 ktb หารกับ Nine, Praew, Non คนละเท่าๆ กัน ส่วนเรา 70"
   - ตรวจสอบ: ชื่อเพื่อนใหม่ถูกสร้างลง `app_settings.friends`, transaction ถูกสร้างเพื่อเอา BigInt ID, `split_bills` และ `split_bill_members` ถูก insert ครบถ้วน, note มี `[split_share:70]`
3. **ทดสอบโอนเงินข้ามบัญชี**: "โอนเงินจาก ktb ไป kbank 500"
   - ตรวจสอบ: บันทึก transfer_out ktb 500, transfer_in kbank 500, tag `[transfer_pair:...]` ตรงกัน, บัญชี ktb ลด 500, kbank เพิ่ม 500
4. **ทดสอบเพื่อนคืนเงิน**: "Non โอนคืน 150 เข้า kbank"
   - ตรวจสอบ: หนี้ของ Non ใน `split_bill_members` ถูกตัด, transaction รายรับ `[debt_repayment]` ถูกบันทึก, kbank เพิ่ม 150
5. **ทดสอบสอบถามยอดเงินและหนี้**: "ตอนนี้เหลือเงินแต่ละบัญชีเท่าไหร่ และใครติดเงินเราบ้าง"
   - ตรวจสอบ: แสดงการ์ดสรุปยอดคงเหลือของ ktb, kbank, bbl และรายการหนี้ของเพื่อนแต่ละคนถูกต้อง

### การ Deploy:
- เตรียม Git repository ใน `Banjii-agent`
- Deploy ขึ้น Netlify ด้วย `netlify deploy --prod` หรือเชื่อมต่อกับ site
