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

    // Also sync bill and members to split_bills and split_bill_members table for main web integration
    try {
      const { data: billRes } = await supabase
        .from('split_bills')
        .insert({
          title: title.trim(),
          total_amount: totalAmount,
          date: txDate,
          linked_transaction_id: insertedTx?.id || null,
        })
        .select()
        .single();

      if (billRes && members && members.length > 0) {
        const membersToInsert = members.map((m) => ({
          bill_id: billRes.id,
          name: m.name.trim(),
          amount: round2(m.amount),
          paid_amount: 0,
          is_paid: false,
        }));
        await supabase.from('split_bill_members').insert(membersToInsert);
      }
    } catch (err) {
      console.warn('Could not sync to split_bills table:', err);
    }

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

    // Also update split_bill_members in Supabase if matching unpaid bills exist
    try {
      const { data: members } = await supabase
        .from('split_bill_members')
        .select('*')
        .ilike('name', cleanName);

      if (members && members.length > 0) {
        let remainingToDeduct = repaymentAmount;
        for (const m of members) {
          if (!m.is_paid && remainingToDeduct > 0) {
            const debtOnThisBill = round2((m.amount || 0) - (m.paid_amount || 0));
            const pay = Math.min(debtOnThisBill, remainingToDeduct);
            remainingToDeduct = round2(remainingToDeduct - pay);
            const newPaid = round2((m.paid_amount || 0) + pay);
            const isPaid = newPaid >= m.amount;

            await supabase
              .from('split_bill_members')
              .update({
                paid_amount: newPaid,
                is_paid: isPaid,
              })
              .eq('id', m.id);
          }
        }
      }
    } catch (err) {
      console.warn('Could not update split_bill_members on repayment:', err);
    }

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
   * Reads accounts from app_settings and live friend debts from split_bill_members.
   */
  static async getFinancialSummary() {
    const accounts = await this.getAccounts();
    const totalBalance = round2(accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0));

    let friendDebtList = [];
    let totalFriendDebt = 0;

    try {
      const { data: members, error } = await supabase
        .from('split_bill_members')
        .select('*');

      if (!error && members && members.length > 0) {
        const summary = {};
        members.forEach((m) => {
          if (!m?.name) return;
          const key = m.name.trim().toLowerCase();
          if (!summary[key]) {
            summary[key] = {
              name: m.name.trim(),
              totalOwed: 0,
              totalPaid: 0,
              amount: 0,
              unpaidBillsCount: 0,
            };
          }
          const owed = round2(m.amount || 0);
          const paid = round2(m.paid_amount || 0);
          const remaining = Math.max(0, round2(owed - paid));

          summary[key].totalOwed = round2(summary[key].totalOwed + owed);
          summary[key].totalPaid = round2(summary[key].totalPaid + paid);
          summary[key].amount = round2(summary[key].amount + remaining);
          if (remaining > 0) {
            summary[key].unpaidBillsCount += 1;
          }
        });

        friendDebtList = Object.values(summary)
          .filter((f) => f.amount > 0)
          .sort((a, b) => b.amount - a.amount);

        totalFriendDebt = round2(
          friendDebtList.reduce((sum, f) => sum + f.amount, 0)
        );
      }
    } catch (err) {
      console.error('Error fetching friend debts in getFinancialSummary:', err);
    }

    return {
      accounts,
      totalBalance,
      totalFriendDebt,
      friendDebtList,
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

  /**
   * Delete Recent Transaction(s) and safely revert account balance(s).
   * Supports single transactions, transfer pairs, and split bills.
   */
  static async deleteRecentTransaction(count = 1) {
    const numToDelete = Math.max(1, parseInt(count || 1, 10));

    // Fetch the latest transaction(s) by created_at and id
    const { data: recentTxs, error: fetchErr } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(numToDelete);

    if (fetchErr) {
      throw new Error(`Failed to fetch recent transactions to delete: ${fetchErr.message}`);
    }

    if (!recentTxs || recentTxs.length === 0) {
      return {
        deletedTransactions: [],
        updatedAccounts: await this.getAccounts(),
      };
    }

    // Collect all transactions to delete, including transfer partners if applicable
    const allToDelete = [...recentTxs];

    for (const tx of recentTxs) {
      // 1. Check explicit transfer_pair tag
      const pairMatch = tx.note?.match(/\[transfer_pair:([^\]]+)\]/);
      if (pairMatch && pairMatch[1]) {
        const pairId = pairMatch[1];
        const { data: partners } = await supabase
          .from('transactions')
          .select('*')
          .neq('id', tx.id)
          .like('note', `%[transfer_pair:${pairId}]%`);

        if (partners && partners.length > 0) {
          for (const p of partners) {
            if (!allToDelete.some((t) => t.id === p.id)) {
              allToDelete.push(p);
            }
          }
        }
      } else if ((tx.type === 'transfer_out' || tx.type === 'transfer_in') && !tx.note?.includes('[transfer_pair:')) {
        // 2. Heuristic fallback for legacy transfer pairs
        const oppositeType = tx.type === 'transfer_out' ? 'transfer_in' : 'transfer_out';
        const { data: candidates } = await supabase
          .from('transactions')
          .select('*')
          .neq('id', tx.id)
          .eq('type', oppositeType)
          .eq('amount', tx.amount)
          .neq('account_id', tx.account_id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (candidates && candidates.length > 0) {
          const p = candidates[0];
          if (!allToDelete.some((t) => t.id === p.id)) {
            allToDelete.push(p);
          }
        }
      }
    }

    // Calculate account balance reversals
    const deltas = {};
    for (const tx of allToDelete) {
      const amt = round2(tx.amount);
      if (tx.type === 'expense' || tx.type === 'transfer_out') {
        // Revert deduction: add money back to the account
        deltas[tx.account_id] = round2((deltas[tx.account_id] || 0) + amt);
      } else if (tx.type === 'income' || tx.type === 'transfer_in') {
        // Revert addition: subtract money from the account
        deltas[tx.account_id] = round2((deltas[tx.account_id] || 0) - amt);
      }
    }

    const idsToDelete = allToDelete.map((t) => t.id);

    // Clean up any linked split bills
    try {
      const { data: linkedBills } = await supabase
        .from('split_bills')
        .select('id')
        .in('linked_transaction_id', idsToDelete);

      if (linkedBills && linkedBills.length > 0) {
        const billIds = linkedBills.map((b) => b.id);
        await supabase.from('split_bill_members').delete().in('bill_id', billIds);
        await supabase.from('split_bills').delete().in('id', billIds);
      }
    } catch (err) {
      console.warn('Error cleaning up linked split bills:', err);
    }

    // Delete transactions
    const { error: delErr } = await supabase
      .from('transactions')
      .delete()
      .in('id', idsToDelete);

    if (delErr) {
      throw new Error(`Failed to delete transaction(s): ${delErr.message}`);
    }

    // Safely update bank account balances in app_settings (preserving card masks)
    const updatedAccounts = await this.updateAccountBalances(deltas);

    return {
      deletedTransactions: allToDelete,
      updatedAccounts,
    };
  }
}