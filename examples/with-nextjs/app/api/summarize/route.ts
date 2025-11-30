import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY environment variable." },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const imageFile = formData.get("image");

  if (!(imageFile instanceof File)) {
    return NextResponse.json(
      { error: "Image file is required." },
      { status: 400 },
    );
  }

  const arrayBuffer = await imageFile.arrayBuffer();
  const base64Image = Buffer.from(arrayBuffer).toString("base64");
  const imageUrl = `data:${imageFile.type};base64,${base64Image}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a document reader, task is to understand the document. OCR the uploaded image and display a 100 word summary text.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Provide a concise summary of this document (about 100 words).",
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 400,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json(
      { error: error || "Failed to summarize image." },
      { status: response.status },
    );
  }

  const data = await response.json();
  const summary = data?.choices?.[0]?.message?.content ?? "";

  return NextResponse.json({ summary });
}