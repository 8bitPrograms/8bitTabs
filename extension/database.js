import { DEFAULT_SETTINGS, cleanSettings } from "./core.js";
import { LocalizedError } from "./i18n.js";

// Retain the pre-rebrand database so an update at the same extension origin keeps every record.
const DATABASE_NAME = "tabdock";
let opening;

function open() {
  if (!opening) opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("sessions", { keyPath: "id" });
      db.createObjectStore("folders", { keyPath: "id" });
      db.createObjectStore("meta", { keyPath: "id" });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); opening = undefined; };
      resolve(db);
    };
    request.onerror = () => { opening = undefined; reject(new LocalizedError("storage_failed")); };
    request.onblocked = () => { opening = undefined; reject(new LocalizedError("storage_blocked")); };
  });
  return opening;
}

// Resolve writes only after transaction.oncomplete, never merely request.onsuccess.
async function transaction(names, mode, run) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, mode, mode === "readwrite" ? { durability: "strict" } : undefined);
    let result;
    tx.oncomplete = () => resolve(typeof result === "function" ? result() : result);
    tx.onabort = () => reject(new LocalizedError("storage_failed"));
    tx.onerror = () => {}; // onabort handles the transaction error.
    try { result = run(tx); } catch (error) { tx.abort(); reject(error); }
  });
}

export const database = {
  snapshot() {
    return transaction(["sessions", "folders", "meta"], "readonly", (tx) => {
      const sessions = tx.objectStore("sessions").getAll();
      const folders = tx.objectStore("folders").getAll();
      const settings = tx.objectStore("meta").get("settings");
      const notice = tx.objectStore("meta").get("notice");
      // v1.0 transient notices contained Turkish text, not translation keys. Discard those notices.
      return () => ({ sessions: sessions.result, folders: folders.result, settings: cleanSettings(settings.result?.value || DEFAULT_SETTINGS), notice: notice.result?.value?.key ? notice.result.value : null });
    });
  },
  getSession(id) {
    return transaction(["sessions"], "readonly", (tx) => {
      const request = tx.objectStore("sessions").get(id);
      return () => request.result;
    });
  },
  putSession(session) {
    return transaction(["sessions"], "readwrite", (tx) => { tx.objectStore("sessions").put(session); });
  },
  addSession(session) {
    return transaction(["sessions"], "readwrite", (tx) => { tx.objectStore("sessions").add(session); });
  },
  putMeta(id, value) {
    return transaction(["meta"], "readwrite", (tx) => { tx.objectStore("meta").put({ id, value }); });
  },
  putFolder(folder) {
    return transaction(["folders"], "readwrite", (tx) => { tx.objectStore("folders").put(folder); });
  },
  deleteFolder(id) {
    return transaction(["folders", "sessions"], "readwrite", (tx) => {
      tx.objectStore("folders").delete(id);
      const cursor = tx.objectStore("sessions").openCursor();
      cursor.onsuccess = () => {
        const row = cursor.result;
        if (!row) return;
        if (row.value.folderId === id) row.update({ ...row.value, folderId: null });
        row.continue();
      };
    });
  },
  deleteSessions(ids) {
    return transaction(["sessions"], "readwrite", (tx) => {
      for (const id of ids) tx.objectStore("sessions").delete(id);
    });
  },
  importAll(folders, sessions) {
    return transaction(["folders", "sessions"], "readwrite", (tx) => {
      for (const folder of folders) tx.objectStore("folders").add(folder);
      for (const session of sessions) tx.objectStore("sessions").add(session);
    });
  },
};
