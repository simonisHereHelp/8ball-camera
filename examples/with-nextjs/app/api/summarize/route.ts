// app/api/summarize/route.ts

import { NextResponse } from "next/server";

import { GPT_Router } from "@/lib/gptRouter";
import {
  CANONICALS_BIBLE_SOURCE,
  PROMPT_SUMMARY_SOURCE,
} from "@/lib/jsonCanonSources";


export async function POST(req: Request) {

  const apiKey = process.env.OPENAI_API_KEY;

  const PROMPT_ID = PROMPT_SUMMARY_SOURCE;

  const CANONICAL_FILE_ID = CANONICALS_BIBLE_SOURCE;

  try {

    // 1️⃣ 獲取準備好的 Bible 數據 (物件格式)

    // 內部封裝了 fetchCanonicalFileContent

    const bibleData = await GPT_Router._fetchFile(CANONICAL_FILE_ID);



    // 2️⃣ 取得注入數據後的 Prompt

    // 注意：getUserPrompt 內部不會再發起 Bible 的 fetch 請求

    const [systemPrompt, userPrompt] = await Promise.all([

      GPT_Router.getSystemPrompt(PROMPT_ID),

      GPT_Router.getUserPrompt(PROMPT_ID, bibleData)

    ]);



    // 3️⃣ 圖片處理邏輯 (與先前一致)

    const formData = await req.formData();

    const imageFiles = formData.getAll("image").filter((f): f is File => f instanceof File);

    const imageUrls = await Promise.all(

      imageFiles.map(async (file) => {

        const buffer = Buffer.from(await file.arrayBuffer()).toString("base64");

        return `data:${file.type};base64,${buffer}`;

      })

    );



    // 4️⃣ 呼叫 OpenAI

    const content = [

      { type: "text", text: userPrompt },

      ...imageUrls.map((url) => ({ type: "image_url", image_url: { url } })),

    ];



    const response = await fetch("https://api.openai.com/v1/chat/completions", {

      method: "POST",

      headers: {

        "Content-Type": "application/json",

        Authorization: `Bearer ${apiKey}`,

      },

      body: JSON.stringify({

        model: "gpt-4o-mini",

        messages: [

          { role: "system", content: systemPrompt },

          { role: "user", content },

        ],

        temperature: 0,

      }),

    });



    const data = await response.json();

    return NextResponse.json({ summary: data?.choices?.[0]?.message?.content ?? "" });



  } catch (err: any) {

    console.error("Summarize Error:", err);

    return NextResponse.json({ error: err.message }, { status: 500 });

  }

}

