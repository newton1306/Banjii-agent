import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_TOOLS_DECLARATION, executeAgentTool } from './agentTools.js';
import { ThaiNlpParser } from './thaiNlpParser.js';
import { getBangkokDateString } from './dateUtils.js';

const SYSTEM_INSTRUCTION = `
คุณคือ Banjii Conversational Financial AI Agent ผู้ช่วยจัดการการเงินส่วนบุคคลอัจฉริยะ ทำหน้าที่บันทึก รายจ่าย, รายรับ, บิลหารกับเพื่อน, การโอนเงินข้ามบัญชี และการตัดหนี้เพื่อน
ข้อมูลระบบและกฎสำคัญ:
1. บัญชีธนาคารและการเงินมีดังนี้:
   - ktb (KTB SME)
   - kbank (KBANK)
   - bbl (KMUTT Student)
   - cash (Cash / เงินสด)
   (หากผู้ใช้ไม่ระบุบัญชี ให้เลือกใช้ kbank เป็นค่าเริ่มต้น)
2. เมื่อผู้ใช้สั่งงาน ให้เรียกใช้ Tool/Function Calling ที่ตรงกับเจตนาเสมอ:
   - add_transaction: เมื่อผู้ใช้จ่ายเงิน หรือรับเงินทั่วไป
   - create_split_bill: เมื่อผู้ใช้หารค่าใช้จ่ายกับเพื่อน (ระบุยอดเต็ม, ส่วนของเรา, และสมาชิก)
   - record_transfer: เมื่อโอนเงินระหว่าง 3 บัญชีของเราเอง
   - settle_friend_debt: เมื่อเพื่อนโอนเงินคืนหนี้ที่ค้างไว้
   - get_financial_summary: เมื่อผู้ใช้ถามยอดเงินคงเหลือ หรือใครติดเงินอยู่บ้าง
   - get_recent_transactions: เมื่อผู้ใช้ต้องการดูประวัติรายการล่าสุด
   - delete_recent_transaction: เมื่อผู้ใช้สั่งลบรายการล่าสุด, ยกเลิกรายการล่าสุด, หรือลบธุรกรรมที่เพิ่งบันทึกไป (ระบุ count ตามที่ผู้ใช้สั่ง หากไม่ระบุให้เป็น 1)
3. วันที่ปัจจุบันคือ: ${getBangkokDateString()} (เขตเวลา Asia/Bangkok GMT+7)
4. รูปแบบการตอบกลับ:
   ให้สรุปผลการทำรายการอย่างชัดเจน กระชับ เป็นมิตร ในรูปแบบ:
   🎯 สถานะ / สรุปรายการ
   📊 รายละเอียด
   💡 ข้อมูลอัพเดต / ยอดคงเหลือล่าสุด
`;

export class GeminiAgentClient {
  static getApiKey() {
    const fromEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : '';
    const fromStorage = typeof localStorage !== 'undefined' ? localStorage.getItem('banjii_agent_gemini_key') : '';
    return (fromEnv || fromStorage || '').trim();
  }

  static getSelectedModel() {
    return (typeof localStorage !== 'undefined' ? localStorage.getItem('banjii_agent_model') : '') || 'gemini-3.6-flash';
  }

  static getModelDisplayName(rawModel) {
    if (rawModel === 'gemini-3.6-flash') return 'Gemini 3.6 Flash';
    if (rawModel === 'gemini-flash-latest') return 'Gemini Flash Latest';
    if (rawModel === 'gemini-3.5-flash') return 'Gemini 3.5 Flash';
    return rawModel || 'Gemini AI';
  }

  static async processMessage(userMessage) {
    const apiKey = this.getApiKey();
    const modelName = this.getSelectedModel();
    const engineLabel = this.getModelDisplayName(modelName);

    // If no API key configured, use built-in intelligent Thai NLP fallback parser
    if (!apiKey) {
      console.log('No Gemini API Key provided. Using Built-in Thai NLP Parser.');
      const nlpResult = await ThaiNlpParser.parseAndExecute(userMessage);
      return {
        ...nlpResult,
        engine: 'Built-in Thai NLP',
      };
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: GEMINI_TOOLS_DECLARATION }],
      });

      const result = await model.generateContent(userMessage);
      const response = await result.response;
      const functionCalls = response.functionCalls();

      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        console.log(`Gemini invoked tool: ${call.name}`, call.args);

        // Execute the tool on Supabase
        const toolResult = await executeAgentTool(call.name, call.args);

        return {
          ...toolResult,
          engine: engineLabel,
        };
      }

      // If Gemini responded with plain text without tool calling, return text
      const plainText = response.text();
      return {
        tool: 'chat',
        success: true,
        formattedReply: plainText,
        engine: engineLabel,
      };
    } catch (err) {
      console.error('Gemini API call failed, falling back to Thai NLP parser:', err);
      // Fallback seamlessly to local parser
      const fallbackResult = await ThaiNlpParser.parseAndExecute(userMessage);
      return {
        ...fallbackResult,
        engine: 'Built-in Thai NLP (Fallback)',
      };
    }
  }
}

