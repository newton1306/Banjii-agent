import { supabase } from './supabase.js';
import { STRICT_ACCOUNTS, NOTE_TAGS } from '../types/constants.js';
import { getBangkokDateString } from './dateUtils.js';

const round2 = (val) => Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;

export class DatabaseService {
  /**
   * SAFETY GUARD: Prevent any wiping or destructive bulk operations.
   */
  static preventDestructiveWipe() {
    throw new Error('Action blocked: Data wipe or bulk purge is strictly prohibited.');
  }

  /**
   * Fetch current accounts from app_settings (key = 'accounts').
   * If missing or empty, initializes strictly with the 3 banks.
   */
  static async getAccounts() {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'accounts')
        .maybeSingle();

      if (error) {
        console.error('Error fetching accounts from Supabase:', error);
        return STRICT_ACCOUNTS.map((a) => ({ ...a, balance: 0 }));
      }

      if (data && Array.isArray(data.value) && data.value.length > 0) {
        // Ensure all 3 strict banks are represented
        const map = new Map(data.value.map((a) => [a.id, a]));
        return STRICT_ACCOUNTS.map((preset) => {
          const existing = map.get(preset.id);
          return {
            ...preset,
            balance: round2(existing?.balance || 0),
          };
        });
      }

      // Initialize default
      const defaultAccounts = STRICT_ACCOUNTS.map((a) => ({ ...a, balance: 0 }));
      await supabase.from('app_settings').upsert({
        key: 'accounts',
        value: defaultAccounts,
        updated_at: new Date().toISOString(),
      });
      return defaultAccounts;
    } catch (err) {
      console.error('getAccounts failure:', err);
      return STRICT_ACCOUNTS.map((a) => ({ ...a, balance: 0 }));
    }
  }

  /**
   * Update account balance in app_settings (key = 'accounts') safely.
   */
  static async updateAccountBalances(deltas) {
    // deltas: { [accountId]: changeAmount }
    const current = await this.getAccounts();
    const updated = current.map((acc) => {
      const delta = round2(deltas[acc.id] || 0);
      if (delta !== 0) {
        return {
          ...acc,
          balance: round2(Number(acc.balance || 0) + delta),
        };
      }
      return acc;
    });

    const { error } = await supabase.from('app_settings').upsert({
      key: 'accounts',
      value: updated,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error updating accounts in app_settings:', error);
    }
    return updated;
  }

  /**
   * Fetch friends list from app_settings (key = 'friends').
   */
  static async getFriends() {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'friends')
        .maybeSingle();

      if (error || !data || !Array.isArray(data.value)) {
        return [];
      }
      return data.value;
    } catch (e) {
      console.error('getFriends error:', e);
      return [];
    }
  }

  /**
   * EDGE CASE 1: Auto Friend Creation
   * Checks if friend exists (case-insensitive). If not, creates new friend
   * object and persists to app_settings immediately.
   */
  static async ensureFriendExists(rawName) {
    const cleanName = (rawName || '').trim();
    if (!cleanName) {
      throw new Error('Friend name cannot be empty or undefined');
    }

    const currentFriends = await this.getFriends();
    const existing = currentFriends.find(
      (f) => f && f.name && f.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (existing) {
      return existing;
    }

    // Auto-create new friend
    const newFriend = {
      id: `friend_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      gender: 'male',
      avatar: '/avatars/male-animated.svg',
      badgeColor: 'border-blue-400',
      totalDebt: 0,
    };

    const updatedFriends = [...currentFriends, newFriend];
    const { error } = await supabase.from('app_settings').upsert({
      key: 'friends',
      value: updatedFriends,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error auto-creating friend in app_settings:', error);
    }
    return newFriend;
  }

  /**
   * Standard Add Transaction
   * - Inserts transaction
   * - Updates account balance
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
    const validAccount = STRICT_ACCOUNTS.some((a) => a.id === account_id) ? account_id : 'kbank';
    const numAmount = round2(amount);
    const txDate = date || getBangkokDateString();

    let finalNote = (note || '').trim();
    if (target_portion !== null && target_portion !== undefined) {
      const tp = round2(target_portion);
      if (tp === 0) {
        finalNote = `${NOTE_TAGS.TARGET_PORTION(0)} ${finalNote}`.trim();
      } else {
        finalNote = `${NOTE_TAGS.TARGET_PORTION(tp)} ${finalNote}`.trim();
      }
    }

    const payload = {
      title: title.trim(),
      amount: numAmount,
      type,
      category,
      account_id: validAccount,
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

    // Update account balance (EDGE CASE 4)
    const balanceDelta = type === 'expense' ? -numAmount : numAmount;
    const updatedAccounts = await this.updateAccountBalances({ [validAccount]: balanceDelta });

    return {
      transaction: inserted,
      updatedAccounts,
    };
  }

  /**
   * EDGE CASE 1, 2, 3, 4: Create Split Bill
   * - Auto creates friends in app_settings if not existing
   * - Inserts transaction first to get valid BigInt ID
   * - Inserts split_bill with numeric linked_transaction_id
   * - Inserts split_bill_members with valid bill_id
   * - Decreases paying account balance
   */
  static async createSplitBill({
    title,
    total_amount,
    account_id = 'ktb',
    date = null,
    my_share = 0,
    members = [],
  }) {
    const validAccount = STRICT_ACCOUNTS.some((a) => a.id === account_id) ? account_id : 'ktb';
    const totalAmount = round2(total_amount);
    const userShare = round2(my_share);
    const txDate = date || getBangkokDateString();

    // 1. Auto Friend Creation (EDGE CASE 1)
    for (const mem of members) {
      await this.ensureFriendExists(mem.name);
    }

    // 2. Prepare transaction note with tags
    const memberNames = members.map((m) => m.name.trim()).join(', ');
    let noteText = `${NOTE_TAGS.SPLIT_SHARE(userShare)} à¸«à¸²à¸£à¸šà¸´à¸¥à¸à¸±à¸š ${memberNames}`;

    // 3. Insert transaction first to get BigInt ID (EDGE CASE 2)
    const txPayload = {
      title: title.trim(),
      amount: totalAmount,
      type: 'expense',
      category: 'food',
      account_id: validAccount,
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

    const linkedTransactionId = insertedTx.id; // BigInt numeric ID guaranteed!

    // 4. Insert split_bill
    const billPayload = {
      title: title.trim(),
      total_amount: totalAmount,
      date: txDate,
      linked_transaction_id: linkedTransactionId,
    };

    const { data: insertedBill, error: billError } = await supabase
      .from('split_bills')
      .insert(billPayload)
      .select()
      .single();

    if (billError) {
      throw new Error(`Failed to insert split bill: ${billError.message}`);
    }

    // 5. Insert split_bill_members (EDGE CASE 3: bill_id guaranteed not null)
    const membersPayload = members.map((m) => ({
      bill_id: insertedBill.id,
      name: m.name.trim(),
      amount: round2(m.amount),
      paid_amount: round2(m.paid_amount || 0),
      is_paid: Boolean(m.is_paid),
    }));

    const { data: insertedMembers, error: memberError } = await supabase
      .from('split_bill_members')
      .insert(membersPayload)
      .select();

    if (memberError) {
      throw new Error(`Failed to insert split bill members: ${memberError.message}`);
    }

    // 6. Update Account Balance (EDGE CASE 4)
    const updatedAccounts = await this.updateAccountBalances({ [validAccount]: -totalAmount });

    return {
      transaction: insertedTx,
      bill: insertedBill,
      members: insertedMembers,
      updatedAccounts,
    };
  }

  /**
   * Record Inter-Account Transfer
   * - Inserts transfer_out on source account
   * - Inserts transfer_in on dest account
   * - Updates balances on both accounts
   */
  static async recordTransfer({
    source_account,
    dest_account,
    amount,
    date = null,
  }) {
    const validSource = STRICT_ACCOUNTS.some((a) => a.id === source_account) ? source_account : 'ktb';
    const validDest = STRICT_ACCOUNTS.some((a) => a.id === dest_account) ? dest_account : 'kbank';

    if (validSource === validDest) {
      throw new Error('à¸šà¸±à¸à¸Šà¸µà¸•à¹‰à¸™à¸—à¸²à¸‡à¹à¸¥à¸°à¸›à¸¥à¸²à¸¢à¸—à¸²à¸‡à¸•à¹‰à¸­à¸‡à¹„à¸¡à¹ˆà¹€à¸›à¹‡à¸™à¸šà¸±à¸à¸Šà¸µà¹€à¸”à¸µà¸¢à¸§à¸à¸±à¸™');
    }

    const numAmount = round2(amount);
    const txDate = date || getBangkokDateString();
    const pairId = `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const sourceName = STRICT_ACCOUNTS.find((a) => a.id === validSource)?.name || validSource;
    const destName = STRICT_ACCOUNTS.find((a) => a.id === validDest)?.name || validDest;

    const outTx = {
      title: `à¹‚à¸­à¸™à¹„à¸› ${destName}`,
      amount: numAmount,
      type: 'transfer_out',
      category: 'bills',
      date: txDate,
      account_id: validSource,
      note: `${NOTE_TAGS.TRANSFER_PAIR(pairId)} à¹‚à¸­à¸™à¹€à¸‡à¸´à¸™à¸£à¸°à¸«à¸§à¹ˆà¸²à¸‡à¸šà¸±à¸à¸Šà¸µà¹„à¸› ${destName}`,
    };

    const inTx = {
      title: `à¸£à¸±à¸šà¹‚à¸­à¸™à¸ˆà¸²à¸ ${sourceName}`,
      amount: numAmount,
      type: 'transfer_in',
      category: 'salary',
      date: txDate,
      account_id: validDest,
      note: `${NOTE_TAGS.TRANSFER_PAIR(pairId)} à¹‚à¸­à¸™à¹€à¸‡à¸´à¸™à¸£à¸°à¸«à¸§à¹ˆà¸²à¸‡à¸šà¸±à¸à¸Šà¸µà¸ˆà¸²à¸ ${sourceName}`,
    };

    const [resOut, resIn] = await Promise.all([
      supabase.from('transactions').insert(outTx).select().single(),
      supabase.from('transactions').insert(inTx).select().single(),
    ]);

    if (resOut.error || resIn.error) {
      throw new Error(`Failed to record transfer pair: ${resOut.error?.message || resIn.error?.message}`);
    }

    // Update balances: source decreases, dest increases
    const updatedAccounts = await this.updateAccountBalances({
      [validSource]: -numAmount,
      [validDest]: numAmount,
    });

    return {
      sourceTx: resOut.data,
      destTx: resIn.data,
      updatedAccounts,
      pairId,
    };
  }

  /**
   * EDGE CASE 5: Settle Friend Debt (Multi-bill auto settlement)
   * - Friend repays money
   * - Inserts transaction income: title 'Auto Debt Settlement (FriendName)', note 'âš¡ Multi-bill auto settlement [debt_repayment]'
   * - Finds unpaid split_bill_members for friend (case-insensitive)
   * - Allocates money to pay off debts and sets is_paid = true
   * - Deposits amount into bank account
   */
  static async settleFriendDebt({
    friend_name,
    amount,
    deposit_account = 'kbank',
    date = null,
  }) {
    const cleanName = (friend_name || '').trim();
    if (!cleanName) throw new Error('à¸£à¸°à¸šà¸¸à¸Šà¸·à¹ˆà¸­à¹€à¸žà¸·à¹ˆà¸­à¸™à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸•à¸±à¸”à¸«à¸™à¸µà¹‰');

    const validAccount = STRICT_ACCOUNTS.some((a) => a.id === deposit_account) ? deposit_account : 'kbank';
    const repaymentAmount = round2(amount);
    const txDate = date || getBangkokDateString();

    // 1. Fetch all unpaid bill members matching friend
    const { data: allMembers, error: memError } = await supabase
      .from('split_bill_members')
      .select('*')
      .order('id', { ascending: true });

    if (memError) {
      throw new Error(`Failed to query split bill members: ${memError.message}`);
    }

    const friendUnpaid = (allMembers || [])
      .filter((m) => m.name && m.name.trim().toLowerCase() === cleanName.toLowerCase() && !m.is_paid)
      .map((m) => {
        const remaining = round2((m.amount || 0) - (m.paid_amount || 0));
        return { ...m, remainingDebt: remaining };
      });

    let remainingFunds = repaymentAmount;
    const settledBills = [];

    for (const item of friendUnpaid) {
      if (remainingFunds <= 0) break;
      const pay = Math.min(item.remainingDebt, remainingFunds);
      remainingFunds = round2(remainingFunds - pay);

      const newPaid = round2((item.paid_amount || 0) + pay);
      const isPaid = newPaid >= item.amount;

      // Update in Supabase
      const { error: updErr } = await supabase
        .from('split_bill_members')
        .update({
          paid_amount: newPaid,
          is_paid: isPaid,
        })
        .eq('id', item.id);

      if (updErr) {
        console.error(`Error updating member ${item.id}:`, updErr);
      } else {
        settledBills.push({
          billId: item.bill_id,
          paidAmount: pay,
          isFullyPaid: isPaid,
        });
      }
    }

    // 2. Insert Income Transaction for debt repayment
    const txPayload = {
      title: `Auto Debt Settlement (${cleanName})`,
      amount: repaymentAmount,
      type: 'income',
      category: 'salary',
      date: txDate,
      account_id: validAccount,
      note: `âš¡ Multi-bill auto settlement ${NOTE_TAGS.DEBT_REPAYMENT}`,
    };

    const { data: insertedTx, error: txErr } = await supabase
      .from('transactions')
      .insert(txPayload)
      .select()
      .single();

    if (txErr) {
      throw new Error(`Failed to insert repayment transaction: ${txErr.message}`);
    }

    // 3. Deposit into bank account
    const updatedAccounts = await this.updateAccountBalances({
      [validAccount]: repaymentAmount,
    });

    return {
      transaction: insertedTx,
      settledBills,
      friendName: cleanName,
      amountSettled: repaymentAmount,
      depositAccount: validAccount,
      updatedAccounts,
    };
  }

  /**
   * Get Financial Summary:
   * - Balances of 3 accounts
   * - Total assets
   * - Total owed by friends with breakdown per friend
   */
  static async getFinancialSummary() {
    const [accounts, { data: members, error: memErr }] = await Promise.all([
      this.getAccounts(),
      supabase.from('split_bill_members').select('*'),
    ]);

    if (memErr) {
      console.error('Error querying members for summary:', memErr);
    }

    const totalBalance = round2(accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0));

    // Friend debts
    const debtsByFriend = {};
    let totalFriendDebt = 0;

    (members || []).forEach((m) => {
      if (!m.is_paid) {
        const remaining = round2((m.amount || 0) - (m.paid_amount || 0));
        if (remaining > 0) {
          const name = (m.name || 'à¹€à¸žà¸·à¹ˆà¸­à¸™').trim();
          debtsByFriend[name] = round2((debtsByFriend[name] || 0) + remaining);
          totalFriendDebt = round2(totalFriendDebt + remaining);
        }
      }
    });

    const friendDebtList = Object.entries(debtsByFriend)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      accounts,
      totalBalance,
      totalFriendDebt,
      friendDebtList,
    };
  }

  /**
   * Get Recent Transactions
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

