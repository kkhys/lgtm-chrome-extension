import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_PATHS, IMAGE_FORMAT, LGTM_BASE_URL } from "#/config/constants";

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
  fetchLgtmIds,
  getRandomId,
  generateLgtmHtml,
  copyToClipboard,
  handleIconClick,
} = await import("#/background");

describe("background.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchLgtmIds", () => {
    /**
     * Test successful ID list retrieval
     */
    it("should successfully fetch ID list from API", async () => {
      const mockIds = ["id1", "id2", "id3"];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ids: mockIds }),
        status: 200,
      });

      const ids = await fetchLgtmIds();
      expect(ids).toEqual(mockIds);
      expect(Array.isArray(ids)).toBe(true);
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

      await expect(fetchLgtmIds()).rejects.toThrow("Failed to fetch API: 500");
    });

    /**
     * Test network error handling
     */
    it("should throw error on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchLgtmIds()).rejects.toThrow("Network error");
    });
  });

  describe("getRandomId", () => {
    /**
     * Test random ID selection from array
     */
    it("should select random ID from array", () => {
      const ids = ["id1", "id2", "id3", "id4", "id5"];

      // Mock Math.random for predictable behavior
      const mockMathRandom = vi.spyOn(Math, "random");
      mockMathRandom.mockReturnValue(0.5); // Select middle element

      const selectedId = getRandomId(ids);

      expect(selectedId).toBeDefined();
      expect(ids).toContain(selectedId);
      expect(selectedId).toBe("id3"); // 0.5 * 5 = 2.5 -> floor(2.5) = 2 -> ids[2] = "id3"

      mockMathRandom.mockRestore();
    });

    /**
     * Test error handling for empty array
     */
    it("should throw error when array is empty", () => {
      const ids: string[] = [];

      expect(() => getRandomId(ids)).toThrow("No image IDs found");
    });

    /**
     * Test with single element array
     */
    it("should work correctly with single element array", () => {
      const ids = ["single-id"];
      const selectedId = getRandomId(ids);

      expect(selectedId).toBe("single-id");
    });

    /**
     * Test error handling when array element is undefined
     */
    it("should throw error when array element is undefined", () => {
      // Test case where selectedId becomes undefined
      const ids = [undefined as unknown as string];

      expect(() => getRandomId(ids)).toThrow(
        "Unexpected error: Failed to get ID",
      );
    });
  });

  describe("generateLgtmHtml", () => {
    /**
     * Test correct HTML format generation
     */
    it("should generate correct HTML format", () => {
      const testId = "test-id-123";
      const expectedUrl = `${LGTM_BASE_URL}/${testId}`;
      const expectedImageUrl = `${LGTM_BASE_URL}/${testId}${IMAGE_FORMAT.AVIF}`;
      const expectedHtml = `<a href="${expectedUrl}"><img src="${expectedImageUrl}" alt="LGTM!!" width="400" /></a>`;

      const html = generateLgtmHtml(testId);

      expect(html).toBe(expectedHtml);
    });

    /**
     * Test that HTML contains required elements
     */
    it("should contain all required HTML elements", () => {
      const testId = "test-id";
      const html = generateLgtmHtml(testId);

      expect(html).toContain("<a href=");
      expect(html).toContain("<img src=");
      expect(html).toContain('alt="LGTM!!"');
      expect(html).toContain('width="400"');
      expect(html).toContain(IMAGE_FORMAT.AVIF);
    });

    /**
     * Test HTML generation with special characters in ID
     */
    it("should generate HTML correctly with special characters in ID", () => {
      const testId = "test-id_with-special.chars123";
      const html = generateLgtmHtml(testId);

      expect(html).toContain(testId);
      expect(html).toContain(IMAGE_FORMAT.AVIF);
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

  describe("handleIconClick", () => {
    /**
     * Test successful icon click handling
     */
    it("should complete icon click handling successfully", async () => {
      const mockIds = ["id1", "id2", "id3"];
      const mockTab = { id: 123, active: true };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ids: mockIds }),
      });
      mockChrome.tabs.query.mockResolvedValueOnce([mockTab]);
      mockChrome.scripting.executeScript.mockResolvedValueOnce([]);

      const mockMathRandom = vi.spyOn(Math, "random");
      mockMathRandom.mockReturnValue(0.5);

      await handleIconClick();

      expect(mockFetch).toHaveBeenCalled();
      expect(mockChrome.tabs.query).toHaveBeenCalled();
      expect(mockChrome.scripting.executeScript).toHaveBeenCalled();

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
      const mockIds = ["id1", "id2", "id3"];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ids: mockIds }),
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
      const mockIds = ["test-id"];
      const mockTab = { id: 456, active: true };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ids: mockIds }),
      });
      mockChrome.tabs.query.mockResolvedValueOnce([mockTab]);
      mockChrome.scripting.executeScript.mockResolvedValueOnce([]);

      // Execute listener function
      await onClickedListener?.();

      // Verify handleIconClick was executed
      expect(mockFetch).toHaveBeenCalled();
      expect(mockChrome.tabs.query).toHaveBeenCalled();
      expect(mockChrome.scripting.executeScript).toHaveBeenCalled();
    });
  });
});
