import OpenAI from "openai";

let openai: OpenAI;

export async function streamChat(message: string) {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openai.responses.create({
    model: "gpt-5.6-luna",
    input: message,
    stream: true,
  });
}