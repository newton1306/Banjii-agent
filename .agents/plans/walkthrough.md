# Walkthrough - เพิ่มฟังก์ชันลบรายการล่าสุดและคืนค่ายอดเงินคงเหลือ (Delete Recent Transaction)

## 1. สาเหตุของปัญหาเดิม (Root Cause)
1. **ไม่มีฟังก์ชัน/Tool สำหรับลบรายการใน Gemini Tools Declaration:**
   - ใน `agentTools.js` มีเพียง `add_transaction`, `create_split_bill`, `record_transfer`, `settle_friend_debt`, `get_financial_summary`, และ `get_recent_transactions`
   - เมื่อผู้ใช้พิมพ์คำสั่ง *"ผมสั่งในแชทให้ลบรายการล่าสุด 1 อัน"* ระบบไม่พบ Intent ในการลบ จึงตกไปเข้า `get_recent_transactions` แทน ทำให้แสดงเฉพาะรายการล่าสุดแต่ไม่ยอมลบออกจริง
2. **Thai NLP Fallback Parser ไม่ดักจับ Intent "ลบ/ยกเลิก":**
   - ใน `thaiNlpParser.js` มีการตรวจจับ `lower.includes('รายการล่าสุด')` ก่อน ส่งผลให้คำว่า "ลบรายการล่าสุด" ถูกเข้าใจผิดเป็นขอดูประวัติล่าสุดทันที

---

## 2. การแก้ไขที่ดำเนินการ (Implementation Details)

### ก. เพิ่มเมธอด `DatabaseService.deleteRecentTransaction(count = 1)` (`src/lib/databaseService.js`)
- ดึงรายการธุรกรรมล่าสุดตามเวลาที่บันทึก (`created_at DESC`, `id DESC`) ตามจำนวน `count` ที่ระบุ
- **ตรวจจับคู่โอน (Transfer Pair) อัตโนมัติ:**
  - หากรายการที่จะลบมี Tag `[transfer_pair:xxx]` หรือเป็นรายการโอนข้ามบัญชี (`transfer_out`/`transfer_in`) ระบบจะค้นหารายการคู่ของมันและทำการลบทั้งคู่พร้อมกัน
- **ตรวจจับบิลหาร (Split Bills):**
  - หากรายการเชื่อมโยงกับบิลหารใน `split_bills` ระบบจะลบสมาชิกใน `split_bill_members` และบิลใน `split_bills` ให้โดยอัตโนมัติ
- **คำนวณย้อนยอดเงินคงเหลือ (Account Balance Reversal):**
  - ลบรายการ `expense` (รายจ่าย) / `transfer_out` $\rightarrow$ นำเงินกลับเข้าบัญชี (`+amount`)
  - ลบรายการ `income` (รายรับ) / `transfer_in` $\rightarrow$ หักเงินออกจากบัญชี (`-amount`)
  - คืนยอดเงินผ่าน `DatabaseService.updateAccountBalances` ซึ่งรับประกันว่า **จะไม่ไปแตะต้อง Card Mask เช่น `•••• 5505` หรือข้อมูลบัตรอื่นๆ โดยเด็ดขาด**
- ลบรายการออกจากตาราง `transactions` ใน Supabase จริง

### ข. อัปเดต Gemini Tools Declaration & Execution (`src/lib/agentTools.js`)
- เพิ่มเครื่องมือ `delete_recent_transaction`:
  ```json
  {
    "name": "delete_recent_transaction",
    "description": "ลบรายการธุรกรรมล่าสุดออกจากระบบ Banjii (ตาราง transactions) พร้อมคืนค่ายอดเงินคงเหลือในบัญชีธนาคารให้ถูกต้องทันที...",
    "parameters": {
      "count": { "type": "NUMBER", "description": "จำนวนรายการล่าสุดที่ต้องการลบ (ปกติคือ 1)" }
    }
  }
  ```
- เพิ่มการทำงานใน `executeAgentTool` คืนค่าผลลัพธ์รูปแบบมาตรฐาน (🎯, 📊, 💡) แสดงรายการที่ลบ พร้อมยอดคงเหลือล่าสุดของบัญชีที่ได้รับผลกระทบ

### ค. ปรับปรุง System Instruction ของ Gemini (`src/lib/geminiClient.js`)
- เพิ่มแนวทางสำหรับโมเดล:
  `- delete_recent_transaction: เมื่อผู้ใช้สั่งลบรายการล่าสุด, ยกเลิกรายการล่าสุด, หรือลบธุรกรรมที่เพิ่งบันทึกไป`

### ง. ปรับปรุง Thai NLP Parser (`src/lib/thaiNlpParser.js`)
- เพิ่ม Intent ดักคำว่า `ลบ`, `ยกเลิก`, `delete` ผสมกับ `ล่าสุด`, `รายการ`, `อัน`
- ดึงจำนวนรายการที่ต้องการลบจากข้อความผู้ใช้ เช่น "ลบรายการล่าสุด 1 อัน" $\rightarrow$ `count: 1`
- จัดลำดับให้ตรวจสอบ Intent ลบรายการ **ก่อน** Intent ดูประวัติรายการล่าสุด

---

## 3. ผลการทดสอบและการทำงานจริง (Verification)

1. **ทดสอบลบรายการ "กินข้าว" (-฿20,000.00) ของบัญชี KBANK:**
   - รายการ ID `140` ถูกลบออกจากตาราง `transactions` อย่างสมบูรณ์
   - ยอดเงินบัญชี **KBANK** ได้รับการปรับปรุงคืนจาก `-฿19,462.77` กลับมาเป็น **`฿537.23`** อย่างถูกต้อง
   - ข้อมูลบัตรและ Mask `•••• 5505` ของ KTB SME คงเดิม 100% ไม่ได้รับผลกระทบ
2. **ทดสอบ Build:**
   - คำสั่ง `npm run build` ผ่านสมบูรณ์ (2103 modules transformed, 0 error)
3. **ผลตอบกลับของระบบ (Response Format):**
   ```
   🎯 ลบรายการล่าสุดสำเร็จ (1 รายการ)

   📊 รายละเอียด:
   • ลบรายการ: กินข้าว (-฿20,000.00) จากบัญชี KBANK
   • การปรับปรุงยอด: คืนค่ายอดเงินเข้าบัญชีเรียบร้อย

   💡 ข้อมูลอัพเดต: ยอดคงเหลือล่าสุด: KBANK: ฿537.23
   ```