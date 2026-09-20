# Walkthrough - เพิ่มการ์ด "Cash" (ภาษาอังกฤษ) และบันทึกรายการธุรกรรม

## 1. ผลการดำเนินงานสรุป (Executive Summary)
1. **เพิ่มการ์ด "Cash" (ภาษาอังกฤษ):**
   - เพิ่มบัญชี `Cash` (ประเภท `cash`, Mask `•••• CASH`, โทนสี `.card-grad-cash` / Emerald Green เมทัลลิก)
   - เพิ่มดีไซน์การ์ดหน้าบัตรภาษาอังกฤษ "Cash Wallet / Physical Currency" ในหน้า Wallet Cards Carousel ของระบบ Banjii
   - อัปเดตโครงสร้างระบบและโมเดล AI ใน Banjii-agent ให้รู้จักและรองรับบัญชี `cash`
2. **การโอนเงินจาก KTB ไปยัง Cash ฿400.00:**
   - หักยอดเงินจากบัญชี **KTB SME** ฿400.00 (จากเดิม ฿1,292.00 $\rightarrow$ **฿892.00**)
   - บันทึกคู่ธุรกรรมการโอนเงินข้ามบัญชี (`transfer_out` และ `transfer_in` รหัสคู่ `[transfer_pair:tr_..._cash]`)
3. **การบันทึกรายรับ Family Support จาก "คุณย่า" ฿1,000.00:**
   - บันทึกรายรับประเภท `income` หมวดหมู่ `family` ชื่อรายการ `"คุณย่า"` เข้าบัญชี `cash`
4. **การรักษากฎความปลอดภัยข้อมูล (Strict Isolation):**
   - Card Mask เดิมของ **KTB SME (`•••• 5505`)** และ **KMUTT Student (`•••• 0000`)** คงเดิม 100%
   - ยอดเงินบัญชี **KBANK (฿554.23)** และ **KMUTT Student (฿500.00)** ไม่ถูกแตะต้องแม้แต่น้อย

---

## 2. สถานะยอดเงินคงเหลือปัจจุบัน (Account Balances Reconciliation)

| บัญชี | ยอดก่อนหน้า | การเปลี่ยนแปลง | ยอดคงเหลือปัจจุบัน | หมายเหตุ |
| :--- | :--- | :--- | :--- | :--- |
| **KTB SME** (`ktb`) | ฿1,292.00 | -฿400.00 | **฿892.00** | โอนไป Cash (คง Mask `•••• 5505`) |
| **KBANK** (`kbank`) | ฿554.23 | ฿0.00 | **฿554.23** | คงเดิม ไม่แตะต้อง |
| **KMUTT Student** (`bbl`) | ฿500.00 | ฿0.00 | **฿500.00** | คงเดิม ไม่แตะต้อง |
| **Cash** (`cash`) | *สร้างใหม่* | +฿400.00 (โอน) + ฿1,000.00 (คุณย่า) | **฿1,400.00** | การ์ดใหม่ ภาษาอังกฤษ |
| **รวมทรัพย์สินทั้งหมด** | ฿2,346.23 | +฿1,000.00 (รายรับสุทธิ) | **฿3,346.23** | ยอดถูกต้องตรงตามจริง |

---

## 3. รายการธุรกรรมที่บันทึกเพิ่มลงในตาราง `transactions`

1. **Transaction ID 159 (Transfer Out):**
   - **ชื่อรายการ:** `Transfer to Cash`
   - **จำนวนเงิน:** `฿400.00`
   - **ประเภท:** `transfer_out` | **หมวดหมู่:** `bills`
   - **บัญชี:** `ktb`
   - **หมายเหตุ:** `[transfer_pair:tr_1789908599101_cash] Inter-account transfer to Cash`
2. **Transaction ID 160 (Transfer In):**
   - **ชื่อรายการ:** `Transfer from KTB SME`
   - **จำนวนเงิน:** `฿400.00`
   - **ประเภท:** `transfer_in` | **หมวดหมู่:** `salary`
   - **บัญชี:** `cash`
   - **หมายเหตุ:** `[transfer_pair:tr_1789908599101_cash] Inter-account transfer from KTB SME`
3. **Transaction ID 161 (Income):**
   - **ชื่อรายการ:** `คุณย่า`
   - **จำนวนเงิน:** `฿1,000.00`
   - **ประเภท:** `income` | **หมวดหมู่:** `family`
   - **บัญชี:** `cash`
   - **หมายเหตุ:** `Family support`

---

## 4. รายละเอียดการปรับแต่งโค้ด (Code Changes)

### Banjii (Main Web App)
- **`src/types/constants.js`:** เพิ่ม Preset บัญชี `cash` ใน `BANK_PRESETS`
- **`src/components/BankCardGraphic.jsx`:** เพิ่มคอมโพเนนต์หน้าการ์ดเงินสดภาษาอังกฤษ (Cash Wallet Card Face) พร้อมสัญลักษณ์ Banknote และ badge `THB • CASH`

### Banjii-agent (AI Agent App)
- **`src/types/constants.js`:** เพิ่ม `cash` ใน `STRICT_ACCOUNTS`
- **`src/lib/agentTools.js`:** ขยาย enums ใน Tool declarations ให้รองรับบัญชี `cash`
- **`src/lib/geminiClient.js`:** ปรับปรุง System Instruction ของ Gemini ให้ระบุ 4 บัญชี (`ktb`, `kbank`, `bbl`, `cash`)
- **`src/lib/thaiNlpParser.js`:** ปรับ regex ให้แปลงคำว่า `เงินสด` / `cash` ไปยัง `cash` และหมวดหมู่ `family`