import { DatabaseService } from './databaseService.js';
import { formatCurrency, formatThaiDatePretty, getBangkokDateString } from './dateUtils.js';
import { STRICT_ACCOUNTS, CATEGORY_MAP } from '../types/constants.js';

/**
 * Tool Specifications for Gemini Function Calling
 */
export const GEMINI_TOOLS_DECLARATION = [
  {
    name: 'add_transaction',
    description: 'บันทึกรายการธุรกรรมทั่วไป (รายจ่าย หรือ รายรับ) ลงในตาราง transactions',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'ชื่อรายการธุรกรรม เช่น กินข้าวแกงกะหรี่, ซื้อกาแฟ, เติมน้ำมัน' },
        amount: { type: 'NUMBER', description: 'จำนวนเงินเต็มของรายการ (บาท)' },
        type: { type: 'STRING', enum: ['expense', 'income'], description: 'ประเภทธุรกรรม: expense (รายจ่าย) หรือ income (รายรับ)' },
        account_id: { type: 'STRING', enum: ['ktb', 'kbank', 'bbl'], description: 'รหัสบัญชีธนาคารที่ใช้จ่ายหรือรับเงิน (ktb, kbank, bbl) หากไม่ระบุให้เป็น kbank' },
        category: {
          type: 'STRING',
          enum: ['food', 'transport', 'shopping', 'entertainment', 'sport_mtzirr10', 'bills', 'salary', 'work', 'other'],
          description: 'หมวดหมู่ของรายการ'
        },
        date: { type: 'STRING', description: 'วันที่ทำรายการ รูปแบบ YYYY-MM-DD (พ.ศ.ปัจจุบัน ตามเวลาประเทศไทย GMT+7)' },
        note: { type: 'STRING', description: 'บันทึกช่วยจำเพิ่มเติม (ถ้ามี)' },
        target_portion: { type: 'NUMBER', description: 'ยอดที่ต้องการให้นับรวมในงบรายวัน (ถ้าสำรองจ่ายทั้งหมดไม่นับรวมในงบให้ใส่ 0)' }
      },
      required: ['title', 'amount', 'type', 'account_id', 'category']
    }
  },
  {
    name: 'create_split_bill',
    description: 'บันทึกรายการหารบิลค่าใช้จ่ายลงในตาราง transactions พร้อมระบุสัดส่วนของตนเองและเพื่อนในบันทึกช่วยจำ',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'ชื่อบิลหาร เช่น ค่าคอร์ทแบด, ชาบูมื้อเย็น' },
        total_amount: { type: 'NUMBER', description: 'ยอดรวมทั้งบิล (บาท)' },
        account_id: { type: 'STRING', enum: ['ktb', 'kbank', 'bbl'], description: 'บัญชีธนาคารที่เราจ่ายสำรองไปก่อน (ktb, kbank, bbl)' },
        date: { type: 'STRING', description: 'วันที่ทำรายการ YYYY-MM-DD' },
        my_share: { type: 'NUMBER', description: 'ยอดส่วนของผู้ใช้เองที่ต้องรับผิดชอบ (บาท) เช่น 70' },
        members: {
          type: 'ARRAY',
          description: 'รายชื่อเพื่อนและยอดที่แต่ละคนต้องจ่าย',
          items: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING', description: 'ชื่อเพื่อน เช่น Nine, Praew, Non' },
              amount: { type: 'NUMBER', description: 'ยอดที่เพื่อนคนนี้ต้องจ่าย' },
              is_paid: { type: 'BOOLEAN', description: 'สถานะจ่ายหรือยัง (ปกติเริ่มด้วย false)' }
            },
            required: ['name', 'amount']
          }
        }
      },
      required: ['title', 'total_amount', 'account_id', 'my_share', 'members']
    }
  },
  {
    name: 'record_transfer',
    description: 'บันทึกคู่ธุรกรรมโอนเงินข้ามบัญชีระหว่าง 3 บัญชีของเราเอง (ktb, kbank, bbl) ลงในตาราง transactions',
    parameters: {
      type: 'OBJECT',
      properties: {
        source_account: { type: 'STRING', enum: ['ktb', 'kbank', 'bbl'], description: 'บัญชีธนาคารต้นทางที่โอนออก' },
        dest_account: { type: 'STRING', enum: ['ktb', 'kbank', 'bbl'], description: 'บัญชีธนาคารปลายทางที่รับเงินเข้า' },
        amount: { type: 'NUMBER', description: 'จำนวนเงินที่โอน (บาท)' },
        date: { type: 'STRING', description: 'วันที่โอน YYYY-MM-DD' }
      },
      required: ['source_account', 'dest_account', 'amount']
    }
  },
  {
    name: 'settle_friend_debt',
    description: 'บันทึกรายการรับเงินคืนจากเพื่อนลงในตาราง transactions',
    parameters: {
      type: 'OBJECT',
      properties: {
        friend_name: { type: 'STRING', description: 'ชื่อเพื่อนที่โอนเงินคืน เช่น Non, Nine, Praew' },
        amount: { type: 'NUMBER', description: 'จำนวนเงินที่เพื่อนโอนคืน (บาท)' },
        deposit_account: { type: 'STRING', enum: ['ktb', 'kbank', 'bbl'], description: 'บัญชีธนาคารของเราที่เพื่อนโอนเข้า (ปกติ kbank หรือ ktb)' },
        date: { type: 'STRING', description: 'วันที่โอนเงินคืน YYYY-MM-DD' }
      },
      required: ['friend_name', 'amount', 'deposit_account']
    }
  },
  {
    name: 'get_financial_summary',
    description: 'ดูสรุปยอดเงินคงเหลือของบัญชีธนาคาร (ktb, kbank, bbl) และภาพรวมทรัพย์สิน',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'get_recent_transactions',
    description: 'ดูประวัติรายการธุรกรรมล่าสุดจากตาราง transactions ในระบบ Banjii',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'NUMBER', description: 'จำนวนรายการที่ต้องการดู (ปกติ 5-10 รายการ)' }
      }
    }
  }
];

/**
 * Consistent Response Formatter Generator
 * Always returns formatted text with:
 * 🎯 สถานะ / สรุปรายการ
 * 📊 รายละเอียด
 * 💡 ข้อมูลอัพเดต / ยอดคงเหลือล่าสุด
 */
export const formatStandardResponse = ({ statusTitle, details, tipOrBalance }) => {
  return [
    `🎯 **${statusTitle}**`,
    '',
    `📊 **รายละเอียด:**`,
    ...details.map((d) => `• ${d}`),
    '',
    `💡 **ข้อมูลอัพเดต:** ${tipOrBalance}`
  ].join('\n');
};

/**
 * Execute Tool Calls
 */
export async function executeAgentTool(toolName, args) {
  try {
    switch (toolName) {
      case 'add_transaction': {
        const res = await DatabaseService.addTransaction({
          title: args.title,
          amount: args.amount,
          type: args.type || 'expense',
          account_id: args.account_id || 'kbank',
          category: args.category || 'food',
          date: args.date || getBangkokDateString(),
          note: args.note || '',
          target_portion: args.target_portion,
        });

        const acc = STRICT_ACCOUNTS.find((a) => a.id === res.transaction.account_id);
        const cat = CATEGORY_MAP[res.transaction.category]?.name || res.transaction.category;

        const formattedReply = formatStandardResponse({
          statusTitle: `บันทึกรายการ${res.transaction.type === 'expense' ? 'รายจ่าย' : 'รายรับ'}สำเร็จ`,
          details: [
            `รายการ: **${res.transaction.title}**`,
            `จำนวนเงิน: **฿${formatCurrency(res.transaction.amount)}**`,
            `บัญชี: **${acc?.name || res.transaction.account_id}**`,
            `หมวดหมู่: **${cat}**`,
            `วันที่: **${formatThaiDatePretty(res.transaction.date)}**`,
            ...(args.target_portion === 0 ? ['งบรายวัน: ยกเว้นรายการนี้ (Target Portion: 0)'] : [])
          ],
          tipOrBalance: `บันทึกรายการลงตาราง transactions เรียบร้อย (ประเภท: ${res.transaction.type === 'expense' ? 'รายจ่าย' : 'รายรับ'})`
        });

        return {
          tool: 'add_transaction',
          success: true,
          data: res,
          formattedReply,
        };
      }

      case 'create_split_bill': {
        const res = await DatabaseService.createSplitBill({
          title: args.title,
          total_amount: args.total_amount,
          account_id: args.account_id || 'ktb',
          date: args.date || getBangkokDateString(),
          my_share: args.my_share,
          members: args.members || [],
        });

        const acc = STRICT_ACCOUNTS.find((a) => a.id === args.account_id);
        const memberBreakdown = (res.members || []).map(
          (m) => `${m.name} รับผิดชอบ ฿${formatCurrency(m.amount)}`
        ).join(', ');

        const formattedReply = formatStandardResponse({
          statusTitle: `สร้างบิลหารและบันทึกรายจ่ายสำเร็จ`,
          details: [
            `บิล: **${res.bill.title}**`,
            `ยอดเต็มบิล: **฿${formatCurrency(res.bill.total_amount)}** (ตัดจาก ${acc?.name || args.account_id})`,
            `ส่วนของคุณ: **฿${formatCurrency(args.my_share)}**`,
            `ยอดเพื่อนหาร: **${memberBreakdown}**`,
            `วันที่: **${formatThaiDatePretty(res.bill.date)}**`
          ],
          tipOrBalance: `บันทึกรายการลงตาราง transactions เรียบร้อย พร้อมบันทึกส่วนของคุณ [split_share:${args.my_share}] ในโน้ต`
        });

        return {
          tool: 'create_split_bill',
          success: true,
          data: res,
          formattedReply,
        };
      }

      case 'record_transfer': {
        const res = await DatabaseService.recordTransfer({
          source_account: args.source_account,
          dest_account: args.dest_account,
          amount: args.amount,
          date: args.date || getBangkokDateString(),
        });

        const sAcc = STRICT_ACCOUNTS.find((a) => a.id === args.source_account);
        const dAcc = STRICT_ACCOUNTS.find((a) => a.id === args.dest_account);

        const formattedReply = formatStandardResponse({
          statusTitle: `โอนเงินระหว่างบัญชีสำเร็จ`,
          details: [
            `จากบัญชี: **${sAcc?.name || args.source_account}**`,
            `ไปยังบัญชี: **${dAcc?.name || args.dest_account}**`,
            `ยอดเงินที่โอน: **฿${formatCurrency(args.amount)}**`,
            `วันที่: **${formatThaiDatePretty(res.sourceTx.date)}**`
          ],
          tipOrBalance: `บันทึกคู่รายการโอนออกและโอนเข้าลงตาราง transactions เรียบร้อย`
        });

        return {
          tool: 'record_transfer',
          success: true,
          data: res,
          formattedReply,
        };
      }

      case 'settle_friend_debt': {
        const res = await DatabaseService.settleFriendDebt({
          friend_name: args.friend_name,
          amount: args.amount,
          deposit_account: args.deposit_account || 'kbank',
          date: args.date || getBangkokDateString(),
        });

        const dAcc = STRICT_ACCOUNTS.find((a) => a.id === res.depositAccount);

        const formattedReply = formatStandardResponse({
          statusTitle: `บันทึกการรับเงินคืนสำเร็จ`,
          details: [
            `ผู้โอนคืน: **${res.friendName}**`,
            `ยอดเงินคืน: **฿${formatCurrency(res.amountSettled)}**`,
            `เข้าบัญชี: **${dAcc?.name || res.depositAccount}**`,
            `บันทึกรายการ: **Auto Debt Settlement (${res.friendName})**`
          ],
          tipOrBalance: `บันทึกรายการรับเงินคืนลงตาราง transactions เรียบร้อย (แท็ก [debt_repayment])`
        });

        return {
          tool: 'settle_friend_debt',
          success: true,
          data: res,
          formattedReply,
        };
      }

      case 'get_financial_summary': {
        const res = await DatabaseService.getFinancialSummary();

        const accLines = res.accounts.map(
          (a) => `• ${a.name} (${a.bank}): **฿${formatCurrency(a.balance)}**`
        );

        const formattedReply = [
          `🎯 **สรุปภาพรวมสถานะการเงินปัจจุบัน**`,
          '',
          `💳 **ยอดเงินคงเหลือในบัญชี (รวม ฿${formatCurrency(res.totalBalance)}):**`,
          ...accLines,
          '',
          `💡 **ข้อมูลอัพเดต:** อ่านข้อมูลอย่างเดียว ไม่มีการแก้ไขตารางใดๆ ในระบบ`
        ].join('\n');

        return {
          tool: 'get_financial_summary',
          success: true,
          data: res,
          formattedReply,
        };
      }

      case 'get_recent_transactions': {
        const res = await DatabaseService.getRecentTransactions(args.limit || 5);

        const txLines = res.map((tx) => {
          const sign = tx.type === 'expense' || tx.type === 'transfer_out' ? '-' : '+';
          const acc = STRICT_ACCOUNTS.find((a) => a.id === tx.account_id)?.name || tx.account_id;
          return `• ${formatThaiDatePretty(tx.date)}: **${tx.title}** (${sign}฿${formatCurrency(tx.amount)}) [${acc}]`;
        });

        const formattedReply = [
          `🎯 **ประวัติรายการธุรกรรมล่าสุด (${res.length} รายการ)**`,
          '',
          `📊 **รายการล่าสุด:**`,
          ...(txLines.length > 0 ? txLines : ['• ยังไม่มีรายการธุรกรรมในระบบ']),
          '',
          `💡 **ข้อมูลอัพเดต:** ดึงข้อมูลตรงจากตาราง transactions`
        ].join('\n');

        return {
          tool: 'get_recent_transactions',
          success: true,
          data: res,
          formattedReply,
        };
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (err) {
    console.error(`Tool execution error [${toolName}]:`, err);
    return {
      tool: toolName,
      success: false,
      error: err.message,
      formattedReply: `⚠️ เกิดข้อผิดพลาดในการทำรายการ: ${err.message}`
    };
  }
}