# Implementation Plan: Add English "Cash" Account & Record Transactions

Add a new card/account for **"Cash"** (in English), perform a **฿400 inter-account transfer from KBANK to Cash**, record **฿1,000 Family support income from คุณย่า into Cash**, and strictly isolate all modifications so zero other accounts, settings, or data are affected.

## User Review Required

> [!IMPORTANT]
> **Strict Isolation & Zero-Side-Effect Guarantee:**
> - Only the `app_settings` (key: `accounts`) and `transactions` tables will be updated.
> - Existing card details (such as KTB SME mask `•••• 5505`, BBL mask, and KBANK settings) will be **100% preserved without any alteration**.
> - The new account is strictly in English: `name: "Cash"`, `brand: "Cash"`, `type: "cash"`, `mask: "•••• CASH"`.

### Financial Balance Reconciliation

| Account | Before | Change | After | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **KTB SME** (`ktb`) | ฿1,292.00 | ฿0.00 | **฿1,292.00** | Strict preservation (`•••• 5505`) |
| **KBANK** (`kbank`) | ฿554.23 | -฿400.00 | **฿154.23** | Deducted for transfer to Cash |
| **KMUTT Student** (`bbl`) | ฿500.00 | ฿0.00 | **฿500.00** | Strict preservation |
| **Cash** (`cash`) | *New (฿0.00)* | +฿400 (transfer) + ฿1,000 (income) | **฿1,400.00** | New English Cash Wallet card |
| **Total Net Assets** | ฿2,346.23 | +฿1,000.00 | **฿3,346.23** | Reconciled & balanced |

---

## Proposed Changes

### 1. Database & State Layer (Supabase)

#### `app_settings` (`key: 'accounts'`)
- Append the new Cash account to the current account list:
  ```json
  {
    "id": "cash",
    "bank": "Cash",
    "mask": "•••• CASH",
    "name": "Cash",
    "type": "cash",
    "brand": "Cash",
    "balance": 1400.00,
    "cardImage": "",
    "colorClass": "card-grad-cash",
    "accentColor": "#10B981"
  }
  ```
- Update `kbank` balance from `554.23` to `154.23`.
- Leave `ktb` (`1292.00`, `mask: "•••• 5505"`) and `bbl` (`500.00`) completely untouched.

#### `transactions` Table
Insert three transactions with Bangkok GMT+7 date (`2026-09-20`):
1. **Transfer Out (KBANK):**
   - `title`: `"Transfer to Cash"`
   - `amount`: `400.00`
   - `type`: `"transfer_out"`
   - `category`: `"bills"`
   - `account_id`: `"kbank"`
   - `date`: `"2026-09-20"`
   - `note`: `"[transfer_pair:tr_1789889152000_cash] Inter-account transfer to Cash"`
2. **Transfer In (Cash):**
   - `title`: `"Transfer from KBANK"`
   - `amount`: `400.00`
   - `type`: `"transfer_in"`
   - `category`: `"salary"`
   - `account_id`: `"cash"`
   - `date`: `"2026-09-20"`
   - `note`: `"[transfer_pair:tr_1789889152000_cash] Inter-account transfer from KBANK"`
3. **Family Support Income (Cash):**
   - `title`: `"คุณย่า"`
   - `amount`: `1000.00`
   - `type`: `"income"`
   - `category`: `"family"`
   - `account_id`: `"cash"`
   - `date`: `"2026-09-20"`
   - `note`: `"Family support"`

---

### 2. Main App (`Banjii`)

#### [MODIFY] [constants.js](file:///c:/Users/nsand/Documents/self_product/Banjii/src/types/constants.js)
- Add English Cash preset to `BANK_PRESETS` with `iconName: 'Banknote'` and `colorClass: 'card-grad-cash'`.

#### [MODIFY] [BankCardGraphic.jsx](file:///c:/Users/nsand/Documents/self_product/Banjii/src/components/BankCardGraphic.jsx)
- Add dedicated high-fidelity English Cash Card Face to `BankCardFace`:
  - Deep emerald metallic background with clean banknote emblem.
  - "CASH WALLET" and "PHYSICAL CURRENCY" badges in English.
  - `CommonCardOverlay` with `defaultMask="•••• CASH"`.

---

### 3. Agent App (`Banjii-agent`)

#### [MODIFY] [constants.js](file:///c:/Users/nsand/Documents/self_product/Banjii-agent/src/types/constants.js)
- Add `cash` account definition to `STRICT_ACCOUNTS` (English name and mask).

#### [MODIFY] [agentTools.js](file:///c:/Users/nsand/Documents/self_product/Banjii-agent/src/lib/agentTools.js)
- Add `'cash'` to the `account_id`, `source_account`, `dest_account`, and `deposit_account` parameter enums across tools.

#### [MODIFY] [geminiClient.js](file:///c:/Users/nsand/Documents/self_product/Banjii-agent/src/lib/geminiClient.js)
- Update `SYSTEM_INSTRUCTION` to recognize the 4 accounts: `ktb`, `kbank`, `bbl`, and `cash`.

#### [MODIFY] [thaiNlpParser.js](file:///c:/Users/nsand/Documents/self_product/Banjii-agent/src/lib/thaiNlpParser.js)
- Add `'cash'` and `'เงินสด'` mapping in `extractBank()`.

---

## Verification Plan

### Automated Verification
1. **Database Inspection Script:**
   - Fetch `app_settings.accounts`: verify all 4 accounts exist, `Cash` balance is exactly `฿1,400.00`, `KBANK` is `฿154.23`, `KTB` is `฿1,292.00` (`•••• 5505`), `BBL` is `฿500.00`.
   - Fetch latest transactions from `transactions`: verify the 2 transfer pair records and the 1 income record.
2. **Build Validation:**
   - Run `npm run build` in `c:\Users\nsand\Documents\self_product\Banjii`.
   - Run `npm run build` in `c:\Users\nsand\Documents\self_product\Banjii-agent`.
3. **NLP Parser Test:**
   - Run script testing `ThaiNlpParser.extractBank('เงินสด')` and `extractBank('cash')`.

### Manual / Visual Verification
- Deploy `Banjii-agent` to Netlify and test live.
- Check that the wallet carousel in Banjii smoothly renders the new Cash card in English alongside the other 3 cards.
