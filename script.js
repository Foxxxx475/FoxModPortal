const modsUrl = "mods.json";

let allMods = [];
let generatedSubmission = null;

const modsEl = document.getElementById("mods");
const featuredEl = document.getElementById("featured-mods");
const mapsEl = document.getElementById("maps-mods");
const enemiesEl = document.getElementById("enemy-mods");
const weaponsEl = document.getElementById("weapon-mods");
const searchEl = document.getElementById("search");
const categoryEl = document.getElementById("category");
const submitForm = document.getElementById("submit-form");
const mdPreview = document.getElementById("md-preview");
const jsonPreview = document.getElementById("json-preview");
const copyMdBtn = document.getElementById("copy-md");
const copyJsonBtn = document.getElementById("copy-json");
const downloadJsonBtn = document.getElementById("download-json");

fetch(modsUrl)
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Could not load ${modsUrl}`);
    }
    return response.json();
  })
  .then((data) => {
    allMods = Array.isArray(data.mods) ? data.mods : [];
    renderAll();
  })
  .catch(() => {
    modsEl.innerHTML = `<p class="mod-card">No mod data found. Add <code>mods.json</code> to the repository.</p>`;
    featuredEl.innerHTML = "";
    mapsEl.innerHTML = "";
    enemiesEl.innerHTML = "";
    weaponsEl.innerHTML = "";
  });

function renderAll() {
  const query = searchEl.value.trim().toLowerCase();
  const category = categoryEl.value;

  const filtered = allMods.filter((mod) => {
    const name = (mod.name || "").toLowerCase();
    const type = (mod.type || "").toLowerCase();
    const matchesQuery = !query || name.includes(query) || type.includes(query);
    const matchesCategory = category === "All" || mod.type === category;
    return matchesQuery && matchesCategory;
  });

  renderCards(modsEl, filtered);

  const featured = allMods.filter((mod) => mod.featured);
  renderCards(featuredEl, featured.length ? featured : allMods.slice(0, 3));
  renderCards(mapsEl, allMods.filter((mod) => mod.type === "Map"));
  renderCards(enemiesEl, allMods.filter((mod) => mod.type === "Enemy"));
  renderCards(weaponsEl, allMods.filter((mod) => mod.type === "Weapon"));
}

function renderCards(container, list) {
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `<p class="mod-card">No mods found.</p>`;
    return;
  }

  container.innerHTML = list
    .map((mod) => {
      const tags = [
        mod.type || "Other",
        mod.version ? `v${mod.version}` : null,
        mod.featured ? "Featured" : null,
      ].filter(Boolean);

      const downloadLabel = mod.download && mod.download !== "#" ? "Download" : "Coming Soon";

      return `
        <article class="mod-card">
          <h3>${escapeHtml(mod.name || "Untitled Mod")}</h3>
          <p class="mod-meta">
            Creator: ${escapeHtml(mod.author || "Unknown")}<br>
            Version: ${escapeHtml(mod.version || "0.0.0")}
          </p>
          <div class="mod-tags">
            ${tags
              .map((tag) => `<span class="tag ${tag === "Featured" ? "featured" : ""}">${escapeHtml(tag)}</span>`)
              .join("")}
          </div>
          <p>${escapeHtml(mod.description || "No description provided.")}</p>
          <div class="mod-actions">
            ${
              mod.download && mod.download !== "#"
                ? `<a class="button secondary" href="${escapeAttr(mod.download)}" ${isExternal(mod.download) ? 'target="_blank" rel="noopener noreferrer"' : ""}>${downloadLabel}</a>`
                : `<span class="button secondary" aria-disabled="true">${downloadLabel}</span>`
            }
          </div>
        </article>
      `;
    })
    .join("");
}

searchEl.addEventListener("input", renderAll);
categoryEl.addEventListener("change", renderAll);

submitForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(submitForm);
  generatedSubmission = {
    name: String(formData.get("name") || "").trim(),
    author: String(formData.get("author") || "").trim(),
    type: String(formData.get("type") || "Other").trim(),
    version: String(formData.get("version") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    download: String(formData.get("download") || "").trim(),
    preview: String(formData.get("preview") || "").trim(),
    submittedAt: new Date().toISOString(),
    privacy: "Local-only submission packet generated in browser"
  };

  const md = toMarkdown(generatedSubmission);
  mdPreview.textContent = md;
  jsonPreview.textContent = JSON.stringify(generatedSubmission, null, 2);
});

copyMdBtn.addEventListener("click", async () => {
  if (!generatedSubmission) return;
  await navigator.clipboard.writeText(toMarkdown(generatedSubmission));
});

copyJsonBtn.addEventListener("click", async () => {
  if (!generatedSubmission) return;
  await navigator.clipboard.writeText(JSON.stringify(generatedSubmission, null, 2));
});

downloadJsonBtn.addEventListener("click", () => {
  if (!generatedSubmission) return;

  const blob = new Blob([JSON.stringify(generatedSubmission, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(generatedSubmission.name || "submission")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

function toMarkdown(item) {
  return [
    `# Mod Submission: ${item.name}`,
    ``,
    `- Creator: ${item.author}`,
    `- Type: ${item.type}`,
    `- Version: ${item.version}`,
    ``,
    `## Description`,
    item.description,
    ``,
    `## Download`,
    item.download || "(none provided)",
    ``,
    `## Preview`,
    item.preview || "(none provided)",
    ``,
    `Submitted locally at: ${item.submittedAt}`,
    `Privacy: ${item.privacy}`,
  ].join("\n");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "submission";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

function isExternal(url) {
  return /^https?:\/\//i.test(url);
}
