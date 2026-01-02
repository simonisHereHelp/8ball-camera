import path from "path";

const JSON_CANON_BASE_PATH =
  process.env.JSON_CANON_BASE_PATH || path.join(process.cwd(), "json_canon");

const buildLocalPath = (fileName: string) => path.join(JSON_CANON_BASE_PATH, fileName);

const resolveJsonSource = (
  envPath: string | undefined,
  envId: string | undefined,
  localFileName: string
) => {
  if (envPath) return envPath;
  if (envId) return envId;
  return buildLocalPath(localFileName);
};

export const PROMPT_SUMMARY_SOURCE = resolveJsonSource(
  process.env.PROMPT_SUMMARY_JSON_PATH,
  process.env.PROMPT_SUMMARY_JSON_ID,
  "prompt_summary.json"
);

export const PROMPT_ISSUER_CANON_SOURCE = resolveJsonSource(
  process.env.PROMPT_ISSUER_CANON_JSON_PATH,
  process.env.PROMPT_ISSUER_CANON_JSON_ID,
  "prompts_issuerCanon.json"
);

export const PROMPT_SET_NAME_SOURCE = resolveJsonSource(
  process.env.PROMPT_SET_NAME_JSON_PATH,
  process.env.PROMPT_SET_NAME_JSON_ID,
  "prompts_setName.json"
);

export const CANONICALS_BIBLE_SOURCE = resolveJsonSource(
  process.env.CANONICALS_BIBLE_JSON_PATH,
  process.env.DRIVE_FILE_ID_CANONICALS,
  "canonicals_bible.json"
);
