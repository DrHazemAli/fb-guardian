// background.js

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed.");
  });
  
  // Listen for messages from the content script to retrieve the API key, keywords, and blocking mode.
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getConfigs") {
      // Retrieve from chrome.storage.sync
      chrome.storage.sync.get(["openaiApiKey", "customKeywords", "blockingMode"], (result) => {
        sendResponse({
          apiKey: result.openaiApiKey || "",
          customKeywords: result.customKeywords || [],
          blockingMode: result.blockingMode || "manual" // fallback to manual if not set
        });
      });
      return true; // Keep the message channel open for async sendResponse
    }
  });
  