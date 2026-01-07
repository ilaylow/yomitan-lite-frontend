const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resultsContainer = document.getElementById("results");

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
