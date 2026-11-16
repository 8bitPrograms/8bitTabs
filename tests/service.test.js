import test from "node:test";
import assert from "node:assert/strict";
import { createService } from "../extension/service.js";
import { DEFAULT_SETTINGS, makeBackup } from "../extension/core.js";

function fixture({ settings = {}, initialTabs = null } = {}) {
  const tabs = initialTabs || [
    { id: 1, url: "https://example.com/pin", title: "Pinned", windowId: 1, pinned: true, index: 0 },
    { id: 2, url: "https://example.com/one", title: "One", windowId: 1, pinned: false, index: 1 },
    { id: 3, url: "https://example.com/two", title: "Two", windowId: 2, pinned: false, index: 0 },
    { id: 4, url: "https://example.com/private", title: "Private", windowId: 3, incognito: true, pinned: false, index: 0 },
    { id: 5, url: "chrome-extension://tabdock/manager.html", title: "Manager", windowId: 1, pinned: false, index: 2 },
  ];
  const events = [];
  const sessions = new Map();
  const folders = new Map();
  const meta = new Map([["settings", { ...DEFAULT_SETTINGS, ...settings }]]);
  const db = {
    async snapshot() { return { sessions: [...sessions.values()].map((item) => structuredClone(item)), folders: [...folders.values()], settings: meta.get("settings"), notice: meta.get("notice") }; },
    async getSession(id) { events.push("verify"); return structuredClone(sessions.get(id)); },
    async addSession(session) { events.push("save"); sessions.set(session.id, structuredClone(session)); },
    async putSession(session) { sessions.set(session.id, structuredClone(session)); },
    async putMeta(id, value) { meta.set(id, value); },
    async putFolder(folder) { folders.set(folder.id, folder); },
    async deleteFolder(id) { folders.delete(id); for (const item of sessions.values()) if (item.folderId === id) item.folderId = null; },
    async deleteSessions(ids) { for (const id of ids) sessions.delete(id); },
    async importAll(newFolders, newSessions) { for (const item of newFolders) folders.set(item.id, item); for (const item of newSessions) sessions.set(item.id, structuredClone(item)); },
  };
  let nextId = 100;
  const api = {
    runtime: { getURL: (file) => `chrome-extension://tabdock/${file}` },
    tabs: {
      async query(query) { return tabs.filter((tab) => query.windowId == null || tab.windowId === query.windowId).map((tab) => ({ ...tab })); },
      async get(id) { const tab = tabs.find((tab) => tab.id === id); if (!tab) throw new Error("Missing tab"); return { ...tab }; },
      async remove(id) { events.push(`remove:${id}`); const index = tabs.findIndex((tab) => tab.id === id); if (index >= 0) tabs.splice(index, 1); },
      async update(id, values) { Object.assign(tabs.find((tab) => tab.id === id), values); return tabs.find((tab) => tab.id === id); },
      async create(values) { events.push("create"); const tab = { ...values, id: nextId++, windowId: values.windowId || 1 }; tabs.push(tab); return tab; },
    },
    windows: {
      async update() {},
      async getLastFocused() { return { id: 1 }; },
      async create(values) { const tab = { id: nextId++, url: values.url, windowId: nextId++, index: 0 }; tabs.push(tab); return { id: tab.windowId, tabs: [tab] }; },
    },
  };
  return { db, api, tabs, events, sessions, folders, meta, service: createService(api, db) };
}

test("Archive saves and verifies before closing; defaults preserve pins, private tabs and library", async () => {
  const f = fixture();
  const result = await f.service.archive(1);
  assert.equal(result.saved, 2);
  assert.equal(result.closed, 2);
  assert.deepEqual(f.tabs.map((tab) => tab.id), [1, 4, 5]);
  assert.ok(f.events.indexOf("save") < f.events.indexOf("verify"));
  assert.ok(f.events.indexOf("verify") < f.events.indexOf("remove:2"));
  assert.equal([...f.sessions.values()][0].tabs.length, 2);
});

test("Storage failure closes no tabs", async () => {
  const f = fixture();
  f.db.addSession = async () => { throw new Error("Disk full"); };
  await assert.rejects(f.service.archive(1), /Disk full/u);
  assert.equal(f.tabs.length, 5);
  assert.equal(f.events.some((event) => event.startsWith("remove:")), false);
});

test("Verification mismatch closes no tabs", async () => {
  const f = fixture();
  f.db.getSession = async () => undefined;
  await assert.rejects(f.service.archive(1), { key: "archive_verify_failed" });
  assert.equal(f.tabs.length, 5);
});

test("Inability to open archive page closes no tabs while keeping the durable copy", async () => {
  const f = fixture();
  f.api.tabs.update = async () => { throw new Error("Window unavailable"); };
  await assert.rejects(f.service.archive(1), /Window unavailable/u);
  assert.equal(f.tabs.length, 5);
  assert.equal(f.sessions.size, 1);
});

test("Settings can include pinned tabs and restrict to the current window", async () => {
  const f = fixture({ settings: { includePinned: true, scope: "current" } });
  const result = await f.service.archive(1);
  assert.equal(result.saved, 2);
  assert.deepEqual(f.tabs.map((tab) => tab.id), [3, 4, 5]);
});

test("Navigation, pin changes and window moves during save are kept open", async () => {
  for (const change of [{ url: "https://example.com/new" }, { pinned: true }, { windowId: 42 }]) {
    const f = fixture();
    const save = f.db.addSession;
    f.db.addSession = async (session) => { await save(session); Object.assign(f.tabs.find((tab) => tab.id === 2), change); };
    const result = await f.service.archive(1);
    assert.ok(f.tabs.some((tab) => tab.id === 2));
    assert.equal(result.kept, 1);
    assert.equal(result.closed, 1);
  }
});

test("Rapid concurrent archive calls share a single durable session", async () => {
  const f = fixture();
  const [a, b] = await Promise.all([f.service.archive(1), f.service.archive(1)]);
  assert.equal(a.sessionId, b.sessionId);
  assert.equal(f.sessions.size, 1);
});

test("One tab close failure cannot remove saved URLs or prevent remaining tabs closing", async () => {
  const f = fixture();
  const remove = f.api.tabs.remove;
  f.api.tabs.remove = async (id) => { if (id === 2) throw new Error("Blocked"); return remove(id); };
  const result = await f.service.archive(1);
  assert.equal(result.kept, 1);
  assert.equal(result.closed, 1);
  assert.equal([...f.sessions.values()][0].tabs.length, 2);
});

test("Restoring links retains the archive and reports partial failure", async () => {
  const f = fixture();
  const result = await f.service.archive(1);
  const create = f.api.tabs.create;
  f.api.tabs.create = async (values) => { if (values.url.endsWith("two")) throw new Error("Blocked"); return create(values); };
  assert.deepEqual(await f.service.dispatch({ type: "restore", id: result.sessionId }), { opened: 1, failed: 1 });
  assert.equal((await f.db.getSession(result.sessionId)).tabs.length, 2);
});

test("Restore in separate windows preserves original window partition and pinned state", async () => {
  const f = fixture({ settings: { includePinned: true } });
  const result = await f.service.archive(1);
  const restored = await f.service.dispatch({ type: "restore", id: result.sessionId, newWindows: true });
  assert.equal(restored.opened, 3);
  const restoredTabs = f.tabs.filter((tab) => tab.id >= 100);
  assert.equal(new Set(restoredTabs.map((tab) => tab.windowId)).size, 2);
  assert.equal(restoredTabs.find((tab) => tab.url.endsWith("pin")).pinned, true);
});

test("Moving an archive to trash is reversible; active archives cannot be permanently deleted", async () => {
  const f = fixture();
  const result = await f.service.archive(1);
  await assert.rejects(f.service.dispatch({ type: "session:delete", id: result.sessionId }), { key: "trash_first" });
  await f.service.dispatch({ type: "session:trash", id: result.sessionId });
  await assert.rejects(f.service.dispatch({ type: "restore", id: result.sessionId }), { key: "recover_first" });
  await f.service.dispatch({ type: "session:recover", id: result.sessionId });
  assert.equal((await f.db.getSession(result.sessionId)).deletedAt, null);
  await f.service.dispatch({ type: "session:trash", id: result.sessionId });
  await f.service.dispatch({ type: "session:delete", id: result.sessionId });
  assert.equal(f.sessions.size, 0);
});

test("Backup merge skips existing IDs and preserves local settings", async () => {
  const f = fixture();
  await f.service.archive(1);
  const exported = makeBackup(await f.db.snapshot());
  assert.deepEqual(await f.service.dispatch({ type: "import", data: exported, kind: "json" }), { imported: 0, skipped: 1 });
  assert.equal(f.meta.get("settings").includePinned, false);
  assert.equal(f.sessions.size, 1);
});

test("Deleting a folder retains its sessions outside the folder", async () => {
  const f = fixture();
  const result = await f.service.archive(1);
  const folder = await f.service.dispatch({ type: "folder:save", name: "Araştırma" });
  await f.service.dispatch({ type: "session:update", id: result.sessionId, folderId: folder.id });
  await f.service.dispatch({ type: "folder:delete", id: folder.id });
  assert.equal(f.sessions.size, 1);
  assert.equal((await f.db.getSession(result.sessionId)).folderId, null);
});

test("Invalid import produces no partial additions", async () => {
  const f = fixture();
  await assert.rejects(f.service.dispatch({ type: "import", kind: "onetab", text: "https://example.com | Valid\n\nhttps://example.com/2 | Valid\ndata:text/html,bad | Invalid" }));
  assert.equal(f.sessions.size, 0);
  assert.equal(f.folders.size, 0);
});

const browserTab = (id, url, values = {}) => ({ id, url, title: "Start Page", windowId: 1, pinned: false, index: id, ...values });
const cleanupTabs = () => [
  browserTab(20, "https://example.com/work"),
  browserTab(21, "about:blank"),
  browserTab(22, "vivaldi://startpage"),
  browserTab(23, "chrome-extension://mpognobbkildjkofajifpdfhcoklimli/components/settings/settings.html"),
  browserTab(24, "vivaldi://about", { pinned: true }),
  browserTab(25, "chrome-extension://another/options.html", { pendingUrl: "https://example.com/leaving-extension" }),
  browserTab(26, "chrome-extension://tabdock/manager.html"),
  browserTab(27, "chrome://settings/", { windowId: 2 }),
  browserTab(28, "vivaldi://startpage", { incognito: true }),
  browserTab(29, ""),
];

test("Default archive leaves blank/internal pages open and archives real URLs regardless of their title", async () => {
  const f = fixture({ initialTabs: cleanupTabs() });
  const result = await f.service.archive(1);
  assert.equal(result.saved, 1);
  assert.equal(result.closed, 1);
  assert.equal(result.internalClosed, 0);
  assert.deepEqual(f.tabs.map((tab) => tab.id), [21, 22, 23, 24, 25, 26, 27, 28, 29]);
  assert.deepEqual([...f.sessions.values()][0].tabs.map((tab) => tab.url), ["https://example.com/work"]);
});

test("Opt-in cleanup closes blank and Vivaldi/browser pages without archiving them or other extension pages", async () => {
  const f = fixture({ settings: { closeInternalTabs: true }, initialTabs: cleanupTabs() });
  const result = await f.service.archive(1);
  assert.equal(result.saved, 1);
  assert.equal(result.closed, 5);
  assert.equal(result.internalClosed, 4);
  assert.deepEqual(f.tabs.map((tab) => tab.id), [24, 25, 26, 28, 29]);
  const saved = [...f.sessions.values()][0];
  assert.equal(saved.tabs.length, 1);
  assert.equal(saved.tabs[0].url, "https://example.com/work");
  assert.equal(saved.closedCount, 1);
  assert.equal(saved.keptCount, 0);
  assert.equal(f.meta.get("notice").params.internalClosed, 4);
});

test("Cleanup-only action opens the archive first and creates no empty session", async () => {
  const f = fixture({ settings: { closeInternalTabs: true }, initialTabs: [browserTab(21, "about:blank"), browserTab(22, "vivaldi://startpage")] });
  const result = await f.service.archive(1);
  assert.equal(result.saved, 0);
  assert.equal(result.sessionId, undefined);
  assert.equal(result.closed, 2);
  assert.equal(result.internalClosed, 2);
  assert.equal(f.sessions.size, 0);
  assert.equal(f.events.includes("save"), false);
  assert.ok(f.events.indexOf("create") < f.events.indexOf("remove:21"));
  assert.equal(f.tabs.length, 1);
  assert.equal(f.tabs[0].url, "chrome-extension://tabdock/manager.html");
});

test("Cleanup respects current-window scope and the separate pinned-tab opt-in", async () => {
  for (const includePinned of [false, true]) {
    const f = fixture({ settings: { closeInternalTabs: true, scope: "current", includePinned }, initialTabs: cleanupTabs() });
    const result = await f.service.archive(1);
    assert.equal(result.internalClosed, includePinned ? 4 : 3);
    assert.equal(f.tabs.some((tab) => tab.id === 24), !includePinned);
    for (const id of [25, 26, 27, 28, 29]) assert.ok(f.tabs.some((tab) => tab.id === id), `Preserve tab ${id}`);
  }
});

test("A blank page navigating to a real URL is archived using its pending destination", async () => {
  const f = fixture({ initialTabs: [browserTab(21, "about:blank", { pendingUrl: "https://example.com/loading" }), browserTab(26, "chrome-extension://tabdock/manager.html")] });
  const result = await f.service.archive(1);
  assert.equal(result.saved, 1);
  assert.equal(result.internalClosed, 0);
  assert.equal([...f.sessions.values()][0].tabs[0].url, "https://example.com/loading");
});

test("Cleanup never closes browser pages that navigate, move, change pin state or become private during archiving", async () => {
  for (const change of [{ url: "https://example.com/new" }, { pendingUrl: "https://example.com/loading" }, { windowId: 42 }, { pinned: true }, { incognito: true }, { url: "chrome-extension://tabdock/manager.html", pendingUrl: "vivaldi://startpage" }, { url: "chrome-extension://another/options.html", pendingUrl: "vivaldi://startpage" }]) {
    const f = fixture({ settings: { closeInternalTabs: true }, initialTabs: [browserTab(20, "https://example.com/work"), browserTab(22, "vivaldi://startpage"), browserTab(26, "chrome-extension://tabdock/manager.html")] });
    const get = f.api.tabs.get;
    f.api.tabs.get = async (id) => ({ ...await get(id), ...(id === 22 ? change : {}) });
    const result = await f.service.archive(1);
    assert.ok(f.tabs.some((tab) => tab.id === 22));
    assert.equal(result.kept, 1);
    assert.equal(result.internalClosed, 0);
    assert.equal([...f.sessions.values()][0].keptCount, 0);
  }
});

test("Failed save or verification also prevents optional internal-page cleanup", async () => {
  for (const failure of ["save", "verify"]) {
    const f = fixture({ settings: { closeInternalTabs: true }, initialTabs: cleanupTabs() });
    if (failure === "save") f.db.addSession = async () => { throw new Error("Disk full"); };
    else f.db.getSession = async () => undefined;
    await assert.rejects(f.service.archive(1));
    assert.equal(f.tabs.length, 10);
    assert.equal(f.events.some((event) => event.startsWith("remove:")), false);
  }
});

test("Cleanup-only action leaves every page open if the archive cannot be reached", async () => {
  const f = fixture({ settings: { closeInternalTabs: true }, initialTabs: [browserTab(21, "about:blank"), browserTab(26, "chrome-extension://tabdock/manager.html")] });
  f.api.tabs.update = async () => { throw new Error("Window unavailable"); };
  await assert.rejects(f.service.archive(1));
  assert.equal(f.tabs.length, 2);
  assert.equal(f.sessions.size, 0);
});

test("Failed internal-page close is reported without altering saved-session close counts", async () => {
  const f = fixture({ settings: { closeInternalTabs: true }, initialTabs: [browserTab(20, "https://example.com/work"), browserTab(21, "about:blank"), browserTab(26, "chrome-extension://tabdock/manager.html")] });
  const remove = f.api.tabs.remove;
  f.api.tabs.remove = async (id) => { if (id === 21) throw new Error("Close blocked"); return remove(id); };
  const result = await f.service.archive(1);
  assert.equal(result.saved, 1);
  assert.equal(result.closed, 1);
  assert.equal(result.kept, 1);
  assert.equal(result.internalClosed, 0);
  assert.ok(f.tabs.some((tab) => tab.id === 21));
  assert.equal([...f.sessions.values()][0].closedCount, 1);
  assert.equal([...f.sessions.values()][0].keptCount, 0);
});

test("Vivaldi application shell URLs remain protected even when internal and pinned cleanup are enabled", async () => {
  const f = fixture({ settings: { closeInternalTabs: true, includePinned: true }, initialTabs: [browserTab(21, "about:blank"), browserTab(30, "chrome-extension://mpognobbkildjkofajifpdfhcoklimli/main.html"), browserTab(31, "chrome-extension://mpognobbkildjkofajifpdfhcoklimli/window.html"), browserTab(26, "chrome-extension://tabdock/manager.html")] });
  const result = await f.service.archive(1);
  assert.equal(result.saved, 0);
  assert.equal(result.internalClosed, 1);
  assert.deepEqual(f.tabs.map((tab) => tab.id), [30, 31, 26]);
});
