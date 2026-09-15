import { getBangkokDateString } from './dateUtils.js';
import { executeAgentTool } from './agentTools.js';

/**
 * Intelligent Thai NLP Intent & Entity Extraction Engine
 * Accurately extracts transactions, split bills, transfers, debt settlements, and summaries
 * from natural Thai conversational inputs.
 */

export class ThaiNlpParser {
  static extractBank(text) {
    const lower = text.toLowerCase();
    if (lower.includes('kbank') || lower.includes('กสิกร')) return 'kbank';
    if (lower.includes('ktb') || lower.includes('กรุงไทย')) return 'ktb';
    if (lower.includes('bbl') || lower.includes('กรุงเทพ') || lower.includes('kmutt')) return 'bbl';
    return null;
  }

  static extractCategory(text) {
    const lower = text.toLowerCase();
    if (lower.includes('ข้าว') || lower.includes('กิน') || lower.includes('อาหาร') || lower.includes('กาแฟ') || lower.includes('ชา') || lower.includes('บุฟเฟต์') || lower.includes('ชาบู')) return 'food';
    if (lower.includes('แบด') || lower.includes('บอล') || lower.includes('ยิม') || lower.includes('ฟิตเนส') || lower.includes('กีฬา')) return 'sport_mtzirr10';
    if (lower.includes('รถ') || lower.includes('bts') || lower.includes('mrt') || lower.includes('แท็กซี่') || lower.includes('น้ำมัน')) return 'transport';
    if (lower.includes('ช้อป') || lower.includes('ซื้อ') || lower.includes('เสื้อ') || lower.includes('ของ')) return 'shopping';
    if (lower.includes('หนัง') || lower.includes('เกม') || lower.includes('คอนเสิร์ต')) return 'entertainment';
    if (lower.includes('บิล') || lower.includes('ค่าน้ำ') || lower.includes('ค่าไฟ') || lower.includes('เน็ต') || lower.includes('ค่าห้อง')) return 'bills';
    if (lower.includes('เงินเดือน') || lower.includes('จ้าง') || lower.includes('รับเงิน')) return 'salary';
    return 'food';
  }

  static async parseAndExecute(input) {
    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();

    // 1. Financial Summary Intent: "เหลือเงินเท่าไหร่", "ใครติดเงิน", "สรุปยอด"
    if (
      (lower.includes('เหลือ') && lower.includes('เงิน')) ||
      (lower.includes('ใคร') && (lower.includes('ติดเงิน') || lower.includes('ค้าง'))) ||
      lower.includes('สรุปยอด') ||
      lower.includes('ยอดเงิน') ||
      lower.includes('เช็คเงิน') ||
      lower.includes('summary')
    ) {
      return await executeAgentTool('get_financial_summary', {});
    }

    // 2. Recent Transactions: "ประวัติ", "รายการล่าสุด", "ธุรกรรมล่าสุด"
    if (
      lower.includes('รายการล่าสุด') ||
      lower.includes('ประวัติ') ||
      lower.includes('ธุรกรรมล่าสุด') ||
      lower.includes('recent')
    ) {
      return await executeAgentTool('get_recent_transactions', { limit: 5 });
    }

    // 3. Friend Debt Repayment: e.g. "Non โอนคืน 150 เข้า kbank", "Nine คืนเงิน 200"
    const repaymentMatch = trimmed.match(/([A-Za-zก-๙]+)\s*(?:โอนคืน|คืนเงิน|จ่ายคืน|โอนมาคืน)\s*([\d,.]+)\s*(?:บาท)?(?:\s*(?:เข้า|ที่)?\s*([A-Za-zก-๙]+))?/i);
    if (repaymentMatch && !lower.includes('หาร')) {
      const friendName = repaymentMatch[1].trim();
      const amount = parseFloat(repaymentMatch[2].replace(/,/g, ''));
      const specifiedBank = repaymentMatch[3] ? this.extractBank(repaymentMatch[3]) : this.extractBank(trimmed);
      const depositAccount = specifiedBank || 'kbank';

      return await executeAgentTool('settle_friend_debt', {
        friend_name: friendName,
        amount,
        deposit_account: depositAccount,
        date: getBangkokDateString(),
      });
    }

    // 4. Inter-Account Transfer: e.g. "โอนเงินจาก ktb ไป kbank 500", "โอน ktb ไป bbl 300"
    if (lower.includes('โอน') && (lower.includes('จาก') || lower.includes('ไป') || lower.includes('เข้า'))) {
      const transferRegex = /(?:โอน(?:เงิน)?)\s*(?:จาก)?\s*([A-Za-zก-๙]+)\s*(?:ไป|เข้า)\s*([A-Za-zก-๙]+)\s*([\d,.]+)/i;
      const tMatch = trimmed.match(transferRegex);
      if (tMatch) {
        const sourceAcc = this.extractBank(tMatch[1]);
        const destAcc = this.extractBank(tMatch[2]);
        const amount = parseFloat(tMatch[3].replace(/,/g, ''));

        if (sourceAcc && destAcc && !isNaN(amount)) {
          return await executeAgentTool('record_transfer', {
            source_account: sourceAcc,
            dest_account: destAcc,
            amount,
            date: getBangkokDateString(),
          });
        }
      }
    }

    // 5. Split Bill Intent: e.g. "จ่ายค่าคอร์ทแบด 995 ktb หารกับ Nine, Praew, Non คนละเท่าๆ กัน ส่วนเรา 70"
    if (lower.includes('หาร') || lower.includes('แชร์')) {
      // Extract total amount
      const totalAmountMatch = trimmed.match(/([\d,.]+)\s*(?:บาท)?/);
      const totalAmount = totalAmountMatch ? parseFloat(totalAmountMatch[1].replace(/,/g, '')) : 0;

      // Extract bank
      const accountId = this.extractBank(trimmed) || 'ktb';

      // Extract my share: e.g. "ส่วนเรา 70", "เรา 70", "ของฉัน 100"
      let myShare = 0;
      const myShareMatch = trimmed.match(/(?:ส่วนเรา|เรา|ของฉัน|ฉัน|ส่วนผม|ผม)\s*([\d,.]+)/i);
      if (myShareMatch) {
        myShare = parseFloat(myShareMatch[1].replace(/,/g, ''));
      }

      // Extract title: e.g. "จ่ายค่าคอร์ทแบด", "ค่าคอร์ทแบด", "กินสุกี้"
      let title = 'บิลหาร';
      const titleMatch = trimmed.match(/(?:จ่าย|กิน|ค่า)?\s*([ก-๙A-Za-z0-9\s_-]+?)(?:\s*[\d,.]+|\s*หาร)/i);
      if (titleMatch && titleMatch[1]) {
        const candidate = titleMatch[1].trim();
        if (candidate.length > 1 && !candidate.startsWith('โอน')) {
          title = candidate.startsWith('ค่า') ? candidate : `ค่า${candidate}`;
        }
      }

      // Extract friends names: e.g. "หารกับ Nine, Praew, Non" or "หาร Nine Praew Non"
      const friendsMatch = trimmed.match(/(?:หารกับ|หาร|กับ)\s*([A-Za-zก-๙,\s]+?)(?:\s*(?:คนละ|ส่วนเรา|เท่าๆ|เรา|$))/i);
      let friendNames = [];
      if (friendsMatch && friendsMatch[1]) {
        const rawNames = friendsMatch[1].split(/[,และ\s]+/);
        friendNames = rawNames
          .map((n) => n.trim())
          .filter((n) => n.length > 1 && !['กับ', 'คนละ', 'เท่าๆ', 'กัน', 'ส่วนเรา', 'เรา', 'ktb', 'kbank', 'bbl'].includes(n.toLowerCase()));
      }

      if (friendNames.length === 0) {
        friendNames = ['เพื่อน 1', 'เพื่อน 2'];
      }

      // Calculate member portions
      const remainingForFriends = Math.max(0, totalAmount - myShare);
      const perFriendAmount = Math.round((remainingForFriends / friendNames.length + Number.EPSILON) * 100) / 100;

      const members = friendNames.map((name) => ({
        name,
        amount: perFriendAmount,
        is_paid: false,
      }));

      return await executeAgentTool('create_split_bill', {
        title,
        total_amount: totalAmount,
        account_id: accountId,
        date: getBangkokDateString(),
        my_share: myShare,
        members,
      });
    }

    // 6. General Transaction Intent: e.g. "กินข้าวแกงกะหรี่ 180 จ่าย kbank", "ซื้อชานม 65"
    const amountMatch = trimmed.match(/([\d,.]+)\s*(?:บาท)?/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      const accountId = this.extractBank(trimmed) || 'kbank';
      const category = this.extractCategory(trimmed);
      const isIncome = lower.includes('ได้เงิน') || lower.includes('เงินเข้า') || lower.includes('เงินเดือน') || lower.includes('รับเงิน');
      const type = isIncome ? 'income' : 'expense';

      // Clean title
      let title = trimmed
        .replace(/จ่าย\s*(kbank|ktb|bbl|กสิกร|กรุงไทย|กรุงเทพ)/gi, '')
        .replace(/(kbank|ktb|bbl|กสิกร|กรุงไทย|กรุงเทพ)/gi, '')
        .replace(/([\d,.]+)\s*(?:บาท)?/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!title) {
        title = type === 'expense' ? 'รายการใช้จ่าย' : 'รายรับ';
      }

      return await executeAgentTool('add_transaction', {
        title,
        amount,
        type,
        account_id: accountId,
        category,
        date: getBangkokDateString(),
        note: '',
      });
    }

    // Fallback response for unparsed text
    return {
      tool: 'unknown',
      success: false,
      formattedReply: [
        '🤖 **Banjii Conversational AI Agent พร้อมช่วยเหลือครับ**',
        '',
        'คุณสามารถพิมพ์สั่งงานด้วยภาษาไทยธรรมชาติได้ เช่น:',
        '• *กินข้าวแกงกะหรี่ 180 จ่าย kbank* (บันทึกรายจ่าย)',
        '• *จ่ายค่าคอร์ทแบด 995 ktb หารกับ Nine, Praew, Non คนละเท่าๆ กัน ส่วนเรา 70* (หารบิล)',
        '• *Non โอนคืน 150 เข้า kbank* (เคลียร์หนี้เพื่อน)',
        '• *โอนเงินจาก ktb ไป kbank 500* (โอนเงินข้ามบัญชี)',
        '• *ตอนนี้เหลือเงินแต่ละบัญชีเท่าไหร่ และใครติดเงินเราบ้าง* (เช็คยอดเงิน & หนี้ค้าง)',
        '',
        '💡 หรือกดเลือกเมนูลัด (Quick Action Chips) ด้านล่างได้เลยครับ!'
      ].join('\n')
    };
  }
}