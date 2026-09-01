export async function streamChat(
  message: string,
  onChunk: (chunk: string) => void
) {
  const response = await fetch("http://localhost:3000/api/chat", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      message,
    }),
  });

  if (!response.body) {
    throw new Error("Streaming not supported");
  }

  const reader = response.body.getReader();

  const decoder = new TextDecoder();

  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, {
      stream: true,
    });

    const events = buffer.split("\n\n");

    buffer = events.pop() ?? "";

    for (const event of events) {
      if (!event.startsWith("data:")) {
        continue;
      }

      const json = event.replace("data:", "").trim();

      const data = JSON.parse(json);

      if (data.type === "text") {
        onChunk(data.value);
      }
    }
  }
}