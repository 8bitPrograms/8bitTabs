import { makeBackup, MAX_IMPORT_BYTES, searchSession } from "./core.js";
import { localeFor, translate, translateNotice } from "./i18n.js";

const $ = (selector) => document.querySelector(selector);
const state = { sessions: [], folders: [], settings: {}, notice: null, view: "all", query: "", sort: "newest", limit: 20, expanded: new Map() };
const t = (key, params) => translate(state.settings.language, key, params);
const locale = () => localeFor(state.settings.language);
let snapshotVersion = 0;
let toastTimer;
const systemTheme = matchMedia("(prefers-color-scheme: light)");

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(name, className) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-hidden", "true");
  if (className) svg.setAttribute("class", className);
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#i-${name}`);
  svg.append(use);
  return svg;
}

function button(className, label, iconName, action, iconOnly = false) {
  const node = element("button", className);
  node.type = "button";
  node.title = label;
  node.setAttribute("aria-label", label);
  if (iconName) node.append(icon(iconName));
  if (!iconOnly) node.append(document.createTextNode(label));
  node.addEventListener("click", () => busy(node, action));
  return node;
}

async function request(type, values = {}) {
  let response;
  try { response = await chrome.runtime.sendMessage({ type, ...values }); }
  catch { throw new Error(t("no_response")); }
  if (!response?.ok) throw new Error(t(response?.errorKey || "operation_failed", response?.errorParams));
  return response.data;
}

async function busy(node, work) {
  if (node.disabled) return;
  node.disabled = true;
  try { await work(); } catch (error) { toast(error.message, true); }
  finally { node.disabled = false; }
}

function toast(message, error = false) {
  clearTimeout(toastTimer);
  const node = $("#toast");
  // Keep errors above a native modal's backdrop, including failed imports and invalid names.
  (document.querySelector("dialog[open]") || document.body).append(node);
  node.textContent = message;
  node.dataset.error = String(error);
  node.hidden = false;
  toastTimer = setTimeout(() => { node.hidden = true; }, error ? 10000 : 5500);
}

function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme === "system" ? (systemTheme.matches ? "light" : "dark") : state.settings.theme || "dark";
}

function applyTranslations() {
  document.documentElement.lang = state.settings.language || "en";
  document.title = t("app_title");
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => { node.placeholder = t(node.dataset.i18nPlaceholder); });
  document.querySelectorAll("[data-i18n-label]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nLabel));
    node.title = t(node.dataset.i18nLabel);
  });
  if ($("#session-folder").options.length) $("#session-folder").options[0].text = t("no_folder");
  $("#folder-dialog-title").textContent = t($("#folder-id").value ? "edit_folder" : "new_folder");
}
systemTheme.addEventListener("change", applyTheme);

async function refresh() {
  const version = ++snapshotVersion;
  const snapshot = await request("snapshot");
  if (version !== snapshotVersion) return;
  Object.assign(state, snapshot);
  applyTheme();
  render();
}

function setView(view) {
  state.view = view;
  state.limit = 20;
  render();
}

function confirmAction(title, description, label = t("continue")) {
  const dialog = $("#confirm-dialog");
  $("#confirm-title").textContent = title;
  $("#confirm-description").textContent = description;
  $("#confirm-ok").textContent = label;
  return new Promise((resolve) => {
    const finish = (value) => { dialog.close(); resolve(value); };
    $("#confirm-cancel").onclick = () => finish(false);
    $("#confirm-ok").onclick = () => finish(true);
    dialog.oncancel = (event) => { event.preventDefault(); finish(false); };
    dialog.showModal();
    $("#confirm-cancel").focus();
  });
}

function render() {
  applyTranslations();
  document.body.dataset.layout = state.settings.layout || "grid";
  document.querySelectorAll("[data-layout]").forEach((node) => {
    if (node.tagName === "BUTTON") node.setAttribute("aria-pressed", String(node.dataset.layout === document.body.dataset.layout));
  });
  const live = state.sessions.filter((session) => !session.deletedAt);
  const number = new Intl.NumberFormat(locale());
  $("#metric-tabs").textContent = number.format(live.reduce((total, session) => total + session.tabs.length, 0));
  $("#metric-sessions").textContent = number.format(live.length);
  $("#metric-folders").textContent = number.format(state.folders.length);
  $("#all-count").textContent = live.length;
  $("#star-count").textContent = live.filter((session) => session.starred).length;
  $("#trash-count").textContent = state.sessions.length - live.length;
  document.querySelectorAll("[data-view]").forEach((node) => node.classList.toggle("active", node.dataset.view === state.view));
  const folderNodes = state.folders.slice().sort((a, b) => a.name.localeCompare(b.name, locale())).map((folder) => {
    const node = button(`nav-button${state.view === folder.id ? " active" : ""}`, "", "folder", () => setView(folder.id));
    node.setAttribute("aria-label", folder.name);
    node.title = folder.name;
    node.append(element("span", "", folder.name), element("span", "count", String(live.filter((session) => session.folderId === folder.id).length)));
    return node;
  });
  $("#folders").replaceChildren(...folderNodes);
  $("#folder-hint").hidden = Boolean(folderNodes.length);
  $("#archive-scope").textContent = `${t(state.settings.scope === "current" ? "scope_current_short" : "scope_all_short")} · ${t(state.settings.includePinned ? "pins_included" : "pins_protected")}`;
  $("#notice").hidden = !state.notice;
  if (state.notice) {
    $("#notice-text").textContent = translateNotice(state.settings.language, state.notice);
    $("#notice").dataset.kind = state.notice.kind;
  }
  renderSessions();
}

function renderSessions() {
  const folder = state.folders.find((item) => item.id === state.view);
  $("#edit-folder").hidden = !folder;
  $("#delete-folder").hidden = !folder;
  const title = folder?.name || t(({ all: "all_sessions", starred: "starred", trash: "trash" }[state.view]) || "all_sessions");
  $("#view-title").textContent = title;
  $("#breadcrumb-view").textContent = title;
  const sessions = state.sessions.filter((session) => {
    if (state.view === "trash") return Boolean(session.deletedAt);
    if (session.deletedAt) return false;
    if (state.view === "starred") return session.starred;
    return folder ? session.folderId === folder.id : true;
  });
  const totalTabs = sessions.reduce((total, session) => total + session.tabs.length, 0);
  $("#view-description").textContent = `${t("session_count", { count: sessions.length })} · ${t("tab_count", { count: totalTabs })}`;
  const matches = sessions.map((session) => ({ session, ...searchSession(session, state.query, state.folders.find((item) => item.id === session.folderId)?.name) })).filter((result) => result.matches);
  matches.sort((a, b) => state.sort === "title" ? a.session.title.localeCompare(b.session.title, locale()) : (state.sort === "oldest" ? 1 : -1) * (Date.parse(a.session.createdAt) - Date.parse(b.session.createdAt)));
  $("#search-summary").hidden = !state.query.trim();
  $("#search-summary").textContent = t("search_results", { sessions: t("session_count", { count: matches.length }), tabs: t("tab_count", { count: matches.reduce((total, result) => total + result.tabs.length, 0) }) });
  $("#sessions").replaceChildren(...matches.slice(0, state.limit).map(sessionCard));
  $("#load-more").hidden = matches.length <= state.limit;
  $("#empty-state").hidden = matches.length > 0;
  if (state.query.trim()) {
    $("#empty-title").textContent = t("no_matches_title");
    $("#empty-description").textContent = t("no_matches_description");
  } else if (state.view === "trash") {
    $("#empty-title").textContent = t("trash_empty_title");
    $("#empty-description").textContent = t("trash_empty_description");
  } else if (state.view === "all") {
    $("#empty-title").textContent = t("empty_title");
    $("#empty-description").textContent = t("empty_description");
  } else {
    $("#empty-title").textContent = t(state.view === "starred" ? "starred_empty_title" : "folder_empty_title");
    $("#empty-description").textContent = t(state.view === "starred" ? "starred_empty_description" : "folder_empty_description");
  }
}

function sessionCard(result) {
  const { session, tabs } = result;
  const isTrash = Boolean(session.deletedAt);
  const card = element("article", "session-card");
  card.dataset.sessionId = session.id;
  card.dataset.starred = String(session.starred);
  const head = element("div", "session-head");
  const folderIcon = element("div", "session-folder-icon");
  folderIcon.append(icon("folder"));
  const main = element("div", "session-head-main");
  const title = isTrash ? element("span", "session-title", session.title) : button("session-title", session.title, null, () => editSession(session));
  title.title = session.title;
  const meta = element("div", "session-meta");
  const windows = new Set(session.tabs.map((tab) => tab.window)).size;
  meta.append(element("span", "", t("tab_count", { count: session.tabs.length })), element("span", "", "·"), element("span", "", t("window_count", { count: windows })), element("span", "", "·"), element("time", "", new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(session.createdAt))));
  const folder = state.folders.find((item) => item.id === session.folderId);
  if (folder) meta.append(element("span", "", "·"), element("span", "folder-tag", folder.name));
  main.append(title, meta);
  const controls = element("div", "session-controls");
  if (isTrash) {
    controls.append(button("icon-button", t("recover_session"), "restore", async () => { await request("session:recover", { id: session.id }); await refresh(); toast(t("session_recovered")); }, true));
    controls.append(button("icon-button danger", t("delete_permanently"), "trash", async () => {
      if (await confirmAction(t("delete_session_title"), t("delete_session_description", { title: session.title, tabs: t("tab_count", { count: session.tabs.length }) }), t("delete_permanently"))) { await request("session:delete", { id: session.id }); await refresh(); toast(t("session_deleted")); }
    }, true));
  } else {
    controls.append(button(`icon-button star-toggle${session.starred ? " starred" : ""}`, t(session.starred ? "remove_star" : "add_star"), "star", async () => { await request("session:update", { id: session.id, starred: !session.starred }); await refresh(); }, true));
    controls.append(button("icon-button", t("edit_session"), "edit", () => editSession(session), true));
    controls.append(button("icon-button danger", t("move_to_trash"), "trash", async () => { await request("session:trash", { id: session.id }); await refresh(); toast(t("session_trashed")); }, true));
    controls.append(button("open-session", t("open_all"), "arrow", () => restore(session)));
  }
  head.append(folderIcon, main, controls);
  card.append(head);
  if (session.notes) card.append(element("p", "session-notes", session.notes));
  const visibleCount = state.expanded.get(session.id) || 4;
  const rows = element("div", "tab-list");
  for (const tab of tabs.slice(0, visibleCount)) {
    const row = element("div", "tab-row");
    let domain;
    try { domain = new URL(tab.url).hostname.replace(/^www\./u, "") || t("local_site"); } catch { domain = t("tab"); }
    const avatar = element("span", "site-avatar", domain[0].toLocaleUpperCase(locale()));
    const tabMain = element("div", "tab-main");
    const tabTitle = isTrash ? element("span", "tab-title", tab.title) : button("tab-title", tab.title, null, () => restore(session, tab.id));
    tabTitle.title = `${tab.title}\n${tab.url}`;
    const url = element("span", "tab-url", tab.url);
    url.title = tab.url;
    tabMain.append(tabTitle, url);
    row.append(avatar, tabMain);
    if (tab.pinned) { const pin = icon("pin", "pin"); pin.setAttribute("aria-label", t("pinned_tab")); row.append(pin); }
    if (!isTrash) row.append(button("icon-button open-tab", t("open_tab"), "arrow", () => restore(session, tab.id), true));
    rows.append(row);
  }
  card.append(rows);
  const foot = element("div", "session-foot");
  if (tabs.length > 4) {
    foot.append(button("expand-button", tabs.length > visibleCount ? t("show_more_tabs", { count: tabs.length - Math.min(visibleCount, tabs.length) }) : t("show_less"), "chevron", () => { state.expanded.set(session.id, tabs.length > visibleCount ? visibleCount + 100 : 4); renderSessions(); }));
  } else foot.append(element("span", "", ""));
  if (isTrash) foot.append(element("span", "", t("trash_retention")));
  else foot.append(button("text-button", t("open_windows"), null, () => restore(session, null, true)));
  card.append(foot);
  return card;
}

async function restore(session, tabId = null, newWindows = false) {
  if (!tabId && session.tabs.length > 25 && !await confirmAction(t("restore_confirm_title", { tabs: t("tab_count", { count: session.tabs.length }) }), t("restore_confirm_description"), t("open_tabs"))) return;
  const result = await request("restore", { id: session.id, tabId, newWindows });
  toast([t("restore_opened", { count: result.opened }), result.failed ? t("restore_failed", { count: result.failed }) : "", t("archive_kept")].filter(Boolean).join(" "), result.failed > 0);
}

function editSession(session) {
  $("#session-id").value = session.id;
  $("#session-title").value = session.title;
  $("#session-notes").value = session.notes;
  $("#session-starred").checked = session.starred;
  const select = $("#session-folder");
  select.replaceChildren(new Option(t("no_folder"), ""), ...state.folders.map((folder) => new Option(folder.name, folder.id)));
  select.value = session.folderId || "";
  $("#session-dialog").showModal();
}

function editFolder(folder = null) {
  $("#folder-id").value = folder?.id || "";
  $("#folder-name").value = folder?.name || "";
  $("#folder-dialog-title").textContent = t(folder ? "edit_folder" : "new_folder");
  $("#folder-dialog").showModal();
}

document.querySelectorAll("[data-close]").forEach((node) => node.addEventListener("click", () => node.closest("dialog").close()));
document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("close", () => {
  if ($("#toast").parentElement === dialog) document.body.append($("#toast"));
}));
document.querySelectorAll("[data-view]").forEach((node) => node.addEventListener("click", () => setView(node.dataset.view)));
document.querySelectorAll("button[data-layout]").forEach((node) => node.addEventListener("click", () => busy(node, async () => {
  await request("settings", { value: { ...state.settings, layout: node.dataset.layout } });
  await refresh();
})));
$("#search").addEventListener("input", (event) => { state.query = event.target.value; state.limit = 20; state.expanded.clear(); renderSessions(); });
$("#sort").addEventListener("change", (event) => { state.sort = event.target.value; renderSessions(); });
$("#load-more").addEventListener("click", () => { state.limit += 20; renderSessions(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && !document.querySelector("dialog[open]") && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) { event.preventDefault(); $("#search").focus(); }
});

$("#archive-button").addEventListener("click", () => busy($("#archive-button"), async () => {
  await request("archive");
  await chrome.action.setBadgeText({ text: "" });
  await refresh();
}));
$("#dismiss-notice").addEventListener("click", () => busy($("#dismiss-notice"), async () => { await request("notice:clear"); await refresh(); }));
$("#settings-button").addEventListener("click", () => {
  $("#include-pinned").checked = state.settings.includePinned;
  $("#close-internal-tabs").checked = state.settings.closeInternalTabs;
  $("#scope").value = state.settings.scope;
  $("#theme").value = state.settings.theme;
  $("#language").value = state.settings.language;
  $("#settings-dialog").showModal();
});

function handleForm(selector, submit) {
  $(selector).addEventListener("submit", (event) => {
    event.preventDefault();
    busy(event.submitter, submit);
  });
}

handleForm("#settings-form", async () => {
  await request("settings", { value: { ...state.settings, includePinned: $("#include-pinned").checked, closeInternalTabs: $("#close-internal-tabs").checked, scope: $("#scope").value, theme: $("#theme").value, language: $("#language").value } });
  $("#settings-dialog").close();
  await refresh();
  toast(t("settings_saved"));
});
handleForm("#session-form", async () => {
  await request("session:update", { id: $("#session-id").value, title: $("#session-title").value, notes: $("#session-notes").value, folderId: $("#session-folder").value || null, starred: $("#session-starred").checked });
  $("#session-dialog").close();
  await refresh();
  toast(t("session_updated"));
});
handleForm("#folder-form", async () => {
  const folder = await request("folder:save", { id: $("#folder-id").value || null, name: $("#folder-name").value });
  $("#folder-dialog").close();
  state.view = folder.id;
  await refresh();
});
$("#add-folder").addEventListener("click", () => editFolder());
$("#edit-folder").addEventListener("click", () => editFolder(state.folders.find((folder) => folder.id === state.view)));
$("#delete-folder").addEventListener("click", () => busy($("#delete-folder"), async () => {
  const folder = state.folders.find((item) => item.id === state.view);
  if (folder && await confirmAction(t("delete_folder_title"), t("delete_folder_description", { name: folder.name }), t("delete_folder"))) {
    await request("folder:delete", { id: folder.id });
    state.view = "all";
    await refresh();
  }
}));
$("#backup-button").addEventListener("click", () => $("#backup-dialog").showModal());
$("#export-button").addEventListener("click", () => busy($("#export-button"), async () => {
  const backup = makeBackup(await request("snapshot"));
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = element("a");
  link.href = url;
  link.download = `8bitTabs-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  toast(t("backup_ready"));
}));
$("#import-kind").addEventListener("change", () => { $("#import-file").accept = $("#import-kind").value === "json" ? ".json,application/json" : ".txt,text/plain"; });
$("#import-file").addEventListener("change", () => busy($("#import-file"), async () => {
  try {
    const file = $("#import-file").files[0];
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) throw new Error(t("file_too_large"));
    const text = await file.text();
    const kind = $("#import-kind").value;
    let data;
    if (kind === "json") {
      try { data = JSON.parse(text.replace(/^\uFEFF/u, "")); } catch { throw new Error(t("invalid_json")); }
    }
    const result = await request("import", kind === "json" ? { kind, data } : { kind, text });
    $("#backup-dialog").close();
    state.view = "all";
    state.query = "";
    $("#search").value = "";
    await refresh();
    toast([t("imported", { count: result.imported }), result.skipped ? t("import_skipped", { count: result.skipped }) : ""].filter(Boolean).join(" "));
  } finally { $("#import-file").value = ""; }
}));

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "DATA_CHANGED") refresh().catch((error) => toast(error.message, true));
});
window.addEventListener("focus", () => refresh().catch((error) => toast(error.message, true)));
refresh().then(() => chrome.action.setBadgeText({ text: "" })).catch((error) => {
  $("#view-description").textContent = t("archive_load_failed");
  toast(error.message, true);
});

$(".version").textContent = `v${chrome.runtime.getManifest().version}`;
