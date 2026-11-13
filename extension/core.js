import { LocalizedError, localeFor, normalizeLanguage, translate } from "./i18n.js";

export const DEFAULT_SETTINGS = Object.freeze({ includePinned: false, scope: "all", theme: "dark", language: "en", layout: "grid" });
export const BACKUP_FORMAT = "8bittabs-backup";
export const LEGACY_BACKUP_FORMAT = "tabdock-backup";
export const BACKUP_VERSION = 1;
export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
export const MAX_IMPORT_TABS = 100000;
const INTERNAL_SCHEMES = new Set(["chrome:", "edge:", "brave:", "vivaldi:", "opera:"]);
const INTERNAL_PAGES = new Set(["newtab", "new-tab-page", "settings", "history", "downloads", "bookmarks", "extensions", "version", "flags", "discards"]);

export function cleanSettings(value = {}) {
  value ??= {};
  return {
    includePinned: value.includePinned === true,
    scope: value.scope === "current" ? "current" : "all",
    theme: ["light", "system"].includes(value.theme) ? value.theme : "dark",
    language: normalizeLanguage(value.language),
    layout: value.layout === "list" ? "list" : "grid",
  };
}

// No executable URLs, temporary blob URLs, browser debug/crash pages or other extensions.
export function isRestorableUrl(value) {
  if (typeof value !== "string" || value.length > 32768 || /[\u0000-\u0020\u007f]/u.test(value)) return false;
  try {
    const url = new URL(value);
    if (["https:", "http:"].includes(url.protocol)) return Boolean(url.hostname);
    if (url.protocol === "file:") return true;
    if (url.protocol === "about:") return value === "about:blank";
    return INTERNAL_SCHEMES.has(url.protocol) && INTERNAL_PAGES.has(url.hostname);
  } catch { return false; }
}

export const tabUrl = (tab) => tab.pendingUrl || tab.url || "";
export const uid = () => crypto.randomUUID();
export const fold = (value) => String(value || "").normalize("NFKD").toLocaleLowerCase("tr-TR").replace(/ı/g, "i").replace(/ß/g, "ss").replace(/\p{M}/gu, "");

export function searchSession(session, query, folderName = "") {
  const terms = fold(query).trim().split(/\s+/u).filter(Boolean);
  if (!terms.length) return { matches: true, tabs: session.tabs, wholeSession: true };
  const context = fold(`${session.title} ${session.notes} ${folderName}`);
  const wholeSession = terms.every((term) => context.includes(term));
  const tabs = session.tabs.filter((tab) => {
    const haystack = `${context} ${fold(tab.title)} ${fold(tab.url)}`;
    return terms.every((term) => haystack.includes(term));
  });
  return { matches: wholeSession || tabs.length > 0, tabs: wholeSession ? session.tabs : tabs, wholeSession };
}

export function makeSession(tabs, settings, now = new Date()) {
  const windowIds = [...new Set(tabs.map((tab) => tab.windowId))];
  return {
    id: uid(), title: new Intl.DateTimeFormat(localeFor(settings.language), { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(now),
    createdAt: now.toISOString(), notes: "", folderId: null, starred: false, deletedAt: null,
    source: "archive", status: "saved", closedCount: 0, keptCount: 0,
    tabs: [...tabs].sort((a, b) => windowIds.indexOf(a.windowId) - windowIds.indexOf(b.windowId) || a.index - b.index).map((tab) => ({
      id: uid(), title: (tab.title || tabUrl(tab)).slice(0, 10000), url: tabUrl(tab), pinned: Boolean(tab.pinned),
      active: Boolean(tab.active), muted: Boolean(tab.mutedInfo?.muted), window: windowIds.indexOf(tab.windowId), index: tab.index,
    })),
  };
}

function fail(reason) { throw new LocalizedError("invalid_backup", { reason: { key: reason } }); }
function string(value, limit = 1000) {
  if (typeof value !== "string" || value.length > limit) fail("reason_field");
  return value;
}
function date(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) fail("reason_field");
  return new Date(value).toISOString();
}
function integer(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_IMPORT_TABS) fail("reason_field");
  return value;
}

// Validate the entire import before opening a write transaction. Always construct fresh objects.
export function validateBackup(input) {
  if (!input || ![BACKUP_FORMAT, LEGACY_BACKUP_FORMAT].includes(input.format) || input.version !== BACKUP_VERSION) fail("reason_format");
  if (!Array.isArray(input.folders) || !Array.isArray(input.sessions) || input.folders.length > 10000 || input.sessions.length > MAX_IMPORT_TABS) fail("reason_lists");
  const folderIds = new Set();
  const folders = input.folders.map((item) => {
    if (!item || typeof item !== "object") fail("reason_folder");
    const id = string(item.id, 100);
    if (!id || folderIds.has(id)) fail("reason_folder_id");
    folderIds.add(id);
    const name = string(item.name, 80).trim();
    if (!name) fail("reason_folder_name");
    return { id, name, createdAt: date(item.createdAt) };
  });
  const sessionIds = new Set();
  let totalTabs = 0;
  const sessions = input.sessions.map((item) => {
    if (!item || !Array.isArray(item.tabs) || !item.tabs.length) fail("reason_session");
    totalTabs += item.tabs.length;
    if (totalTabs > MAX_IMPORT_TABS) fail("tab_limit");
    const id = string(item.id, 100);
    if (!id || sessionIds.has(id)) fail("reason_session_id");
    sessionIds.add(id);
    if (item.folderId != null && !folderIds.has(item.folderId)) fail("reason_folder_missing");
    const tabIds = new Set();
    const tabs = item.tabs.map((tab) => {
      if (!tab || !isRestorableUrl(tab.url)) fail("reason_url");
      const tabId = string(tab.id, 100);
      if (!tabId || tabIds.has(tabId)) fail("reason_tab_id");
      tabIds.add(tabId);
      return { id: tabId, title: string(tab.title, 10000), url: tab.url, pinned: tab.pinned === true, active: tab.active === true, muted: tab.muted === true, window: integer(tab.window), index: integer(tab.index) };
    });
    return {
      id, title: string(item.title, 160), notes: string(item.notes ?? "", 10000),
      createdAt: date(item.createdAt), folderId: item.folderId ?? null, starred: item.starred === true,
      deletedAt: item.deletedAt == null ? null : date(item.deletedAt),
      source: "import", status: "saved", closedCount: 0, keptCount: 0, tabs,
    };
  });
  return { folders, sessions };
}

export function parseOneTab(text, now = new Date(), language = "en") {
  if (typeof text !== "string" || new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw new LocalizedError("file_too_large");
  let total = 0;
  const groups = text.replace(/^\uFEFF/u, "").trim().split(/\r?\n\s*\r?\n/u).filter(Boolean);
  const sessions = groups.map((group, groupIndex) => {
    const tabs = group.split(/\r?\n/u).filter((line) => line.trim()).map((line, index) => {
      const separator = line.indexOf(" | ");
      const url = (separator < 0 ? line : line.slice(0, separator)).trim();
      if (!isRestorableUrl(url)) throw new LocalizedError("onetab_invalid", { group: groupIndex + 1, line: index + 1 });
      if (++total > MAX_IMPORT_TABS) throw new LocalizedError("tab_limit");
      const title = (separator < 0 ? url : line.slice(separator + 3)).trim().slice(0, 10000) || url;
      return { id: uid(), url, title, pinned: false, active: index === 0, muted: false, window: 0, index };
    });
    return { id: uid(), title: translate(language, "onetab_session", { index: groupIndex + 1 }), notes: "", createdAt: now.toISOString(), folderId: null, starred: false, deletedAt: null, source: "onetab", status: "saved", closedCount: 0, keptCount: 0, tabs };
  });
  if (!sessions.length) throw new LocalizedError("no_import_tabs");
  return { folders: [], sessions };
}

export function makeBackup(snapshot) {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), folders: snapshot.folders, sessions: snapshot.sessions };
}
