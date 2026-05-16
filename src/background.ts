import {
  API_PATHS,
  LGTM_BASE_URL,
  LGTM_FORMATS,
  type LgtmEntry,
} from "#/config/constants";

const isLgtmEntry = (value: unknown): value is LgtmEntry => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.format === "string" &&
    (LGTM_FORMATS as readonly string[]).includes(candidate.format)
  );
};

export const fetchLgtmEntries = async (): Promise<LgtmEntry[]> => {
  const response = await fetch(`${LGTM_BASE_URL}${API_PATHS.IDS_JSON}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch API: ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data?.entries) || !data.entries.every(isLgtmEntry)) {
    throw new Error("Unexpected API response: entries missing or malformed");
  }
  return data.entries;
};

export const getRandomEntry = (entries: LgtmEntry[]): LgtmEntry => {
  if (entries.length === 0) {
    throw new Error("No image entries found");
  }
  const randomIndex = Math.floor(Math.random() * entries.length);
  const selected = entries[randomIndex];
  if (selected === undefined) {
    throw new Error("Unexpected error: Failed to get entry");
  }
  return selected;
};

export const generateLgtmHtml = ({ id, format }: LgtmEntry): string => {
  const url = `${LGTM_BASE_URL}/${id}`;
  const imageUrl = `${LGTM_BASE_URL}/${id}.${format}`;
  return `<a href="${url}"><img src="${imageUrl}" alt="LGTM!!" width="400" /></a>`;
};

export const copyToClipboard = async (text: string) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    throw new Error("No active tab found");
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (textToCopy: string) => navigator.clipboard.writeText(textToCopy),
    args: [text],
  });
};

export const showSuccessBadge = async () => {
  await chrome.action.setBadgeText({ text: "✓" });
  await chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });

  setTimeout(() => {
    chrome.action.setBadgeText({ text: "" });
  }, 2000);
};

export const handleIconClick = async () => {
  try {
    const entries = await fetchLgtmEntries();
    const entry = getRandomEntry(entries);
    const html = generateLgtmHtml(entry);
    await copyToClipboard(html);
    await showSuccessBadge();
  } catch (error) {
    console.error("Copy error:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
  }
};

// Enable action only on GitHub
chrome.runtime.onInstalled.addListener(() => {
  // Disable action by default (icon will be greyed out)
  chrome.action.disable();

  // Clear all rules to ensure only our expected rules are set
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    // Declare a rule to enable the action on GitHub pages
    const githubRule = {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostSuffix: ".github.com" },
        }),
      ],
      actions: [new chrome.declarativeContent.ShowAction()],
    };

    // Apply the rule
    chrome.declarativeContent.onPageChanged.addRules([githubRule]);
  });
});

chrome.action.onClicked.addListener(() => handleIconClick());
