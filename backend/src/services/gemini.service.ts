import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI;

export async function streamChat(message: string) {
  if (!genAI) {
    genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  return genAI.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: message,
  });
}
