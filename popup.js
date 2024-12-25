// popup.js

document.addEventListener("DOMContentLoaded", () => {
    const apiKeyInput = document.getElementById("apiKey");
    const keywordsInput = document.getElementById("keywords");
    const saveBtn = document.getElementById("saveBtn");
  
    // Radio buttons for blocking mode
    const blockingModeRadios = document.querySelectorAll('input[name="blockingMode"]');
  
    // Load existing configs
    chrome.storage.sync.get(["openaiApiKey", "customKeywords", "blockingMode"], (result) => {
      if (result.openaiApiKey) {
        apiKeyInput.value = result.openaiApiKey;
      }
      if (result.customKeywords && result.customKeywords.length > 0) {
        keywordsInput.value = result.customKeywords.join(", ");
      }
      if (result.blockingMode) {
        // Check the correct radio
        blockingModeRadios.forEach((radio) => {
          radio.checked = (radio.value === result.blockingMode);
        });
      }
    });
  
    // Save new configs
    saveBtn.addEventListener("click", () => {
      const key = apiKeyInput.value.trim();
      const keywords = keywordsInput.value
        .split(",")
        .map((kw) => kw.trim())
        .filter((kw) => kw.length > 0);
  
      // Read which blocking mode is selected
      let selectedMode = "manual";
      blockingModeRadios.forEach((radio) => {
        if (radio.checked) {
          selectedMode = radio.value;
        }
      });
  
      // Store in chrome storage
      chrome.storage.sync.set({
        openaiApiKey: key,
        customKeywords: keywords,
        blockingMode: selectedMode
      }, () => {
        alert("Settings Saved.");
      });
    });
  });
  