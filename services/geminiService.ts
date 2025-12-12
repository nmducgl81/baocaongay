import { GoogleGenAI } from "@google/genai";
import { SalesRecord } from "../types";

const API_KEY = process.env.API_KEY || '';

export const analyzeSalesData = async (data: SalesRecord[]): Promise<string> => {
  if (!API_KEY) {
    return "API Key is missing. Please check your configuration.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    const prompt = `
      Analyze the following sales team performance data for Vietnam market (currency VND). 
      Identify top performers based on Volume and Activity (Calls/Flyers). 
      Point out who hasn't reported yet.
      Provide a concise summary in Vietnamese suitable for a manager's dashboard.
      
      Data:
      ${JSON.stringify(data.map(d => ({
        name: d.name,
        status: d.status,
        volume: d.directVolume,
        calls: d.callsMonth,
        flyers: d.flyers
      })), null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error analyzing data with Gemini:", error);
    return "Không thể phân tích dữ liệu lúc này. Vui lòng thử lại sau.";
  }
};