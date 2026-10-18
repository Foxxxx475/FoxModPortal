const state = {
  mods: [],
  submission: null,
  ownerCatalog: null
};

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  if (page === "home") initHome();
  if (page === "mods") initMods();
  if (page === "submit") initSubmit();
  if (page === "owner") initOwner();
});

async function loadCatalog() {
  if (state.mods.length) return state.mods;
  const response = await fetch("mods.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load catalog");
  const data = await response.json();
  state.mods = Array.isArray(data.mods) ? data.mods : [];
  state.ownerCatalog = {
    catalogVersion: data.catalogVersion || "2.0.0",
    game: data.game || "Tactical Assault VR",
    verifiedCreators: Array.isArray(data.verifiedCreators) ? data.verifiedCreators : [],
    mods: state.mods
  };
  return state.mods;
}

async function initHome() {
  const target = document.getElementById("featured-grid");
  try {
    const mods = await loadCatalog();
    const featured = mods.filter((m) => m.featured);
    renderMods(target, (featured.length ? featured : mods).slice(0, 3), { compact: true, allowEmpty: true });
  } catch {
    target.innerHTML = '<div class="empty-state">The mod catalog is unavailable right now.</div>';
  }
}

async function initMods() {
  const grid = document.getElementById("mods-grid");
  const search = document.getElementById("mod-search");
  const category = document.getElementById("mod-category");
  const sort = document.getElementById("mod-sort");
  const count = document.getElementById("results-count");

  const requestedCategory = new URLSearchParams(location.search).get("category");
  if (["Map", "Enemy", "Weapon", "Other"].includes(requestedCategory)) {
    category.value = requestedCategory;
  }

  try {
    await loadCatalog();
    renderLibrary();
  } catch {
    grid.innerHTML = '<div class="empty-state">Unable to load the mod catalog.</div>';
    count.textContent = "0 mods";
    return;
  }

  [search, category, sort].forEach((el) => {
    el.addEventListener("input", renderLibrary);
    el.addEventListener("change", renderLibrary);
  });

  function renderLibrary() {
    const q = search.value.trim().toLowerCase();
    const cat = category.value;
    const sortValue = sort.value;

    let filtered = state.mods.filter((mod) => {
      const haystack = [
        mod.name,
        mod.author,
        mod.type,
        mod.description,
        mod.compatibility || ""
      ].join(" ").toLowerCase();

      return (!q || haystack.includes(q)) && (cat === "All" || mod.type === cat);
    });

    filtered.sort((a, b) => {
      if (sortValue === "name") return String(a.name).localeCompare(String(b.name));
      if (sortValue === "updated") return String(b.publishedAt || "").localeCompare(String(a.publishedAt || ""));
      return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    });

    count.textContent = `${filtered.length} ${filtered.length === 1 ? "mod" : "mods"}`;
    renderMods(grid, filtered, { compact: false, allowEmpty: true });
  }
}

function iconForType(type) {
  if (type === "Map") return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z"></path>
      <path d="M9 4v14"></path>
      <path d="M15 6v14"></path>
    </svg>`;
  if (type === "Enemy") return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 7l6-3 6 3v6l-6 4-6-4V7z"></path>
      <path d="M9 13l3-2 3 2"></path>
      <path d="M10 9h.01"></path>
      <path d="M14 9h.01"></path>
    </svg>`;
  if (type === "Weapon") return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 13h10l4-4h2v3h-2l-3 3H8l-2 2H4z"></path>
      <path d="M14 9l3 3"></path>
    </svg>`;
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 7h12v10H6z"></path>
      <path d="M8 10h8"></path>
      <path d="M8 13h6"></path>
    </svg>`;
}

function renderMods(container, mods, options = {}) {
  if (!mods.length) {
    if (options.allowEmpty) {
      container.innerHTML = '<div class="empty-state">No mods have been posted yet. Use the submission page to prepare a packet.</div>';
      return;
    }
    container.innerHTML = '<div class="empty-state">No mods match those filters.</div>';
    return;
  }

  container.innerHTML = mods.map((mod) => {
    const download = mod.download && mod.download !== "#" && safeUrl(mod.download);
    const compat = mod.compatibility ? `<span class="tag">${escapeHtml(mod.compatibility)}</span>` : "";
    const featured = mod.featured ? '<span class="tag featured">Featured</span>' : "";
    const downloadButton = download
      ? `<a class="button button-secondary" href="${escapeAttr(mod.download)}" ${isExternal(mod.download) ? 'target="_blank" rel="noopener noreferrer"' : "download"}>Download</a>`
      : `<a class="button button-secondary" href="#" aria-disabled="true">Coming soon</a>`;

    return `
      <article class="mod-card">
        <div class="mod-top">
          <div>
            <h3 class="mod-name">${escapeHtml(mod.name || "Untitled Mod")}</h3>
            <p class="mod-meta">${escapeHtml(mod.type || "Other")} • v${escapeHtml(mod.version || "0.0.0")} • ${escapeHtml(mod.author || "Unknown")}</p>
          </div>
          <div class="mod-icon" aria-hidden="true">${iconForType(mod.type)}</div>
        </div>
        <div class="mod-tags">${featured}${compat}</div>
        <p class="mod-description">${escapeHtml(mod.description || "No description provided.")}</p>
        <div class="mod-actions">
          ${downloadButton}
        </div>
        ${extraFiles(mod)}
      </article>
    `;
  }).join("");
}

function initSubmit() {
  const form = document.getElementById("submission-form");
  const output = document.getElementById("submission-output");
  const markdown = document.getElementById("markdown-output");
  const status = document.getElementById("submission-status");
  const copy = document.getElementById("copy-submission");
  const download = document.getElementById("download-submission");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = new FormData(form);
    state.submission = {
      schemaVersion: "2.0",
      name: value(data, "name"),
      author: value(data, "author"),
      type: value(data, "type"),
      version: value(data, "version"),
      description: value(data, "description"),
      download: value(data, "download"),
      preview: value(data, "preview"),
      compatibility: value(data, "compatibility"),
      license: value(data, "license")
    };

    output.textContent = JSON.stringify(state.submission, null, 2);
    markdown.textContent = buildMarkdown(state.submission);
    status.textContent = "Packet generated locally.";
  });

  copy.addEventListener("click", async () => {
    if (!state.submission) {
      status.textContent = "Generate a packet first.";
      return;
    }
    await navigator.clipboard.writeText(JSON.stringify(state.submission, null, 2));
    status.textContent = "JSON copied to clipboard.";
  });

  download.addEventListener("click", () => {
    if (!state.submission) {
      status.textContent = "Generate a packet first.";
      return;
    }
    const blob = new Blob([JSON.stringify(state.submission, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(state.submission.name || "mod-submission")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    status.textContent = "Submission JSON downloaded.";
  });

  form.addEventListener("reset", () => {
    state.submission = null;
    output.textContent = "{}";
    markdown.textContent = "Markdown preview will appear here.";
    status.textContent = "Fill out the form and generate a packet.";
  });
}

async function initOwner() {
  const list = document.getElementById("owner-list");
  const message = document.getElementById("owner-message");
  const add = document.getElementById("owner-add");
  const download = document.getElementById("owner-download-json");
  const reset = document.getElementById("owner-reset");

  const fields = {
    name: document.getElementById("owner-name"),
    author: document.getElementById("owner-author"),
    type: document.getElementById("owner-type"),
    version: document.getElementById("owner-version"),
    description: document.getElementById("owner-description"),
    download: document.getElementById("owner-download")
  };

  try { await loadCatalog(); } catch {}
  const local = cloneCatalog();
  draw();

  const files = [];
  const zone = document.getElementById("drop-zone");
  const picker = document.getElementById("file-input");
  const fileList = document.getElementById("file-list");
  function addFiles(list) {
    for (const f of list) if (!files.some((x) => x.name === f.name && x.size === f.size)) files.push(f);
    drawFiles();
  }
  function drawFiles() {
    fileList.innerHTML = files.map((f, i) => `<li>${escapeHtml(f.name)}<span>${(f.size / 1048576).toFixed(1)} MB</span><button class="button button-ghost" type="button" data-drop="${i}">Remove</button></li>`).join("");
  }
  document.getElementById("pick-files").addEventListener("click", () => picker.click());
  picker.addEventListener("change", () => { addFiles(picker.files); picker.value = ""; });
  ["dragenter", "dragover"].forEach((t) => zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.add("over"); }));
  ["dragleave", "drop"].forEach((t) => zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.remove("over"); }));
  zone.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));
  fileList.addEventListener("click", (e) => {
    const i = e.target.dataset.drop;
    if (i !== undefined) { files.splice(Number(i), 1); drawFiles(); }
  });

  const gh = { token: "", repo: "" };
  const ghStatus = document.getElementById("gh-status");
  const repoInput = document.getElementById("gh-repo");
  const tokenInput = document.getElementById("gh-token");
  const disconnectBtn = document.getElementById("gh-disconnect");
  const headers = (token) => ({ Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" });
  const host = location.hostname.match(/^(.+)\.github\.io$/);
  const seg = location.pathname.split("/")[1] || "";
  repoInput.value = host && seg && !seg.includes(".") ? `${host[1]}/${seg}` : "";

  async function connect(token, repo) {
    ghStatus.textContent = "Checking…";
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}`, { headers: headers(token) });
      const j = await r.json();
      if (!r.ok || !(j.permissions && j.permissions.push)) throw new Error();
      gh.token = token; gh.repo = repo;
      try { sessionStorage.setItem("fmp_gh", JSON.stringify({ token, repo })); } catch {}
      ghStatus.textContent = `Connected to ${repo}.`;
      disconnectBtn.hidden = false;
    } catch {
      ghStatus.textContent = "Could not connect. Check the repository name and that the token can write to it.";
    }
  }
  document.getElementById("gh-connect").addEventListener("click", () => {
    const repo = repoInput.value.trim(), token = tokenInput.value.trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !token) { ghStatus.textContent = "Enter owner/repo and a token."; return; }
    tokenInput.value = "";
    connect(token, repo);
  });
  disconnectBtn.addEventListener("click", () => {
    try { sessionStorage.removeItem("fmp_gh"); } catch {}
    gh.token = ""; gh.repo = ""; disconnectBtn.hidden = true; ghStatus.textContent = "Not connected.";
  });
  try {
    const saved = JSON.parse(sessionStorage.getItem("fmp_gh") || "null");
    if (saved) { repoInput.value = saved.repo; connect(saved.token, saved.repo); }
  } catch {}

  async function uploadFile(file, id) {
    if (file.size > 50 * 1024 * 1024) throw new Error(`${file.name} is over 50 MB. Host it elsewhere and paste the link instead.`);
    const path = `mods/${id}/${file.name.replace(/[^\w.-]+/g, "_")}`;
    const content = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).split(",")[1]);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
    const r = await fetch(`https://api.github.com/repos/${gh.repo}/contents/${path}`, {
      method: "PUT",
      headers: { ...headers(gh.token), "Content-Type": "application/json" },
      body: JSON.stringify({ message: `Add ${path}`, content })
    });
    if (!r.ok) throw new Error(r.status === 422 ? `${path} already exists in the repo.` : `Upload failed for ${file.name} (${r.status}).`);
    return path;
  }

  async function publishCatalog() {
    const api = `https://api.github.com/repos/${gh.repo}/contents/mods.json`;
    const cur = await fetch(api, { headers: headers(gh.token) });
    const body = { message: "Update mods.json", content: btoa(unescape(encodeURIComponent(JSON.stringify(local, null, 2) + "\n"))) };
    if (cur.ok) body.sha = (await cur.json()).sha;
    const r = await fetch(api, { method: "PUT", headers: { ...headers(gh.token), "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`Publish failed (${r.status}).`);
  }

  document.getElementById("owner-publish").addEventListener("click", async () => {
    if (!gh.token) { message.textContent = "Connect GitHub above to publish."; return; }
    message.textContent = "Publishing…";
    try { await publishCatalog(); message.textContent = "Published. The site updates in a minute or two."; }
    catch (e) { message.textContent = e.message; }
  });

  add.addEventListener("click", async () => {
    const mod = {
      id: `${slugify(fields.author.value)}.${slugify(fields.name.value)}`,
      name: fields.name.value.trim(),
      author: fields.author.value.trim(),
      type: fields.type.value,
      version: fields.version.value.trim(),
      description: fields.description.value.trim(),
      download: fields.download.value.trim(),
      compatibility: "Unknown",
      featured: false,
      publishedAt: new Date().toISOString().slice(0, 10)
    };

    if (!mod.name || !mod.author || !mod.version || !mod.description) {
      message.textContent = "Fill out the required fields first.";
      return;
    }
    if (!files.length && !mod.download) {
      message.textContent = "Add a file or a download link.";
      return;
    }
    if (files.length) {
      if (!gh.token) { message.textContent = "Connect GitHub above to upload files."; return; }
      message.textContent = "Uploading…";
      try {
        const paths = [];
        for (const f of files) paths.push(await uploadFile(f, mod.id));
        mod.download = paths.find((p) => p.endsWith(".tamod")) || paths[0];
        if (paths.length > 1) mod.files = paths;
      } catch (e) { message.textContent = e.message || "Upload failed."; return; }
    }

    local.mods.unshift(mod);
    ["name", "author", "version", "description", "download"].forEach((k) => { fields[k].value = ""; });
    files.length = 0; drawFiles(); draw();

    if (gh.token) {
      try { await publishCatalog(); message.textContent = `Added ${mod.name} and published. The site updates in a minute or two.`; }
      catch (e) { message.textContent = `Added ${mod.name}, but ${e.message} Use Publish catalog to retry.`; }
    } else {
      message.textContent = `Added ${mod.name}. Download the updated JSON to replace mods.json.`;
    }
  });

  download.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(local, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mods.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    message.textContent = "Downloaded mods.json.";
  });

  reset.addEventListener("click", () => {
    if (!confirm("Clear the whole catalog in this editor? Nothing changes on the site until you publish.")) return;
    local.mods = [];
    fields.name.value = "";
    fields.author.value = "";
    fields.version.value = "";
    fields.description.value = "";
    fields.download.value = "";
    message.textContent = "Catalog reset locally.";
    draw();
  });

  function draw() {
    if (!local.mods.length) {
      list.innerHTML = '<div class="empty-state">No mods in the local editor yet.</div>';
      return;
    }

    list.innerHTML = local.mods.map((mod, index) => `
      <div class="owner-row">
        <div>
          <strong>${escapeHtml(mod.name || "Untitled Mod")}</strong>
          <div>${escapeHtml(mod.type || "Other")} • ${escapeHtml(mod.version || "0.0.0")} • ${escapeHtml(mod.author || "Unknown")}</div>
        </div>
        <button class="button button-ghost" data-remove="${index}" type="button">Remove</button>
      </div>
    `).join("");

    list.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        local.mods.splice(Number(btn.dataset.remove), 1);
        message.textContent = "Removed mod from the local editor.";
        draw();
      });
    });
  }

  function cloneCatalog() {
    return {
      catalogVersion: state.ownerCatalog?.catalogVersion || "2.0.0",
      game: state.ownerCatalog?.game || "Tactical Assault VR",
      verifiedCreators: Array.isArray(state.ownerCatalog?.verifiedCreators) ? [...state.ownerCatalog.verifiedCreators] : [],
      mods: Array.isArray(state.ownerCatalog?.mods) ? JSON.parse(JSON.stringify(state.ownerCatalog.mods)) : []
    };
  }
}

function value(formData, key) {
  return String(formData.get(key) || "").trim();
}

function buildMarkdown(item) {
  return [
    `# Mod Submission: ${item.name}`,
    "",
    `- Creator: ${item.author}`,
    `- Type: ${item.type}`,
    `- Version: ${item.version}`,
    `- Compatibility: ${item.compatibility}`,
    `- License: ${item.license || "(not specified)"}`,
    "",
    "## Description",
    item.description,
    "",
    "## Download",
    item.download || "(not specified)",
    "",
    "## Preview",
    item.preview || "(not specified)"
  ].join("\n");
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "mod-submission";
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

function safeUrl(url) {
  return /^https:\/\//i.test(url) || !/^[a-z][a-z0-9+.-]*:/i.test(url);
}

function extraFiles(mod) {
  if (!Array.isArray(mod.files)) return "";
  const rest = mod.files.filter((p) => p !== mod.download && safeUrl(p));
  if (!rest.length) return "";
  return `<div class="mod-files">More files: ${rest.map((p) => `<a class="text-link" href="${escapeAttr(p)}" download>${escapeHtml(p.split("/").pop())}</a>`).join("")}</div>`;
}
