import { database } from "./database.js";
import { createService } from "./service.js";
import { translate } from "./i18n.js";

const service = createService(chrome, database);
const origin = chrome.runtime.getURL("");
const MUTATIONS = new Set(["archive", "restore", "session:update", "session:trash", "session:recover", "session:delete", "folder:save", "folder:delete", "settings", "notice:clear", "import"]);
let toolbarFlight;

function notify() {
  chrome.runtime.sendMessage({ type: "DATA_CHANGED" }).catch(() => {});
}

async function syncToolbarLanguage() {
  const { settings } = await database.snapshot();
  await chrome.action.setTitle({ title: translate(settings.language, "toolbar_title") });
}

async function run(message, windowId) {
  const operation = () => service.dispatch(message, windowId);
  const result = MUTATIONS.has(message.type) ? await navigator.locks.request("tabdock-write", operation) : await operation();
  if (message.type === "settings") await syncToolbarLanguage();
  if (MUTATIONS.has(message.type)) notify();
  return result;
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type === "DATA_CHANGED") return false;
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(origin)) return false;
  run(message, sender.tab?.windowId).then((data) => respond({ ok: true, data }), (error) => respond({ ok: false, error: error.message || translate("en", "operation_failed"), errorKey: error.key || "operation_failed", errorParams: error.params || {} }));
  return true;
});

chrome.action.onClicked.addListener((tab) => {
  if (toolbarFlight) return;
  toolbarFlight = run({ type: "archive" }, tab.windowId).catch(async (error) => {
    // A failure before the durable save never reaches tabs.remove.
    await database.putMeta("notice", { kind: "error", key: error.key || "archive_failed", params: error.params || {}, at: Date.now() }).catch(() => {});
    await chrome.action.setBadgeBackgroundColor({ color: "#c85b55" }).catch(() => {});
    await chrome.action.setBadgeText({ text: "!" }).catch(() => {});
    await service.openManager(tab.windowId).catch(() => {});
    notify();
  }).finally(() => { toolbarFlight = null; });
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-library") service.openManager().catch(() => {});
});

chrome.runtime.onInstalled.addListener(({ reason }) => {
  syncToolbarLanguage().catch(() => {});
  if (reason === "install") service.openManager().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => { syncToolbarLanguage().catch(() => {}); });
