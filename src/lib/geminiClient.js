import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_TOOLS_DECLARATION, executeAgentTool } from './agentTools.js';
import { ThaiNlpParser } from './thaiNlpParser.js';
import { getBangkokDateString } from './dateUtils.js';

const SYSTEM_INSTRUCTION = `
à¸„à¸¸à¸“à¸„à¸·à¸­ Banjii Conversational Financial AI Agent à¸œà¸¹à¹‰à¸Šà¹ˆà¸§à¸¢à¸ˆà¸±à¸”à¸à¸²à¸£à¸à¸²à¸£à¹€à¸‡à¸´à¸™à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸­à¸±à¸ˆà¸‰à¸£à¸´à¸¢à¸° à¸—à¸³à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸šà¸±à¸™à¸—à¸¶à¸ à¸£à¸²à¸¢à¸ˆà¹ˆà¸²à¸¢, à¸£à¸²à¸¢à¸£à¸±à¸š, à¸šà¸´à¸¥à¸«à¸²à¸£à¸à¸±à¸šà¹€à¸žà¸·à¹ˆà¸­à¸™, à¸à¸²à¸£à¹‚à¸­à¸™à¹€à¸‡à¸´à¸™à¸‚à¹‰à¸²à¸¡à¸šà¸±à¸à¸Šà¸µ à¹à¸¥à¸°à¸à¸²à¸£à¸•à¸±à¸”à¸«à¸™à¸µà¹‰à¹€à¸žà¸·à¹ˆà¸­à¸™
à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸£à¸°à¸šà¸šà¹à¸¥à¸°à¸à¸Žà¸ªà¸³à¸„à¸±à¸:
1. à¸šà¸±à¸à¸Šà¸µà¸˜à¸™à¸²à¸„à¸²à¸£à¸¡à¸µà¹€à¸žà¸µà¸¢à¸‡ 3 à¸šà¸±à¸à¸Šà¸µà¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™ à¸„à¸·à¸­:
   - ktb (KTB SME)
   - kbank (KBANK)
   - bbl (KMUTT Student)
   (à¸«à¸²à¸à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸à¸šà¸±à¸à¸Šà¸µ à¹ƒà¸«à¹‰à¹€à¸¥à¸·à¸­à¸à¹ƒà¸Šà¹‰ kbank à¹€à¸›à¹‡à¸™à¸„à¹ˆà¸²à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™)
2. à¹€à¸¡à¸·à¹ˆà¸­à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸ªà¸±à¹ˆà¸‡à¸‡à¸²à¸™ à¹ƒà¸«à¹‰à¹€à¸£à¸µà¸¢à¸à¹ƒà¸Šà¹‰ Tool/Function Calling à¸—à¸µà¹ˆà¸•à¸£à¸‡à¸à¸±à¸šà¹€à¸ˆà¸•à¸™à¸²à¹€à¸ªà¸¡à¸­:
   - add_transaction: à¹€à¸¡à¸·à¹ˆà¸­à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸ˆà¹ˆà¸²à¸¢à¹€à¸‡à¸´à¸™ à¸«à¸£à¸·à¸­à¸£à¸±à¸šà¹€à¸‡à¸´à¸™à¸—à¸±à¹ˆà¸§à¹„à¸›
   - create_split_bill: à¹€à¸¡à¸·à¹ˆà¸­à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸«à¸²à¸£à¸„à¹ˆà¸²à¹ƒà¸Šà¹‰à¸ˆà¹ˆà¸²à¸¢à¸à¸±à¸šà¹€à¸žà¸·à¹ˆà¸­à¸™ (à¸£à¸°à¸šà¸¸à¸¢à¸­à¸”à¹€à¸•à¹‡à¸¡, à¸ªà¹ˆà¸§à¸™à¸‚à¸­à¸‡à¹€à¸£à¸², à¹à¸¥à¸°à¸ªà¸¡à¸²à¸Šà¸´à¸)
   - record_transfer: à¹€à¸¡à¸·à¹ˆà¸­à¹‚à¸­à¸™à¹€à¸‡à¸´à¸™à¸£à¸°à¸«à¸§à¹ˆà¸²à¸‡ 3 à¸šà¸±à¸à¸Šà¸µà¸‚à¸­à¸‡à¹€à¸£à¸²à¹€à¸­à¸‡
   - settle_friend_debt: à¹€à¸¡à¸·à¹ˆà¸­à¹€à¸žà¸·à¹ˆà¸­à¸™à¹‚à¸­à¸™à¹€à¸‡à¸´à¸™à¸„à¸·à¸™à¸«à¸™à¸µà¹‰à¸—à¸µà¹ˆà¸„à¹‰à¸²à¸‡à¹„à¸§à¹‰
   - get_financial_summary: à¹€à¸¡à¸·à¹ˆà¸­à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸–à¸²à¸¡à¸¢à¸­à¸”à¹€à¸‡à¸´à¸™à¸„à¸‡à¹€à¸«à¸¥à¸·à¸­ à¸«à¸£à¸·à¸­à¹ƒà¸„à¸£à¸•à¸´à¸”à¹€à¸‡à¸´à¸™à¸­à¸¢à¸¹à¹ˆà¸šà¹‰à¸²à¸‡
   - get_recent_transactions: à¹€à¸¡à¸·à¹ˆà¸­à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸”à¸¹à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸£à¸²à¸¢à¸à¸²à¸£à¸¥à¹ˆà¸²à¸ªà¸¸à¸”
3. à¸§à¸±à¸™à¸—à¸µà¹ˆà¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™à¸„à¸·à¸­: ${getBangkokDateString()} (à¹€à¸‚à¸•à¹€à¸§à¸¥à¸² Asia/Bangkok GMT+7)
4. à¸£à¸¹à¸›à¹à¸šà¸šà¸à¸²à¸£à¸•à¸­à¸šà¸à¸¥à¸±à¸š:
   à¹ƒà¸«à¹‰à¸ªà¸£à¸¸à¸›à¸œà¸¥à¸à¸²à¸£à¸—à¸³à¸£à¸²à¸¢à¸à¸²à¸£à¸­à¸¢à¹ˆà¸²à¸‡à¸Šà¸±à¸”à¹€à¸ˆà¸™ à¸à¸£à¸°à¸Šà¸±à¸š à¹€à¸›à¹‡à¸™à¸¡à¸´à¸•à¸£ à¹ƒà¸™à¸£à¸¹à¸›à¹à¸šà¸š:
   ðŸŽ¯ à¸ªà¸–à¸²à¸™à¸° / à¸ªà¸£à¸¸à¸›à¸£à¸²à¸¢à¸à¸²à¸£
   ðŸ“Š à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”
   ðŸ’¡ à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸­à¸±à¸žà¹€à¸”à¸• / à¸¢à¸­à¸”à¸„à¸‡à¹€à¸«à¸¥à¸·à¸­à¸¥à¹ˆà¸²à¸ªà¸¸à¸”
`;

export class GeminiAgentClient {
  static getApiKey() {
    return (
      localStorage.getItem('banjii_agent_gemini_key') ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      ''
    ).trim();
  }

  static getSelectedModel() {
    return localStorage.getItem('banjii_agent_model') || 'gemini-2.0-flash';
  }

  static async processMessage(userMessage) {
    const apiKey = this.getApiKey();
    const modelName = this.getSelectedModel();

    // If no API key configured, use built-in intelligent Thai NLP fallback parser
    if (!apiKey) {
      console.log('No Gemini API Key provided. Using Built-in Thai NLP Parser.');
      return await ThaiNlpParser.parseAndExecute(userMessage);
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

        // Feed tool result back to Gemini for conversational response
        try {
          const secondChat = model.startChat({
            history: [
              { role: 'user', parts: [{ text: userMessage }] },
              { role: 'model', parts: [{ functionCall: call }] },
              {
                role: 'function',
                parts: [
                  {
                    functionResponse: {
                      name: call.name,
                      response: { output: toolResult },
                    },
                  },
                ],
              },
            ],
          });

          const secondResult = await secondChat.sendMessage('à¸ªà¸£à¸¸à¸›à¸œà¸¥à¸à¸²à¸£à¸—à¸³à¸£à¸²à¸¢à¸à¸²à¸£à¹ƒà¸«à¹‰à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¹ƒà¸™à¸£à¸¹à¸›à¹à¸šà¸šà¸—à¸µà¹ˆà¸à¸³à¸«à¸™à¸”');
          const finalReply = await secondResult.response.text();

          return {
            ...toolResult,
            formattedReply: finalReply || toolResult.formattedReply,
          };
        } catch (secondErr) {
          console.warn('Error in Gemini secondary synthesis, returning tool standard response:', secondErr);
          return toolResult;
        }
      }

      // If Gemini responded with plain text without tool calling, return text
      const plainText = response.text();
      return {
        tool: 'chat',
        success: true,
        formattedReply: plainText,
      };
    } catch (err) {
      console.error('Gemini API call failed, falling back to Thai NLP parser:', err);
      // Fallback seamlessly to local parser
      return await ThaiNlpParser.parseAndExecute(userMessage);
    }
  }
}

