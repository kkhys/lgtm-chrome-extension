import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_PATHS, LGTM_BASE_URL, type LgtmEntry } from "#/config/constants";

/**
 * Tests for background.ts
 *
 * @description Tests the behavior of Chrome extension background scripts
 * @note Chrome APIs are mocked for testing
 */

// Variable to store listener function
let onClickedListener: (() => void) | null = null;

// Mock Chrome API (set before import)
const mockChrome = {
  tabs: {
    query: vi.fn(),
  },
  scripting: {
    executeScript: vi.fn(),
  },
  action: {
    onClicked: {
      addListener: vi.fn((listener: () => void) => {
        onClickedListener = listener;
      }),
    },
    disable: vi.fn(),
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
  runtime: {
    onInstalled: {
      addListener: vi.fn((listener: () => void) => {
        // Call listener immediately in test environment
        listener();
      }),
    },
  },
  declarativeContent: {
    onPageChanged: {
      removeRules: vi.fn((_ruleIds: unknown, callback: () => void) => {
        callback();
      }),
      addRules: vi.fn(),
    },
    PageStateMatcher: class {
      constructor(public config: unknown) {}
    },
    ShowAction: class {},
  },
};

// @ts-expect-error - Mock Chrome API
globalThis.chrome = mockChrome;

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Import background.ts after setting up mocks
const {
  fetchLgtmEntries,
  getRandomEntry,
  generateLgtmHtml,
  copyToClipboard,
  showSuccessBadge,
  handleIconClick,
} = await import("#/background");

const stillEntry: LgtmEntry = { id: "still-id", format: "avif" };
const animatedEntry: LgtmEntry = { id: "animated-id", format: "webp" };

describe("background.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchLgtmEntries", () => {
    /**
     * Test successful entry list retrieval
     */
    it("should successfully fetch entries from API", async () => {
      const mockEntries: LgtmEntry[] = [stillEntry, animatedEntry];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: mockEntries }),
        status: 200,
      });

      const entries = await fetchLgtmEntries();
      expect(entries).toEqual(mockEntries);
      expect(mockFetch).toHaveBeenCalledWith(
        `${LGTM_BASE_URL}${API_PATHS.IDS_JSON}`,
      );
    });

    /**
     * Test error handling when API call fails
     */
    it("should throw error when API call fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(fetchLgtmEntries()).rejects.toThrow(
        "Failed to fetch API: 500",
      );
    });

    /**
     * Test network error handling
     */
    it("should throw error on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchLgtmEntries()).rejects.toThrow("Network error");
    });

    /**
     * Test malformed payload handling
     */
    it("should throw error when entries field is missing", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ids: ["id1"] }),
      });

      await expect(fetchLgtmEntries()).rejects.toThrow(
        "Unexpected API response: entries missing or malformed",
      );
    });

    it("should throw error when entry format is unknown", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: [{ id: "x", format: "png" }] }),
      });

      await expect(fetchLgtmEntries()).rejects.toThrow(
        "Unexpected API response: entries missing or malformed",
      );
    });
  });

  describe("getRandomEntry", () => {
    /**
     * Test random entry selection from array
     */
    it("should select random entry from array", () => {
      const entries: LgtmEntry[] = [
        { id: "id1", format: "avif" },
        { id: "id2", format: "avif" },
        { id: "id3", format: "webp" },
        { id: "id4", format: "avif" },
        { id: "id5", format: "webp" },
      ];

      const mockMathRandom = vi.spyOn(Math, "random");
      mockMathRandom.mockReturnValue(0.5);

      const selected = getRandomEntry(entries);

      expect(selected).toEqual({ id: "id3", format: "webp" });

      mockMathRandom.mockRestore();
    });

    /**
     * Test error handling for empty array
     */
    it("should throw error when array is empty", () => {
      expect(() => getRandomEntry([])).toThrow("No image entries found");
    });

    /**
     * Test with single element array
     */
    it("should work correctly with single element array", () => {
      const selected = getRandomEntry([stillEntry]);

      expect(selected).toEqual(stillEntry);
    });
  });

  describe("generateLgtmHtml", () => {
    /**
     * Test correct HTML format generation for still entry
     */
    it("should generate avif HTML for still entry", () => {
      const expectedUrl = `${LGTM_BASE_URL}/${stillEntry.id}`;
      const expectedImageUrl = `${LGTM_BASE_URL}/${stillEntry.id}.avif`;
      const expectedHtml = `<a href="${expectedUrl}"><img src="${expectedImageUrl}" alt="LGTM!!" width="400" /></a>`;

      expect(generateLgtmHtml(stillEntry)).toBe(expectedHtml);
    });

    /**
     * Test correct HTML format generation for animated entry
     */
    it("should generate webp HTML for animated entry", () => {
      const expectedUrl = `${LGTM_BASE_URL}/${animatedEntry.id}`;
      const expectedImageUrl = `${LGTM_BASE_URL}/${animatedEntry.id}.webp`;
      const expectedHtml = `<a href="${expectedUrl}"><img src="${expectedImageUrl}" alt="LGTM!!" width="400" /></a>`;

      expect(generateLgtmHtml(animatedEntry)).toBe(expectedHtml);
    });

    /**
     * Test that HTML contains required elements
     */
    it("should contain all required HTML elements", () => {
      const html = generateLgtmHtml(stillEntry);

      expect(html).toContain("<a href=");
      expect(html).toContain("<img src=");
      expect(html).toContain('alt="LGTM!!"');
      expect(html).toContain('width="400"');
    });
  });

  describe("copyToClipboard", () => {
    /**
     * Test clipboard copy with active tab
     */
    it("should copy to clipboard using active tab", async () => {
      const mockTab = { id: 123, active: true };
      mockChrome.tabs.query.mockResolvedValueOnce([mockTab]);
      mockChrome.scripting.executeScript.mockResolvedValueOnce([]);

      // Mock navigator.clipboard
      const mockWriteText = vi.fn().mockResolvedValueOnce(undefined);
      Object.defineProperty(globalThis.navigator, "clipboard", {
        value: { writeText: mockWriteText },
        writable: true,
      });

      await copyToClipboard("test text");

      expect(mockChrome.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true,
      });
      expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 123 },
        func: expect.any(Function),
        args: ["test text"],
      });

      // Get and execute the function passed to executeScript
      const executeScriptCall =
        mockChrome.scripting.executeScript.mock.calls[0];

      if (executeScriptCall) {
        const funcToExecute = executeScriptCall[0].func;
        const args = executeScriptCall[0].args;

        // Verify navigator.clipboard.writeText is called
        await funcToExecute(args[0]);
        expect(mockWriteText).toHaveBeenCalledWith("test text");
      }
    });

    /**
     * Test error handling when no active tab is found
     */
    it("should throw error when no active tab is found", async () => {
      mockChrome.tabs.query.mockResolvedValueOnce([]);

      await expect(copyToClipboard("test text")).rejects.toThrow(
        "No active tab found",
      );
    });

    /**
     * Test error handling when tab has no ID
     */
    it("should throw error when tab ID does not exist", async () => {
      const mockTab = { active: true }; // No id property
      mockChrome.tabs.query.mockResolvedValueOnce([mockTab]);

      await expect(copyToClipboard("test text")).rejects.toThrow(
        "No active tab found",
      );
    });
  });

  describe("showSuccessBadge", () => {
    /**
     * Test badge is set with correct text and color
     */
    it("should set badge text and background color", async () => {
      await showSuccessBadge();

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        text: "✓",
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: "#4CAF50",
      });
    });

    /**
     * Test badge is cleared after timeout
     */
    it("should clear badge text after 2 seconds", async () => {
      vi.useFakeTimers();

      await showSuccessBadge();

      // Badge should be set initially
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        text: "✓",
      });

      // Fast-forward time by 2 seconds
      vi.advanceTimersByTime(2000);

      // Badge should be cleared
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        text: "",
      });

      vi.useRealTimers();
    });
  });

  describe("handleIconClick", () => {
    /**
     * Test successful icon click handling
     */
    it("should complete icon click handling successfully", async () => {
      const mockEntries: LgtmEntry[] = [stillEntry, animatedEntry];
      const mockTab = { id: 123, active: true };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: mockEntries }),
      });
      mockChrome.tabs.query.mockResolvedValueOnce([mockTab]);
      mockChrome.scripting.executeScript.mockResolvedValueOnce([]);

      const mockMathRandom = vi.spyOn(Math, "random");
      mockMathRandom.mockReturnValue(0.99);

      await handleIconClick();

      expect(mockFetch).toHaveBeenCalled();
      expect(mockChrome.tabs.query).toHaveBeenCalled();
      const executeScriptCall =
        mockChrome.scripting.executeScript.mock.calls[0];
      expect(executeScriptCall?.[0].args?.[0]).toContain(
        `${LGTM_BASE_URL}/${animatedEntry.id}.webp`,
      );
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        text: "✓",
      });

      mockMathRandom.mockRestore();
    });

    /**
     * Test console.error is called on API fetch error
     */
    it("should call console.error on API fetch error", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockFetch.mockRejectedValueOnce(new Error("API Error"));

      await handleIconClick();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Copy error:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    /**
     * Test console.error is called on tab retrieval error
     */
    it("should call console.error on tab retrieval error", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: [stillEntry] }),
      });
      mockChrome.tabs.query.mockResolvedValueOnce([]);

      await handleIconClick();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Copy error:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Chrome extension integration", () => {
    /**
     * Test that chrome.action.onClicked listener is registered
     */
    it("should register chrome.action.onClicked listener", () => {
      // Listener is registered when background.ts is loaded
      expect(onClickedListener).not.toBeNull();
      expect(typeof onClickedListener).toBe("function");
    });

    /**
     * Test that chrome.action.onClicked listener works correctly
     */
    it("should execute chrome.action.onClicked listener correctly", async () => {
      const mockTab = { id: 456, active: true };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: [stillEntry] }),
      });
      mockChrome.tabs.query.mockResolvedValueOnce([mockTab]);
      mockChrome.scripting.executeScript.mockResolvedValueOnce([]);

      // Execute listener function
      await onClickedListener?.();

      // Verify handleIconClick was executed
      expect(mockFetch).toHaveBeenCalled();
      expect(mockChrome.tabs.query).toHaveBeenCalled();
      expect(mockChrome.scripting.executeScript).toHaveBeenCalled();
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        text: "✓",
      });
    });
  });
});
