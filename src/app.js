import * as wanakana from "wanakana";

// TODO: Move this to environment variable or backend proxy for security
const OPENAI_API_KEY = "";

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resultsContainer = document.getElementById("results");
const clipboardToggle = document.getElementById("clipboardToggle");

// Bind wanakana to convert romaji to hiragana as you type
wanakana.bind(searchInput, { IMEMode: true });

// Clipboard listener
const MAX_CLIPBOARD_LENGTH = 50;
let lastClipboardContent = "";

// Load saved toggle state
clipboardToggle.checked = localStorage.getItem("clipboardEnabled") === "true";

// Save toggle state on change
clipboardToggle.addEventListener("change", () => {
  localStorage.setItem("clipboardEnabled", clipboardToggle.checked);
});

async function checkClipboard() {
  if (!clipboardToggle.checked) return;

  try {
    const text = await navigator.clipboard.readText();
    if (
      text &&
      text !== lastClipboardContent &&
      text.length <= MAX_CLIPBOARD_LENGTH
    ) {
      lastClipboardContent = text;
      searchInput.value = text;
      searchInput.dispatchEvent(new Event("input"));
      handleSearch();
    }
  } catch (err) {
    // Clipboard access denied or unavailable
  }
}

// Check clipboard when window gains focus
window.addEventListener("focus", checkClipboard);

// Also poll periodically when toggle is enabled (for background clipboard changes)
setInterval(checkClipboard, 1000);

async function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  resultsContainer.innerHTML =
    '<div class="loading"><div class="spinner"></div></div>';

  try {
    const response = await fetch(
      `/yomitan/api/term/simple/${encodeURIComponent(query)}`,
    );
    const data = await response.json();
    renderResults(data.results);
  } catch (error) {
    resultsContainer.innerHTML =
      '<div class="error">Failed to fetch results. Is the server running?</div>';
  }
}

function renderResults(results) {
  if (!results || results.length === 0) {
    resultsContainer.innerHTML =
      '<div class="no-results">No results found</div>';
    return;
  }

  resultsContainer.innerHTML = results
    .map(
      (entry, index) => `
            <div class="entry" data-term="${entry.term}" data-index="${index}">
                <div class="entry-header">
                    <span class="term">${entry.term}</span>
                    <span class="reading">${entry.reading}</span>
                    <span class="word-class">${entry.wordClasses.join(", ")}</span>
                </div>
                <div class="dictionary">${entry.dictionary}</div>
                <div class="senses">
                    ${entry.senses
                      .map(
                        (sense, i) => `
                            <div class="sense">
                                <div class="sense-header">
                                    <span class="sense-number">${i + 1}</span>
                                    <span class="pos">${sense.partsOfSpeech.join(" · ")}</span>
                                </div>
                                <ul class="glossary">
                                    ${sense.glossary.map((g) => `<li>${g}</li>`).join("")}
                                </ul>
                                ${
                                  sense.examples.length > 0
                                    ? `
                                    <div class="examples">
                                        ${sense.examples
                                          .map(
                                            (ex) => `
                                            <div class="example">
                                                <div class="example-jp">${ex.japanese}</div>
                                                <div class="example-en">${ex.english}</div>
                                            </div>
                                        `,
                                          )
                                          .join("")}
                                    </div>
                                `
                                    : ""
                                }
                            </div>
                        `,
                      )
                      .join("")}
                </div>
                <div class="ai-section">
                    <button class="ai-generate-btn" data-index="${index}">
                        Generate sentence with AI
                    </button>
                    <div class="ai-spinner"></div>
                    <div class="ai-result"></div>
                </div>
            </div>
        `,
    )
    .join("");

  // Attach click handlers to AI buttons
  document.querySelectorAll(".ai-generate-btn").forEach((btn) => {
    btn.addEventListener("click", handleGenerateSentence);
  });
}

async function handleGenerateSentence(e) {
  const btn = e.target;
  const entry = btn.closest(".entry");
  const term = entry.dataset.term;
  const aiSection = entry.querySelector(".ai-section");
  const spinner = aiSection.querySelector(".ai-spinner");
  const resultDiv = aiSection.querySelector(".ai-result");

  // Disable button and show spinner
  btn.disabled = true;
  btn.classList.add("disabled");
  spinner.classList.add("active");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        messages: [
          {
            role: "user",
            content: `Generate a simple Japanese sentence using the word "${term}". Provide the sentence in Japanese, followed by the English translation on a new line. Keep it natural and suitable for language learners.`,
          },
        ],
        max_tokens: 150,
      }),
    });

    const data = await response.json();
    const sentence = data.choices[0].message.content;
    resultDiv.innerHTML = `<div class="ai-sentence">${sentence.replace(/\n/g, "<br>")}</div>`;
  } catch (error) {
    resultDiv.innerHTML = `<div class="ai-error">Failed to generate sentence</div>`;
    btn.disabled = false;
    btn.classList.remove("disabled");
  } finally {
    spinner.classList.remove("active");
  }
}

searchBtn.addEventListener("click", handleSearch);

searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleSearch();
  }
});
