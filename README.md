# Prompt & Canon Sources (Next.js 14 uploader)

This project reads JSON configs from the `json_canon/` folder by default (overridable via env paths/IDs). They drive summarization, file naming, canonical updates, and now subfolder routing for saves.
# React Web Camera
A lightweight and flexible React component for capturing images from the user’s camera (front or back) with support for `jpeg`, `png`, and `webp` formats. Built with modern React (`hooks` + `forwardRef`) and works on both desktop and mobile browsers.

# json_canon
This project reads four JSON configs from the `json_canon/` folder by default (overridable via env paths/IDs). They drive summarization, file naming, and canonical updates.

## Files and env fallbacks
- `prompt_summary.json` (`PROMPT_SUMMARY_JSON_PATH` or `PROMPT_SUMMARY_JSON_ID`) – system/user prompt templates for summarization.
- `prompts_setName.json` (`PROMPT_SET_NAME_JSON_PATH` or `PROMPT_SET_NAME_JSON_ID`) – templates for GPT-derived filenames.
- `prompts_issuerCanon.json` (`PROMPT_ISSUER_CANON_JSON_PATH` or `PROMPT_ISSUER_CANON_JSON_ID`) – issuer/canon prompt helpers (kept available for future GPT calls).
- `canonicals_bible.json` (`CANONICALS_BIBLE_JSON_PATH` or `DRIVE_FILE_ID_CANONICALS`) – issuer/type/action dictionary used during prompt injection and updates.
- `prompt_designated_subfolder.json` (`PROMPT_DESIGNATED_SUBFOLDER` or `PROMPT_DESIGNATED_SUBFOLDER_ID`) – system/user prompt for mapping a summary to a topic folder.
- `drive_active_subfolders.json` (`DRIVE_ACTIVE_SUBFOLDER_PATH` or `DRIVE_ACTIVE_SUBFOLDER_ID`) – list of eligible Drive subfolders/topics. Each entry should have a `topic`, optional `keywords`/`description`, and an optional `folderId` override. When omitted, each topic is appended to `DRIVE_FOLDER_ID` (e.g., `DRIVE_FOLDER_ID + "/BanksAndCards"`).
- `DRIVE_FALLBACK_FOLDER_ID` (env only; defaults to `DRIVE_FOLDER_ID`) – fallback Drive folder when no topic match is found.

All sources resolve through `jsonCanonSources` so local paths and Drive IDs share the same code path.

## Where they are used
- **getSystemPrompt / getUserPrompt** (`lib/gptRouter.ts`)
  - `prompt_summary.json` injects canonical values into the summarize prompt for `/api/summarize`.
  - `prompts_setName.json` injects the edited summary into the naming prompt for `/api/save-set`.
- **handleSave flow** (`lib/handleSave.tsx`)
  - Sends the edited summary + images to `/api/save-set`, which calls `getSystemPrompt`/`getUserPrompt` with `prompts_setName.json` before uploading to Drive.
  - The API chooses a target Drive subfolder using `drive_active_subfolders.json` + `prompt_designated_subfolder.json` (keyword match first, then GPT classification) and resolves it under `DRIVE_FOLDER_ID` (e.g., `DRIVE_FOLDER_ID + "/<topic>"` when `folderId` is omitted). It falls back to `DRIVE_FALLBACK_FOLDER_ID` (or `DRIVE_FOLDER_ID`).
  - Triggers `/api/update-issuerCanon` after save so canon updates stay in sync.
- **Update Canonicals** (`app/api/update-issuerCanon/route.ts`)
  - `canonicals_bible.json` is fetched (local path or Drive) to resolve current issuers/types, and Drive writes are blocked when a local path is supplied.
  - `prompts_issuerCanon.json` remains available for issuer prompt patterns if needed alongside the bible.

## Quick endpoint map
- `/api/summarize`: uses `prompt_summary.json` + `canonicals_bible.json` for injected system/user prompts.
- `/api/save-set`: uses `prompts_setName.json` for naming, maps summaries to active Drive subfolders (keywords → GPT prompt → fallback), then uploads all files to the resolved folder.
- `/api/update-issuerCanon`: reads/writes `canonicals_bible.json` (Drive only) to add masters/aliases after saves.

## Example configs (place in `json_canon/` and point envs as needed)

`drive_active_subfolders.json`
```json
{
  "subfolders": [
    {
      "topic": "BankAndCard",
      "keywords": ["bank", "credit card", "statement"],
      "description": "Finance, banking, and card-related documents"
    },
    {
      "topic": "Travel",
      "keywords": ["flight", "hotel", "boarding"],
      "description": "Travel bookings and confirmations"
    }
  ]
}
```

`prompt_designated_subfolder.json`
```json
{
  "system": "Classify the document summary into one of the provided topics. Answer with only the topic string.",
  "user": "Topics: {{TOPICS}}\nSummary: {{SUMMARY}}\nReturn the best matching topic from the list."
}
```

Set `DRIVE_ACTIVE_SUBFOLDER_PATH` and `PROMPT_DESIGNATED_SUBFOLDER` to these files (or their Drive IDs), and optionally set `DRIVE_FALLBACK_FOLDER_ID` when you want a folder other than `DRIVE_FOLDER_ID` as the default.
```json
{
  "subfolders": [
    {
      "topic": "BankAndCard",
      "keywords": ["bank", "credit card", "statement"],
      "description": "Finance, banking, and card-related documents"
    },
    {
      "topic": "Travel",
      "keywords": ["flight", "hotel", "boarding"],
      "description": "Travel bookings and confirmations"
    }
  ]
}
```

`prompt_designated_subfolder.json`
```json
{
  "system": "Classify the document summary into one of the provided topics. Answer with only the topic string.",
  "user": "Topics: {{TOPICS}}\nSummary: {{SUMMARY}}\nReturn the best matching topic from the list."
}
```

Set `DRIVE_ACTIVE_SUBFOLDER_PATH` and `PROMPT_DESIGNATED_SUBFOLDER` to these files (or their Drive IDs), and optionally set `DRIVE_FALLBACK_FOLDER_ID` when you want a folder other than `DRIVE_FOLDER_ID` as the default.
```json
{
  "subfolders": [
    {
      "topic": "BankAndCard",
      "keywords": ["bank", "credit card", "statement"],
      "description": "Finance, banking, and card-related documents"
    },
    {
      "topic": "Travel",
      "keywords": ["flight", "hotel", "boarding"],
      "description": "Travel bookings and confirmations"
    }
  ]
}
```

`prompt_designated_subfolder.json`
```json
{
  "system": "Classify the document summary into one of the provided topics. Answer with only the topic string.",
  "user": "Topics: {{TOPICS}}\nSummary: {{SUMMARY}}\nReturn the best matching topic from the list."
}
```

Set `DRIVE_ACTIVE_SUBFOLDER_PATH` and `PROMPT_DESIGNATED_SUBFOLDER` to these files (or their Drive IDs), and optionally set `DRIVE_FALLBACK_FOLDER_ID` when you want a folder other than `DRIVE_FOLDER_ID` as the default.
```json
{
  "subfolders": [
    {
      "topic": "BankAndCard",
      "keywords": ["bank", "credit card", "statement"],
      "description": "Finance, banking, and card-related documents"
    },
    {
      "topic": "Travel",
      "keywords": ["flight", "hotel", "boarding"],
      "description": "Travel bookings and confirmations"
    }
  ]
}
```

`prompt_designated_subfolder.json`
```json
{
  "system": "Classify the document summary into one of the provided topics. Answer with only the topic string.",
  "user": "Topics: {{TOPICS}}\nSummary: {{SUMMARY}}\nReturn the best matching topic from the list."
}
```

Set `DRIVE_ACTIVE_SUBFOLDER_PATH` and `PROMPT_DESIGNATED_SUBFOLDER` to these files (or their Drive IDs), and optionally set `DRIVE_FALLBACK_FOLDER_ID` when you want a folder other than `DRIVE_FOLDER_ID` as the default.
- `/api/save-set`: uses `prompts_setName.json` for naming and uploads all files to Drive.
- `/api/update-issuerCanon`: reads/writes `canonicals_bible.json` (Drive only) to add masters/aliases after saves.

## 成功命名文件
-命名例子：
-社會局-個人資料蒐集同意書-請回覆是否同意-20251207
-Jackson-術語解釋-一般處理-20251207

## 成功上傳
![alt text](./examples/with-nextjs/local_stuff/successUpload.png)
## 成功 NextAuth + Google登錄
https://refine.dev/blog/nextauth-google-github-authentication-nextjs/#introduction
Cloud Console Project: 8ball-2
```
浪費8小時，原來是ID信息錯誤。接下來是upload去G Drive
```
---
## Auth Client setup （G Cloud Console）
- Client ID 與 Secret + Test user
- 無需SCOPEs
![alt text](./examples/with-nextjs/local_stuff/successAuth.png)
## MileStone （Dec 4, 2025)
--12/04- multiple images+text for ONE GPT completion
--12/04- 使用next-auth, 關鍵 auth.js + content.tsx

## Remote prompts (Dec 3. 2025 接下來要 nextauth)

The `/api/summarize` route expects a `prompts.json` file hosted at a reachable URL (for example, a Google Drive "anyone with the link" file). Set `PROMPTS_URL` to the download URL and deploy. The JSON should include the following fields:

```json
{
  "system": "You are a meticulous document reader...",
  "user": "Summarize the document content in about {{wordTarget}} words...",
  "wordTarget": 120
}
```

An example file lives at `prompts.example.json`. Copy it to Google Drive, share it publicly, and set `PROMPTS_URL` accordingly. If the URL cannot be fetched at runtime, the API falls back to a built-in summarization prompt.


## Why?

Capturing multiple images from a webcam is a common need in modern web apps, especially Progressive Web Apps (PWAs).
Existing solutions are often:

- Single-shot only (cannot capture multiple images)
- Bloated or heavy
- Hard to customize UI or styling
- Not fully compatible with PWAs or mobile browsers

**Problem with `<input type="file" capture>` on mobile:**  
When you use a file input like:

```html
<input type="file" accept="image/*" capture="environment" />
```

on phones, it only allows **a single photo capture**. After you take one photo, the camera closes, and to capture another, the user must reopen the camera again.  
This creates a poor user experience for apps needing **multi-photo sessions** (for example: KYC verification, delivery apps, or documentation workflows).

---

## Our Solution

`react-web-camera` provides a headless, platform-independent React component that gives you full control over your UI. It handles the complex logic of accessing the webcam, capturing multiple images, and managing state, while you focus on styling and user experience.

This makes it:

- **Lightweight** – minimal overhead for fast, responsive apps
- **Flexible** – integrate seamlessly with your design system
- **Multi-Image Ready** – capture and manage multiple photos in a single session

---

## Features

- **📷 Front & Back Camera Support** – Easily capture images from both cameras.
- **🖼 Multiple Image Formats** – Export images as jpeg, png, or webp.
- **⚡ Adjustable Capture Quality** – Control image quality with a range of 0.1–1.0.
- **🔄 Camera Switching** – Seamlessly switch between front (user) and back (environment) cameras.
- **📸 Multi-Image Capture** – Click and manage multiple pictures within a session on both web and mobile.
- **🎯 Camera Ready on Mount** – Access the camera instantly when the component loads.
- **🛠 Full Programmatic Control** – Use ref methods like capture(), switch(), and getMode().
- **🎨 Custom Styling** – Style the container and video element to match your design system.

---

---

## Usage


- **Next.js Example (App Router)**

```tsx
"use client";

import { WebCamera } from "@shivantra/react-web-camera";

export default function CameraPage() {
  return (
    <main>
      <h1>📸 Next.js Webcam Example</h1>
      <WebCamera
        style={{ width: 320, height: 480, padding: 10 }}
        videoStyle={{ borderRadius: 5 }}
        className="camera-container"
        videoClassName="camera-video"
        captureMode="front"
        getFileName={() => `next-photo-${Date.now()}.jpeg`}
        onError={(err) => console.error(err)}
      />
    </main>
  );
}
```


---

## Props ⚙️

| Prop             | Type                            | Default  | Description                                      |
| ---------------- | ------------------------------- | -------- | ------------------------------------------------ |
| `className`      | `string`                        | —        | CSS class for the wrapper `<div>`                |
| `style`          | `React.CSSProperties`           | —        | Inline styles for the wrapper `<div>`            |
| `videoClassName` | `string`                        | —        | CSS class for the `<video>` element              |
| `videoStyle`     | `React.CSSProperties`           | —        | Inline styles for the `<video>` element          |
| `getFileName`    | `() => string`                  | —        | Optional function to generate captured file name |
| `captureMode`    | `"front"` \| `"back"`           | `"back"` | Initial camera mode                              |
| `captureType`    | `"jpeg"` \| `"png"` \| `"webp"` | `"jpeg"` | Image format for capture                         |
| `captureQuality` | `0.1`–`1.0`                     | `0.8`    | Image quality for capture                        |
| `onError`        | `(err: Error) => void`          | —        | Callback for camera errors                       |

---

## Ref Methods

Access these methods via `ref`:

| Method      | Description                                                    |
| ----------- | -------------------------------------------------------------- |
| `capture()` | Captures an image from the camera and returns a `File` object. |
| `switch()`  | Switches between front and back cameras.                       |
| `getMode()` | Returns current camera mode: `"front"` or `"back"`.            |

---

## Notes

- On mobile devices, some browsers may require HTTPS to access the camera.
- Ensure the user grants camera permissions; otherwise, the component will throw an error.
- `videoStyle` and `style` are independent — `videoStyle` only affects the video element, `style` affects the container.

---

## License

MIT License © 2025 Shivantra Solutions Private Limited

---

## Contact

For more details about our projects, services, or any general information regarding **react-web-camera**, feel free to reach out to us. We are here to provide support and answer any questions you may have. Below are the best ways to contact our team:

**Email:** Send us your inquiries or support requests at [contact@shivantra.com](mailto:contact@shivantra.com).  
**Website:** Visit our official website for more information: [Shivantra](https://shivantra.com).

**Follow us on social media for updates:**

- **LinkedIn:** [Shivantra](https://www.linkedin.com/company/shivantra)
- **Instagram:** [@Shivantra](https://www.instagram.com/shivantra/)
- **Github:** [Shivantra](https://www.github.com/shivantra/)

We look forward to assisting you and ensuring your experience with **react-web-camera** is smooth and enjoyable!
