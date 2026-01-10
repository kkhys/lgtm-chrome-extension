import { API_PATHS, IMAGE_FORMAT, LGTM_BASE_URL } from "#/config/constants";

export const fetchLgtmIds = async () => {
  const response = await fetch(`${LGTM_BASE_URL}${API_PATHS.IDS_JSON}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch API: ${response.status}`);
  }
  const data = await response.json();
  return data.ids as string[];
};

export const getRandomId = (ids: string[]) => {
  if (ids.length === 0) {
    throw new Error("No image IDs found");
  }
  const randomIndex = Math.floor(Math.random() * ids.length);
  const selectedId = ids[randomIndex];
  if (selectedId === undefined) {
    throw new Error("Unexpected error: Failed to get ID");
  }
  return selectedId;
};

export const generateLgtmHtml = (id: string) => {
  const url = `${LGTM_BASE_URL}/${id}`;
  const imageUrl = `${LGTM_BASE_URL}/${id}${IMAGE_FORMAT.AVIF}`;
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

export const handleIconClick = async () => {
  try {
    const ids = await fetchLgtmIds();
    const randomId = getRandomId(ids);
    const html = generateLgtmHtml(randomId);
    await copyToClipboard(html);
  } catch (error) {
    console.error("Copy error:", error);
  }
};

chrome.action.onClicked.addListener(() => handleIconClick());
