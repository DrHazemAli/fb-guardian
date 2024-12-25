// contentScript.js

//////////////////////////////////
// 1. OpenAI classification helper
//////////////////////////////////
async function analyzeWithOpenAI(commentText, apiKey) {
    try {
      // Example call to OpenAI's completions endpoint (text-davinci-003).
      // Adjust the endpoint & payload for your specific use-case.
      const response = await fetch("https://api.openai.com/v1/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "text-davinci-003",
          prompt: `Please determine if this comment contains hate speech or violent language:\n"${commentText}"\nRespond with JSON: { "flagged": true/false, "reason": "explanation" }`,
          max_tokens: 60,
          temperature: 0
        })
      });
  
      const data = await response.json();
  
      // The model might return a JSON object in data.choices[0].text
      let flagged = false;
      let reason = "";
      if (data.choices && data.choices.length > 0) {
        try {
          const parsed = JSON.parse(data.choices[0].text.trim());
          flagged = parsed.flagged;
          reason = parsed.reason;
        } catch (err) {
          console.warn("Could not parse JSON from OpenAI response:", err);
        }
      }
  
      return { flagged, reason };
    } catch (error) {
      console.error("OpenAI API Error:", error);
      return { flagged: false, reason: "API error" };
    }
  }
  
  ////////////////////////////////////////////////
  // 2. Keyword check (user-defined keywords)
  ////////////////////////////////////////////////
  function containsCustomKeywords(commentText, keywords) {
    const textLower = commentText.toLowerCase();
    for (const kw of keywords) {
      if (textLower.includes(kw.toLowerCase())) {
        return true;
      }
    }
    return false;
  }
  
  ///////////////////////////////////////////////
  // 3. Attempt to block user
  ///////////////////////////////////////////////
  function blockUser(element, autoBlock) {
    // The approach below is naive and may break if Facebook changes its DOM or structure.
    // Also, attempting to automate user blocking may violate Facebook's TOS.
    // Use caution in production.
    const userProfileLink = element.closest('[role="article"]')?.querySelector('a[href*="facebook.com"]');
    if (!userProfileLink) {
      if (!autoBlock) {
        alert("Unable to find user profile link. Manual block may be needed.");
      }
      return;
    }
  
    const profileUrl = userProfileLink.href;
  
    // If automatic, attempt to open a new tab or do something else automatically.
    // This is purely illustrative. In reality, you might need to simulate clicks,
    // or direct the user to a blocking flow, etc.
    if (autoBlock) {
      window.open(`${profileUrl}?action=block`, "_blank");
    } else {
      alert("Opening user profile so you can block them manually.");
      window.open(`${profileUrl}`, "_blank");
    }
  }
  
  ///////////////////////////////////////////////
  // 4. UI helper to flag comments
  ///////////////////////////////////////////////
  function createRedFlagUI(element, reason, blockingMode) {
    // If blockingMode is "automatic", attempt to block right away:
    if (blockingMode === "automatic") {
      blockUser(element, true);
      // Optionally you can also highlight the comment text
      highlightComment(element, reason);
      return;
    }
  
    // If blockingMode is "manual", show a block button
    highlightComment(element, reason);
    const blockBtn = document.createElement("button");
    blockBtn.innerText = "Block User";
    blockBtn.style.marginLeft = "8px";
    blockBtn.style.cursor = "pointer";
  
    blockBtn.addEventListener("click", () => {
      blockUser(element, false);
    });
  
    element.appendChild(blockBtn);
  }
  
  // Helper function to highlight comment
  function highlightComment(element, reason) {
    // Create a red flag label
    const flag = document.createElement("span");
    flag.innerText = `⚠ Flagged: ${reason}`;
    flag.style.color = "red";
    flag.style.fontWeight = "bold";
    flag.style.marginLeft = "8px";
  
    element.appendChild(flag);
  }
  
  /////////////////////////////////////////////////////////////
  // 5. Main observer to watch for new comments and analyze them
  /////////////////////////////////////////////////////////////
  function observeComments() {
    const observer = new MutationObserver(async (mutations) => {
      // Retrieve the API key, user-defined keywords, and blocking mode
      const { apiKey, customKeywords, blockingMode } = await getConfigs();
  
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Attempt to find the comment text in elements that match FB’s comment structure
            const commentElements = node.querySelectorAll?.('[data-ad-preview="message"]') || [];
            for (const commentElem of commentElements) {
              const commentText = commentElem.innerText.trim();
              if (!commentText) continue;
  
              // Check if it contains any user-defined keywords
              const keywordFlagged = containsCustomKeywords(commentText, customKeywords);
  
              // Optionally send to OpenAI for classification
              let openAIFlagged = false;
              let openAIReason = "";
  
              if (apiKey) {
                const result = await analyzeWithOpenAI(commentText, apiKey);
                openAIFlagged = result.flagged;
                openAIReason = result.reason;
              }
  
              if (keywordFlagged) {
                createRedFlagUI(commentElem, "Contains custom keyword", blockingMode);
              } else if (openAIFlagged) {
                createRedFlagUI(commentElem, openAIReason || "Hateful or violent content", blockingMode);
              }
            }
          }
        }
      }
    });
  
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  async function getConfigs() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "getConfigs" }, (response) => {
        resolve({
          apiKey: response.apiKey,
          customKeywords: response.customKeywords,
          blockingMode: response.blockingMode
        });
      });
    });
  }
  
  // Start observing once the page is ready
  observeComments();
  