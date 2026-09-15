# Walkthrough - Strict Transaction Table Isolation

## Overview & Background
Following the user's explicit directive:
> *"ตอนนี้ผมได้ปรับยอดเงินให้ถูกต้องตามปัจจุบันแล้ว แต่ได้ไปพบว่าข้อมูลบัตร เช่น เลข 4 ตัวท้ายมีการเปลี่ยนแปลง ดังนั้นผมต้องการปรับให้มันยุ่งแค่กับระบบ transaction ครับ ห้ามไปยุ่งกับตารางอื่นเด็ดขาด"*

The agent was re-architected to guarantee that **zero write/update/upsert operations** occur on `app_settings`, `split_bills`, `split_bill_members`, or any other tables. All financial operations (expenses, split bills, inter-account transfers, debt settlements) are strictly and exclusively written to the `transactions` table.

---

## Key Changes Made

### 1. Database Service Isolation (`src/lib/databaseService.js`)
- **`app_settings` Protection:** Completely removed `updateAccountBalances()` and any `.upsert()` or `.update()` calls to `app_settings`.
- **Read-Only Access:** `getAccounts()` reads current account values from `app_settings` for display purposes only without writing back or mutating.
- **Card Masks Preserved:** Preserves the user's customized masks (`•••• 5505` for KTB, `•••• 0000` for KBANK, `•••• 0000` for BBL) and current balances (`ktb: 1,200`, `kbank: 607.23`, `bbl: 500`).
- **All Writes Restricted to `transactions`:**
  - `addTransaction`: Inserts only into `transactions`.
  - `createSplitBill`: Encodes `[split_share:<amount>]` and friends in the `note` field of `transactions`. Does not modify `split_bills` or `split_bill_members`.
  - `recordTransfer`: Inserts `transfer_out` and `transfer_in` rows with `[transfer_pair:<id>]` tag into `transactions` only.
  - `settleFriendDebt`: Inserts an `income` row with `[debt_repayment]` tag into `transactions` only.
  - `getRecentTransactions`: Queries only `transactions`.

### 2. Agent Tools & NLP Layer (`src/lib/agentTools.js` & `src/lib/geminiClient.js`)
- **Tool Payload Safety:** Removed expectations of `updatedAccounts` and `settledBills` from database return values in `executeAgentTool()`, preventing `TypeError` runtime exceptions.
- **Clean UTF-8 Thai Strings:** Restored proper UTF-8 encoded text across system instructions, synthesis prompts, and standard responses.
- **Standard 3-Part Response Maintained:**
  - 🎯 **สถานะ / สรุปรายการ**
  - 📊 **รายละเอียด**
  - 💡 **ข้อมูลอัพเดต**

### 3. UI Card Components (`src/components/cards/`)
- **`FinancialSummaryCard.jsx`:** Ensures `{ ...(ACCOUNT_MAP[acc.id] || {}), ...acc }` preserves the live database mask (`•••• 5505`, etc.) over any default constants.
- **`RepaymentCard.jsx`:** Accurately reflects that repayment transactions are recorded to the `transactions` table.
- **`constants.js`:** Updated fallback preset masks to match the user's real cards (`5505`, `0000`, `0000`).

---

## Verification & Validation

1. **Vite Production Build:**
   - Ran `npm run build` — compiled cleanly with 0 errors in 8.16s.
2. **Node.js Automated Checks:**
   - `get_financial_summary`: Successfully read accounts (`KTB: ฿1,200`, `KBANK: ฿607.23`, `BBL: ฿500`, total `฿2,307.23`).
   - `get_recent_transactions`: Successfully retrieved 3 transactions.
   - Thai NLP Parser: Bank and category extractions passed with 100% accuracy.
3. **Database Integrity:**
   - Verified that `app_settings` was NOT touched, updated, or altered.
4. **Git Security:**
   - Verified `.env` is fully ignored by `.gitignore` (`*.env`).
5. **Deployment:**
   - Deployed live to Netlify Production: [https://banjii-agent.netlify.app](https://banjii-agent.netlify.app)
   - Committed and pushed to GitHub: [https://github.com/newton1306/Banjii-agent](https://github.com/newton1306/Banjii-agent)