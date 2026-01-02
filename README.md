# Prompt & Canon Sources (Next.js 14 uploader)

This project reads JSON configs from the `json_canon/` folder by default (overridable via env paths/IDs). They drive summarization, file naming, canonical updates, and now subfolder routing for saves.

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
