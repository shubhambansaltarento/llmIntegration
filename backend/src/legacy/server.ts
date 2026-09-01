import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { streamChat } from "./services/openai.service.js";
import { streamChat as streamChatGemini } from "./services/gemini.service.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      error: "Message is required",
    });
  }

  try {
    const stream = await streamChat(message);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        res.write(
          `data: ${JSON.stringify({
            type: "text",
            value: event.delta,
          })}\n\n`
        );
      }
    }

    res.write(
      `data: ${JSON.stringify({
        type: "done",
      })}\n\n`
    );

    res.end();

  } catch (error) {

    console.error(error);

    res.write(
      `data: ${JSON.stringify({
        type: "error",
        message: "Something went wrong",
      })}\n\n`
    );

    res.end();
  }
});

app.post("/api/chat/gemini", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      error: "Message is required",
    });
  }

  try {
    const stream = await streamChatGemini(message);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(
          `data: ${JSON.stringify({
            type: "text",
            value: chunk.text,
          })}\n\n`
        );
      }
    }

    res.write(
      `data: ${JSON.stringify({
        type: "done",
      })}\n\n`
    );

    res.end();

  } catch (error) {

    console.error(error);

    res.write(
      `data: ${JSON.stringify({
        type: "error",
        message: "Something went wrong",
      })}\n\n`
    );

    res.end();
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});