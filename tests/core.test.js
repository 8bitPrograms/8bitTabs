import test from "node:test";
import assert from "node:assert/strict";
import { BACKUP_FORMAT, cleanSettings, DEFAULT_SETTINGS, fold, isRestorableUrl, makeBackup, makeSession, parseOneTab, searchSession, validateBackup } from "../extension/core.js";

const makeTab = (id = 1, values = {}) => ({ id, url: `https://example.com/${id}`, title: `Tab ${id}`, pinned: false, active: id === 1, index: id - 1, windowId: 1, ...values });
const session = () => makeSession([makeTab()], DEFAULT_SETTINGS, new Date("2026-11-13T12:00:00Z"));
const backup = () => makeBackup({ folders: [], sessions: [session()] });

test("Pinned tabs are excluded and all windows are selected by default", () => {
  assert.deepEqual(cleanSettings(), { includePinned: false, scope: "all", theme: "dark", language: "en", layout: "grid" });
  assert.equal(cleanSettings({ includePinned: "true", scope: "unexpected" }).includePinned, false);
  assert.equal(cleanSettings({ includePinned: true, scope: "current", theme: "system" }).scope, "current");
});

test("URL policy rejects executable, transient and destructive browser URLs", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "blob:https://example.com/123", "chrome://crash", "chrome://quit", "edge://restart", "chrome-extension://another/page.html", "devtools://devtools/", "not a URL", "https://example.com/\n", "about:config"]) assert.equal(isRestorableUrl(url), false, url);
  for (const url of ["https://example.com/path?q=a%20b", "http://localhost:8080/", "file:///C:/notes.txt", "chrome://settings/", "brave://history/", "edge://newtab/", "about:blank"]) assert.equal(isRestorableUrl(url), true, url);
});

test("Turkish search folds both dotted and dotless i and accents", () => {
  assert.equal(fold("İŞ Işığı Çığ ÖÜ"), "is isigi cig ou");
  const item = session();
  item.title = "İş Araştırması";
  item.notes = "Güvenli depolama";
  assert.equal(searchSession(item, "is arastirma").matches, true);
  assert.equal(searchSession(item, "guvenli").tabs.length, 1);
  assert.equal(searchSession(item, "deney", "Deneyler").matches, true);
});

test("Search returns matching links and combines session context with tab text", () => {
  const item = makeSession([makeTab(1, { title: "Oracle tuning" }), makeTab(2, { title: "PostgreSQL" })], DEFAULT_SETTINGS);
  item.title = "Veritabanı";
  assert.equal(searchSession(item, "veritabani oracle").tabs.length, 1);
  assert.equal(searchSession(item, "missing").matches, false);
  assert.equal(searchSession(item, "").tabs.length, 2);
});

test("Snapshot preserves duplicate URLs, window order, pin and mute state, and pending URL", () => {
  const item = makeSession([makeTab(1, { index: 4, pinned: true, pendingUrl: "https://example.com/pending", mutedInfo: { muted: true } }), makeTab(2, { index: 2 }), makeTab(3, { url: "https://example.com/2", windowId: 2 })], DEFAULT_SETTINGS);
  assert.deepEqual(item.tabs.map((tab) => tab.window), [0, 0, 1]);
  assert.equal(item.tabs[0].title, "Tab 2");
  assert.equal(item.tabs[1].url, "https://example.com/pending");
  assert.equal(item.tabs[1].pinned, true);
  assert.equal(item.tabs[1].muted, true);
  assert.equal(item.tabs.length, 3);
});

test("JSON export round trips safely and excludes settings", () => {
  const input = backup();
  const result = validateBackup(JSON.parse(JSON.stringify(input)));
  assert.equal(result.sessions[0].tabs[0].url, "https://example.com/1");
  assert.equal("settings" in input, false);
});

test("8bitTabs exports its own format and imports pre-rebrand backups without changing user text", () => {
  const input = backup();
  assert.equal(BACKUP_FORMAT, "8bittabs-backup");
  assert.equal(input.format, "8bittabs-backup");
  input.format = "tabdock-backup";
  input.sessions[0].title = "TabDock research — user title";
  const imported = validateBackup(input);
  assert.equal(imported.sessions[0].title, input.sessions[0].title);
  assert.deepEqual(imported.sessions[0].tabs, input.sessions[0].tabs);
});

test("JSON import rejects invalid version, unsafe URL, duplicate IDs, missing folders and invalid dates", () => {
  const transforms = [
    (value) => { value.version = 2; },
    (value) => { value.sessions[0].tabs[0].url = "javascript:alert(1)"; },
    (value) => { value.sessions.push(structuredClone(value.sessions[0])); },
    (value) => { value.sessions[0].tabs.push(structuredClone(value.sessions[0].tabs[0])); },
    (value) => { value.sessions[0].folderId = "missing"; },
    (value) => { value.sessions[0].createdAt = "yesterday"; },
    (value) => { value.sessions[0].tabs[0].window = -1; },
    (value) => { value.sessions[0].tabs = []; },
  ];
  for (const transform of transforms) { const value = backup(); transform(value); assert.throws(() => validateBackup(value), { key: "invalid_backup" }); }
});

test("JSON import reconstructs data rather than copying arbitrary properties", () => {
  const input = backup();
  input.sessions[0].unknown = "discard";
  input.sessions[0].tabs[0].html = "<img src=x onerror=alert(1)>";
  const result = validateBackup(input);
  assert.equal("unknown" in result.sessions[0], false);
  assert.equal("html" in result.sessions[0].tabs[0], false);
});

test("OneTab text supports CRLF, BOM, blank-line sessions and titles with separators", () => {
  const result = parseOneTab("\uFEFFhttps://example.com/a | A | title\r\nhttps://example.com/b | İkinci\r\n\r\nhttps://example.com/c\r\n");
  assert.equal(result.sessions.length, 2);
  assert.equal(result.sessions[0].tabs[0].title, "A | title");
  assert.equal(result.sessions[0].tabs[1].title, "İkinci");
  assert.equal(result.sessions[1].tabs[0].title, "https://example.com/c");
});

test("One bad OneTab URL rejects the entire input", () => {
  assert.throws(() => parseOneTab("https://example.com | Good\njavascript:alert(1) | Bad"), { key: "onetab_invalid" });
  assert.throws(() => parseOneTab(" \n "), { key: "no_import_tabs" });
});
