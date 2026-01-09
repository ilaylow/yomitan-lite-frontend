import * as wanakana from "wanakana";

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resultsContainer = document.getElementById("results");
const clipboardToggle = document.getElementById("clipboardToggle");

// Bind wanakana to convert romaji to hiragana as you type
wanakana.bind(searchInput, { IMEMode: true });

// Clipboard listener
const MAX_CLIPBOARD_LENGTH = 50;
let lastClipboardContent = "";

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
      (entry) => `
            <div class="entry">
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
            </div>
        `,
    )
    .join("");
}

searchBtn.addEventListener("click", handleSearch);

searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleSearch();
  }
});
