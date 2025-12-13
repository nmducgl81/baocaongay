import { GoogleGenAI } from "@google/genai";
import { SalesRecord } from "../types";

const API_KEY = process.env.API_KEY || '';

export const createChatSession = (data: SalesRecord[]) => {
  if (!API_KEY) {
    console.error("API Key is missing");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // Create a summarized context of the data to save tokens
  const dataContext = JSON.stringify(data.map(d => ({
    name: d.name,
    role: d.dsaCode ? 'DSA' : 'Manager',
    status: d.status,
    vol: d.directVolume,
    app: d.directApp,
    loan: d.directLoan,
    calls: d.callsMonth
  })), null, 2);

  const systemInstruction = `
    Bạn là trợ lý ảo AI hỗ trợ đội ngũ kinh doanh (Sales Assistant).
    Bạn có quyền truy cập vào dữ liệu báo cáo bán hàng hiện tại của team.
    
    Dữ liệu hiện tại (JSON):
    ${dataContext}

    Nhiệm vụ của bạn:
    1. Trả lời các câu hỏi về doanh số, ai đang dẫn đầu, ai chưa báo cáo.
    2. Động viên nhân viên nếu doanh số thấp.
    3. Trả lời ngắn gọn, súc tích, giọng điệu chuyên nghiệp nhưng thân thiện, nhiệt huyết.
    4. Nếu được hỏi về dữ liệu không có trong JSON, hãy nói là bạn chưa có thông tin đó.
    5. Đơn vị tiền tệ là VND, hãy format số tiền cho dễ đọc (ví dụ: 10 triệu, 100k).
  `;

  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: systemInstruction,
    },
  });

  return chat;
};