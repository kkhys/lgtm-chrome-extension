export const LGTM_BASE_URL = "https://lgtm.kkhys.me" as const;

export const API_PATHS = {
  IDS_JSON: "/api/ids.json",
} as const;

export const LGTM_FORMATS = ["avif", "webp"] as const;
export type LgtmFormat = (typeof LGTM_FORMATS)[number];

export type LgtmEntry = {
  id: string;
  format: LgtmFormat;
};
