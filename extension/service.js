import { cleanSettings, isBlankOrInternalUrl, isRestorableUrl, makeSession, parseOneTab, tabUrl, uid, validateBackup } from "./core.js";
import { LocalizedError } from "./i18n.js";

export function createService(api, db) {
  const managerUrl = api.runtime.getURL("manager.html");
  const extensionRoot = api.runtime.getURL("");
  let archiveFlight = null;

  function isProtectedPage(tab) {
    return [tab.url, tab.pendingUrl].some((url) => typeof url === "string"
      && (url.startsWith(extensionRoot) || (url.startsWith("chrome-extension://") && !isBlankOrInternalUrl(url))));
  }

  async function openManager(windowId) {
    const tabs = await api.tabs.query({});
    const existing = tabs.find((tab) => !tab.incognito && (tab.url || "").split(/[?#]/u)[0] === managerUrl);
    if (existing) {
      await api.tabs.update(existing.id, { active: true });
      await api.windows.update(existing.windowId, { focused: true });
      return existing;
    }
    const properties = { url: managerUrl, active: true };
    if (Number.isInteger(windowId) && windowId >= 0) properties.windowId = windowId;
    return api.tabs.create(properties);
  }

  async function archiveImpl(windowId) {
    const { settings } = await db.snapshot();
    const options = { windowType: "normal" };
    if (settings.scope === "current") options.windowId = windowId;
    const tabs = await api.tabs.query(options);
    const candidates = tabs.filter((tab) => {
      if (tab.incognito || (!settings.includePinned && tab.pinned)) return false;
      if (isProtectedPage(tab)) return false;
      const url = tabUrl(tab);
      return isBlankOrInternalUrl(url) ? settings.closeInternalTabs === true : isRestorableUrl(url);
    });
    const skipped = tabs.length - candidates.length;
    if (!candidates.length) {
      await db.putMeta("notice", { kind: "info", key: "no_tabs", at: Date.now() });
      await openManager(windowId);
      return { saved: 0, closed: 0, kept: 0, skipped, internalClosed: 0 };
    }
    const archivable = candidates.filter((tab) => !isBlankOrInternalUrl(tabUrl(tab)));
    // Optional browser-page cleanup never creates an empty session or stores internal URLs.
    const session = archivable.length ? makeSession(archivable, settings) : null;
    if (session) {
      await db.addSession(session);
      const saved = await db.getSession(session.id);
      if (!saved || JSON.stringify(saved) !== JSON.stringify(session)) throw new LocalizedError("archive_verify_failed");
    }
    // Keep a browser window alive, and ensure the archive is reachable, before closing tabs.
    await openManager(windowId);
    let closed = 0;
    let kept = 0;
    let internalClosed = 0;
    let archivedKept = 0;
    for (const snapshot of candidates) {
      const internal = isBlankOrInternalUrl(tabUrl(snapshot));
      try {
        const live = await api.tabs.get(snapshot.id);
        // A navigation, window move, pin or unpin during saving must not close an unrelated state.
        if (live.incognito || isProtectedPage(live) || live.windowId !== snapshot.windowId || live.pinned !== snapshot.pinned || tabUrl(live) !== tabUrl(snapshot)) {
          kept++;
          if (!internal) archivedKept++;
          continue;
        }
        await api.tabs.remove(snapshot.id);
        closed++;
        if (internal) internalClosed++;
      } catch {
        kept++;
        if (!internal) archivedKept++;
      }
    }
    if (session) await db.putSession({ ...session, closedCount: closed - internalClosed, keptCount: archivedKept });
    await db.putMeta("notice", { kind: "success", key: "archive_summary", params: { saved: archivable.length, closed, kept, internalClosed }, at: Date.now() });
    return { ...(session ? { sessionId: session.id } : {}), saved: archivable.length, closed, kept, skipped, internalClosed };
  }

  function archive(windowId) {
    // Coalesce rapid repeated toolbar clicks; never start a second destructive sweep.
    if (archiveFlight) return archiveFlight;
    archiveFlight = archiveImpl(windowId).finally(() => { archiveFlight = null; });
    return archiveFlight;
  }

  async function requireSession(id) {
    const session = await db.getSession(id);
    if (!session) throw new LocalizedError("session_missing");
    return session;
  }

  async function restore({ id, tabId = null, newWindows = false }) {
    const session = await requireSession(id);
    if (session.deletedAt) throw new LocalizedError("recover_first");
    const tabs = tabId ? session.tabs.filter((tab) => tab.id === tabId) : session.tabs;
    if (!tabs.length) throw new LocalizedError("tab_missing");
    const current = await api.windows.getLastFocused({ windowTypes: ["normal"] });
    const windowMap = new Map();
    let opened = 0;
    let failed = 0;
    for (const tab of tabs) {
      if (!isRestorableUrl(tab.url)) { failed++; continue; }
      try {
        let targetWindow = current.id;
        if (newWindows && !tabId) {
          if (!windowMap.has(tab.window)) {
            // Open the first archived URL directly: no orphaned blank tab if anything fails.
            const created = await api.windows.create({ url: tab.url, focused: false, type: "normal" });
            if (!created.tabs?.[0]) throw new LocalizedError("window_failed");
            windowMap.set(tab.window, created.id);
            opened++;
            await api.tabs.update(created.tabs[0].id, { pinned: tab.pinned, muted: tab.muted });
            continue;
          }
          targetWindow = windowMap.get(tab.window);
        }
        const created = await api.tabs.create({ url: tab.url, windowId: targetWindow, pinned: tab.pinned, active: false });
        opened++;
        if (tab.muted) await api.tabs.update(created.id, { muted: true });
      } catch { failed++; }
    }
    // Restoration is deliberately a copy: no archived links are deleted on success or failure.
    return { opened, failed };
  }

  async function updateSession(input) {
    const session = await requireSession(input.id);
    const { folders } = await db.snapshot();
    const title = String(input.title ?? session.title).trim();
    const notes = String(input.notes ?? session.notes);
    if (!title || title.length > 160 || notes.length > 10000) throw new LocalizedError("session_bounds");
    const folderId = input.folderId === undefined ? session.folderId : input.folderId;
    if (folderId != null && !folders.some((folder) => folder.id === folderId)) throw new LocalizedError("folder_missing");
    await db.putSession({ ...session, title, notes, folderId, starred: typeof input.starred === "boolean" ? input.starred : session.starred });
    return { updated: true };
  }

  async function folder(input) {
    const { folders } = await db.snapshot();
    const name = String(input.name || "").trim();
    if (!name || name.length > 80) throw new LocalizedError("folder_bounds");
    if (folders.some((item) => item.id !== input.id && item.name.toLocaleLowerCase("tr") === name.toLocaleLowerCase("tr"))) throw new LocalizedError("folder_exists");
    const existing = input.id ? folders.find((item) => item.id === input.id) : null;
    if (input.id && !existing) throw new LocalizedError("folder_missing");
    const item = { id: existing?.id || uid(), name, createdAt: existing?.createdAt || new Date().toISOString() };
    await db.putFolder(item);
    return item;
  }

  async function importData(input) {
    const snapshot = await db.snapshot();
    const imported = input.kind === "onetab" ? parseOneTab(input.text, new Date(), snapshot.settings.language) : validateBackup(input.data);
    const folderMap = new Map();
    const additions = [];
    for (const folder of imported.folders) {
      const existing = snapshot.folders.find((item) => (item.id === folder.id && item.name === folder.name) || item.name.toLocaleLowerCase("tr") === folder.name.toLocaleLowerCase("tr"));
      if (existing) folderMap.set(folder.id, existing.id);
      else {
        const copy = { ...folder, id: snapshot.folders.some((item) => item.id === folder.id) ? uid() : folder.id };
        folderMap.set(folder.id, copy.id);
        additions.push(copy);
      }
    }
    const existingIds = new Set(snapshot.sessions.map((session) => session.id));
    const sessions = imported.sessions.filter((session) => !existingIds.has(session.id)).map((session) => ({ ...session, folderId: folderMap.get(session.folderId) || null }));
    // One atomic merge; never overwrite existing sessions or apply imported settings.
    await db.importAll(additions, sessions);
    return { imported: sessions.length, skipped: imported.sessions.length - sessions.length };
  }

  async function dispatch(message, windowId) {
    switch (message.type) {
      case "snapshot": return db.snapshot();
      case "archive": return archive(windowId);
      case "restore": return restore(message);
      case "session:update": return updateSession(message);
      case "session:trash": {
        const session = await requireSession(message.id);
        await db.putSession({ ...session, deletedAt: new Date().toISOString() });
        return { trashed: true };
      }
      case "session:recover": {
        const session = await requireSession(message.id);
        await db.putSession({ ...session, deletedAt: null });
        return { recovered: true };
      }
      case "session:delete": {
        const session = await requireSession(message.id);
        if (!session.deletedAt) throw new LocalizedError("trash_first");
        await db.deleteSessions([session.id]);
        return { deleted: true };
      }
      case "folder:save": return folder(message);
      case "folder:delete": await db.deleteFolder(message.id); return { deleted: true };
      case "settings": await db.putMeta("settings", cleanSettings(message.value)); return { saved: true };
      case "notice:clear": await db.putMeta("notice", null); return { cleared: true };
      case "import": return importData(message);
      default: throw new LocalizedError("unknown_operation");
    }
  }
  return { archive, dispatch, openManager };
}
