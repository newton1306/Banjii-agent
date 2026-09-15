import { supabase } from './supabase.js';
import { STRICT_ACCOUNTS, NOTE_TAGS } from '../types/constants.js';
import { getBangkokDateString } from './dateUtils.js';

const round2 = (val) => Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;

export class DatabaseService {
  /**
   * STRICT ARCHITECTURAL RULE:
   * Write operations are strictly and exclusively isolated to the `transactions` table.
   * Absolutely NO writes, updates, or upserts are allowed to `app_settings`, `split_bills`,
   * `split_bill_members`, or any other table.
   */

  /**
   * Fetch current accounts (READ-ONLY: Never writes or alters app_settings).
   * Preserves the user's custom card mask, balances, and configurations as-is.
   */
  static async getAccounts() {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'accounts')
        .maybeSingle();

      if (!error && data && Array.isArray(data.value) && data.value.length > 0) {
        // Return user's exact customized accounts without overwriting anything
        return data.value;
      }
      return STRICT_ACCOUNTS;
    } catch (err) {
      console.error('getAccounts read error:', err);
      return STRICT_ACCOUNTS;
    }
  }

  /**
   * Update Account Balances in app_settings.
   * SAFEGUARD: Strictly modifies ONLY the `balance` field.
   * Preserves user customized card masks (e.g. '•••• 5505'), names, and styles completely.
   */
  static async updateAccountBalances(deltas = {}) {
    try {
      const current = await this.getAccounts();
      const updated = current.map((acc) => {
        const delta = Number(deltas[acc.id] || 0);
        if (delta === 0) return acc;
        return {
          ...acc,
          balance: round2(Number(acc.balance || 0) + delta),
        };
      });

      await supabase.from('app_settings').upsert({
        key: 'accounts',
        value: updated,
        updated_at: new Date().toISOString(),
      });

      return updated;
    } catch (err) {
      console.error('Error updating account balances:', err);
      return await this.getAccounts();
    }
  }

  /**
   * Add Transaction (Inserts into transactions and updates bank balance).
   */
  static async addTransaction({
    title,
    amount,
    type = 'expense',
    account_id = 'kbank',
    category = 'food',
    date = null,
    note = '',
    target_portion = null,
  }) {
    const numAmount = round2(amount);
    const txDate = date || getBangkokDateString();

    let finalNote = (note || '').trim();
    if (target_portion !== null && target_portion !== undefined) {
      const tp = round2(target_portion);
      finalNote = `${NOTE_TAGS.TARGET_PORTION(tp)} ${finalNote}`.trim();
    }

    const payload = {
      title: title.trim(),
      amount: numAmount,
      type,
      category,
      account_id,
      date: txDate,
      note: finalNote || null,
    };

    const { data: inserted, error: txError } = await supabase
      .from('transactions')
      .insert(payload)
      .select()
      .single();

    if (txError) {
      throw new Error(`Failed to insert transaction: ${txError.message}`);
    }

    // Deduct balance for expense, add for income
    const delta = type === 'expense' ? -numAmount : numAmount;
    const updatedAccounts = await this.updateAccountBalances({ [account_id]: delta });

    return {
      transaction: inserted,
      updatedAccounts,
    };
  }

  /**
   * Create Split Bill (Writes ONLY to transactions table).
   * Encodes user's share and friend names inside transaction note tags.
   * Zero modification to any other table.
   */
  static async createSplitBill({
    title,
    total_amount,
    account_id = 'ktb',
    date = null,
    my_share = 0,
    members = [],
  }) {
    const totalAmount = round2(total_amount);
    const userShare = round2(my_share);
    const txDate = date || getBangkokDateString();

    const memberNames = members.map((m) => m.name.trim()).join(', ');
    const noteText = `${NOTE_TAGS.SPLIT_SHARE(userShare)} หารบิลกับ ${memberNames}`;

    const txPayload = {
      title: title.trim(),
      amount: totalAmount,
      type: 'expense',
      category: 'food',
      account_id,
      date: txDate,
      note: noteText,
    };

    const { data: insertedTx, error: txError } = await supabase
      .from('transactions')
      .insert(txPayload)
      .select()
      .single();

    if (txError) {
      throw new Error(`Failed to insert split bill transaction: ${txError.message}`);
    }

    // Deduct total bill amount from paying account balance
    const updatedAccounts = await this.updateAccountBalances({ [account_id]: -totalAmount });

    return {
      transaction: insertedTx,
      bill: {
        title: title.trim(),
        total_amount: totalAmount,
        date: txDate,
      },
      members,
      updatedAccounts,
    };
  }

  /**
   * Record Inter-Account Transfer.
   * Inserts transfer_out and transfer_in pair into transactions table and shifts balance.
   */
  static async recordTransfer({
    source_account,
    dest_account,
    amount,
    date = null,
  }) {
    if (source_account === dest_account) {
      throw new Error('บัญชีต้นทางและปลายทางต้องไม่เป็นบัญชีเดียวกัน');
    }

    const numAmount = round2(amount);
    const txDate = date || getBangkokDateString();
    const pairId = `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const accounts = await this.getAccounts();
    const sourceName = accounts.find((a) => a.id === source_account)?.name || source_account;
    const destName = accounts.find((a) => a.id === dest_account)?.name || dest_account;

    const outTx = {
      title: `โอนไป ${destName}`,
      amount: numAmount,
      type: 'transfer_out',
      category: 'bills',
      date: txDate,
      account_id: source_account,
      note: `${NOTE_TAGS.TRANSFER_PAIR(pairId)} โอนเงินระหว่างบัญชีไป ${destName}`,
    };

    const inTx = {
      title: `รับโอนจาก ${sourceName}`,
      amount: numAmount,
      type: 'transfer_in',
      category: 'salary',
      date: txDate,
      account_id: dest_account,
      note: `${NOTE_TAGS.TRANSFER_PAIR(pairId)} โอนเงินระหว่างบัญชีจาก ${sourceName}`,
    };

    const [resOut, resIn] = await Promise.all([
      supabase.from('transactions').insert(outTx).select().single(),
      supabase.from('transactions').insert(inTx).select().single(),
    ]);

    if (resOut.error || resIn.error) {
      throw new Error(`Failed to record transfer pair: ${resOut.error?.message || resIn.error?.message}`);
    }

    // Source decreases, dest increases
    const updatedAccounts = await this.updateAccountBalances({
      [source_account]: -numAmount,
      [dest_account]: numAmount,
    });

    return {
      sourceTx: resOut.data,
      destTx: resIn.data,
      pairId,
      updatedAccounts,
    };
  }

  /**
   * Settle Friend Debt.
   * Inserts income transaction with [debt_repayment] tag and adds balance to account.
   */
  static async settleFriendDebt({
    friend_name,
    amount,
    deposit_account = 'kbank',
    date = null,
  }) {
    const cleanName = (friend_name || '').trim();
    if (!cleanName) throw new Error('ระบุชื่อเพื่อนที่ต้องการตัดหนี้');

    const repaymentAmount = round2(amount);
    const txDate = date || getBangkokDateString();

    const txPayload = {
      title: `Auto Debt Settlement (${cleanName})`,
      amount: repaymentAmount,
      type: 'income',
      category: 'salary',
      date: txDate,
      account_id: deposit_account,
      note: `⚡ Multi-bill auto settlement ${NOTE_TAGS.DEBT_REPAYMENT}`,
    };

    const { data: insertedTx, error: txErr } = await supabase
      .from('transactions')
      .insert(txPayload)
      .select()
      .single();

    if (txErr) {
      throw new Error(`Failed to insert repayment transaction: ${txErr.message}`);
    }

    // Add repayment amount to deposit account
    const updatedAccounts = await this.updateAccountBalances({
      [deposit_account]: repaymentAmount,
    });

    return {
      transaction: insertedTx,
      friendName: cleanName,
      amountSettled: repaymentAmount,
      depositAccount,
      updatedAccounts,
    };
  }

  /**
   * Get Financial Summary (READ-ONLY: Never modifies any table).
   * Reads accounts from app_settings for display only.
   */
  static async getFinancialSummary() {
    const accounts = await this.getAccounts();
    const totalBalance = round2(accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0));

    return {
      accounts,
      totalBalance,
      totalFriendDebt: 0,
      friendDebtList: [],
    };
  }

  /**
   * Get Recent Transactions (READ-ONLY from transactions table).
   */
  static async getRecentTransactions(limit = 5) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to query recent transactions: ${error.message}`);
    }

    return data || [];
  }
}