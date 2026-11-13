import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { devRequire } from "./dev-dependencies.mjs";
import { CATALOGS, LANGUAGES, localeFor, translate, translateNotice } from "../extension/i18n.js";

const { chromium } = devRequire("playwright");
const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "test-results");
await mkdir(output, { recursive: true });
const profile = await mkdtemp(path.join(output, "profile-"));
const server = createServer((request, response) => {
  const title = new URL(request.url, "http://localhost").searchParams.get("title") || "Test page";
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(`<!doctype html><title>${title.replace(/[<>&]/gu, "")}</title><h1>8bitTabs local test</h1>`);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const checks = [];
const errors = [];
let context;
let page;
let extensionId;
let managerUrl;

async function launch() {
  context = await chromium.launchPersistentContext(profile, {
    ...(process.env.TABDOCK_BROWSER ? { executablePath: process.env.TABDOCK_BROWSER } : { channel: "chromium" }),
    headless: true,
    viewport: { width: 1440, height: 1000 },
    locale: "tr-TR", // English must stay the extension default even in a Turkish browser.
    acceptDownloads: true,
    downloadsPath: path.join(output, "downloads"),
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [`--disable-extensions-except=${path.join(root, "extension")}`, `--load-extension=${path.join(root, "extension")}`, "--no-first-run", "--disable-background-networking", "--disable-component-update", "--disable-sync"],
  });
  context.on("page", (p) => p.on("pageerror", (error) => errors.push(error.message)));
  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 20000 });
  extensionId = new URL(worker.url()).hostname;
  managerUrl = `chrome-extension://${extensionId}/manager.html`;
  page = context.pages().find((p) => p.url().startsWith(managerUrl)) || await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(managerUrl);
  await page.waitForFunction(() => document.querySelector("#view-description").textContent.includes(" · "));
}

const send = (type, values = {}) => page.evaluate(async ({ type, values }) => {
  const result = await chrome.runtime.sendMessage({ type, ...values });
  if (!result?.ok) throw new Error(result?.error || "No extension response");
  return result.data;
}, { type, values });

async function check(name, task) {
  await task();
  checks.push(name);
  console.log(`PASS ${name}`);
}

async function waitSessionCount(count) {
  await page.waitForFunction((n) => document.querySelector("#all-count").textContent === String(n), count);
}

try {
  await launch();
  console.log(`Browser: ${context.browser()?.version() || "persistent Chromium"}`);
  console.log(`Isolated extension profile: ${profile}`);

  await check("Extension loads with only tabs and unlimitedStorage permissions", async () => {
    const manifest = await page.evaluate(() => chrome.runtime.getManifest());
    assert.deepEqual(manifest.permissions, ["tabs", "unlimitedStorage"]);
    assert.equal(manifest.content_scripts, undefined);
    assert.equal(manifest.host_permissions, undefined);
    assert.equal(manifest.action.default_popup, undefined);
    assert.equal((await send("snapshot")).settings.includePinned, false);
    assert.equal((await send("snapshot")).settings.language, "en");
    assert.equal(manifest.name, "8bitTabs — Private Tab Archive");
    assert.equal(manifest.default_locale, "en");
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    assert.equal(await page.locator("#settings-button").innerText(), "Settings");
    assert.equal(await page.evaluate(() => navigator.language), "tr-TR");
  });

  let firstId;
  let pinnedId;
  let secondaryWindowId;
  await check("Actual browser archive closes normal tabs across windows and preserves pinned tab", async () => {
    const ids = await page.evaluate(async (base) => {
      const own = await chrome.tabs.getCurrent();
      const pin = await chrome.tabs.create({ url: `${base}/pin?title=Pinned`, pinned: true, active: false, windowId: own.windowId });
      const a = await chrome.tabs.create({ url: `${base}/a?title=Oracle`, active: false, windowId: own.windowId });
      const b = await chrome.windows.create({ url: `${base}/b?title=PostgreSQL`, focused: false });
      for (const tab of await chrome.tabs.query({})) {
        if (tab.id !== own.id && tab.id !== pin.id && tab.id !== a.id && tab.id !== b.tabs[0].id) await chrome.tabs.remove(tab.id);
      }
      return { pin: pin.id, a: a.id, b: b.tabs[0].id, secondaryWindowId: b.id };
    }, base);
    pinnedId = ids.pin;
    secondaryWindowId = ids.secondaryWindowId;
    await page.locator("#archive-button").click();
    await waitSessionCount(1);
    await page.waitForFunction(() => document.querySelector("#notice-text").textContent.includes("2 tabs closed"));
    const snapshot = await send("snapshot");
    firstId = snapshot.sessions[0].id;
    assert.equal(snapshot.sessions[0].tabs.length, 2);
    assert.equal(snapshot.sessions[0].closedCount, 2);
    const remaining = await page.evaluate(() => chrome.tabs.query({}));
    assert.ok(remaining.some((tab) => tab.id === pinnedId && tab.pinned));
    assert.equal(remaining.some((tab) => [ids.a, ids.b].includes(tab.id)), false);
    assert.equal(new Set(snapshot.sessions[0].tabs.map((tab) => tab.window)).size, 2);
  });

  let folderId;
  await check("Folder creation, session rename, notes and star work through the UI", async () => {
    await page.locator("#add-folder").click();
    await page.locator("#folder-name").fill("İş Araştırması");
    await page.locator("#folder-form button[type=submit]").click();
    await page.locator("#folder-dialog").waitFor({ state: "hidden" });
    folderId = (await send("snapshot")).folders[0].id;
    await page.locator('[data-view="all"]').click();
    await page.locator(".session-title").click();
    await page.locator("#session-title").fill("Veritabanı notları");
    await page.locator("#session-notes").fill("İş için performans araştırması");
    await page.locator("#session-folder").selectOption(folderId);
    await page.locator("#session-starred").check();
    await page.locator("#session-form button[type=submit]").click();
    await page.locator("#session-dialog").waitFor({ state: "hidden" });
    await page.locator(".session-title").filter({ hasText: "Veritabanı notları" }).waitFor();
    assert.equal((await send("snapshot")).sessions[0].folderId, folderId);
    assert.equal((await send("snapshot")).sessions[0].starred, true);
  });

  await check("Turkish search finds URL, session note and folder name and handles no results", async () => {
    await page.locator("#search").fill("127.0.0.1");
    assert.equal(await page.locator(".tab-row").count(), 2);
    await page.locator("#search").fill("is arastirmasi");
    assert.equal(await page.locator(".session-card").count(), 1);
    await page.locator("#search").fill("not-found-string");
    await page.locator("#empty-state").waitFor();
    assert.equal(await page.locator(".session-card").count(), 0);
    await page.locator("#search").fill("");
  });

  await check("Restore one link and restore original window partitions without losing archive", async () => {
    const snapshot = await send("snapshot");
    const tab = snapshot.sessions[0].tabs[0];
    const one = await send("restore", { id: firstId, tabId: tab.id });
    assert.equal(one.opened, 1);
    const all = await send("restore", { id: firstId, newWindows: true });
    assert.deepEqual(all, { opened: 2, failed: 0 });
    assert.equal((await send("snapshot")).sessions[0].tabs.length, 2);
    const windows = await page.evaluate(() => chrome.windows.getAll({ populate: true, windowTypes: ["normal"] }));
    assert.ok(windows.length >= 3);
    // Close only test-created windows/tabs, leaving the manager and pinned test tab.
    await page.evaluate(async ({ pinnedId, managerUrl }) => {
      for (const tab of await chrome.tabs.query({})) if (tab.id !== pinnedId && !tab.url?.startsWith(managerUrl)) await chrome.tabs.remove(tab.id);
    }, { pinnedId, managerUrl });
  });

  await check("Trash, recovery, permanent-delete guard and actual permanent delete", async () => {
    await send("session:trash", { id: firstId });
    await waitSessionCount(0);
    await page.locator('[data-view="trash"]').click();
    await page.locator(".session-card").waitFor();
    await page.getByRole("button", { name: "Recover session", exact: true }).click();
    await waitSessionCount(1);
    const response = await page.evaluate(async (id) => chrome.runtime.sendMessage({ type: "session:delete", id }), firstId);
    assert.equal(response.ok, false);
    assert.equal((await send("snapshot")).sessions.length, 1);
    await page.locator('[data-view="all"]').click();
  });

  await check("Pinned inclusion, current-window scope and light theme persist from settings UI", async () => {
    await page.locator("#settings-button").click();
    await page.locator("#include-pinned").check();
    await page.locator("#scope").selectOption("current");
    await page.locator("#theme").selectOption("light");
    await page.locator("#settings-form button[type=submit]").click();
    await page.locator("#settings-dialog").waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.documentElement.dataset.theme === "light");
    const external = await page.evaluate(async (base) => {
      const window = await chrome.windows.create({ url: `${base}/keep?title=OtherWindow`, focused: false });
      return { windowId: window.id, tabId: window.tabs[0].id };
    }, base);
    secondaryWindowId = external.windowId;
    const archived = await send("archive");
    assert.equal(archived.saved, 1);
    const allTabs = await page.evaluate(() => chrome.tabs.query({}));
    assert.equal(allTabs.some((tab) => tab.id === pinnedId), false);
    assert.equal(allTabs.some((tab) => tab.id === external.tabId), true);
    await page.evaluate((id) => chrome.windows.remove(id), secondaryWindowId);
  });

  await check("Real toolbar action event archives a tab through Extensions.triggerAction", async () => {
    const before = (await send("snapshot")).sessions.length;
    const target = await context.newPage();
    await target.goto(`${base}/toolbar?title=ToolbarAction`);
    const browserSession = await context.browser().newBrowserCDPSession();
    const { targetInfos } = await browserSession.send("Target.getTargets", { filter: [{ type: "tab", exclude: false }, { exclude: true }] });
    const tabTarget = targetInfos.find((info) => info.url === target.url());
    if (!tabTarget) throw new Error(`No tab target: ${JSON.stringify(targetInfos)}`);
    await browserSession.send("Extensions.triggerAction", { id: extensionId, targetId: tabTarget.targetId });
    await waitSessionCount(before + 1);
    assert.ok((await send("snapshot")).sessions.some((session) => session.tabs.some((tab) => tab.url.includes("/toolbar?"))));
    await browserSession.detach();
  });

  await check("JSON export download and repeat import preserve existing sessions and folders", async () => {
    await page.locator("#backup-button").click();
    const downloading = page.waitForEvent("download");
    await page.locator("#export-button").click();
    const download = await downloading;
    const filename = path.join(output, "roundtrip-backup.json");
    await download.saveAs(filename);
    const backup = JSON.parse(await readFile(filename, "utf8"));
    assert.equal(backup.format, "8bittabs-backup");
    const before = await send("snapshot");
    assert.equal(backup.sessions.length, before.sessions.length);
    assert.equal(backup.settings, undefined);
    await page.locator("#import-file").setInputFiles(filename);
    await page.locator("#backup-dialog").waitFor({ state: "hidden" });
    const after = await send("snapshot");
    assert.equal(after.sessions.length, before.sessions.length);
    assert.equal(after.folders.length, before.folders.length);
    assert.equal(after.settings.includePinned, true);
  });

  await check("OneTab text import preserves separate blank-line sessions", async () => {
    const before = (await send("snapshot")).sessions.length;
    await page.locator("#backup-button").click();
    await page.locator("#import-kind").selectOption("onetab");
    await page.locator("#import-file").setInputFiles({ name: "onetab.txt", mimeType: "text/plain", buffer: Buffer.from("https://example.com/a | Örnek A\nhttps://example.com/b | Örnek B\n\nhttps://example.com/c | Örnek C") });
    await page.locator("#backup-dialog").waitFor({ state: "hidden" });
    assert.equal((await send("snapshot")).sessions.length, before + 2);
  });

  await check("Unsafe import is rejected atomically and script-looking titles render as plain text", async () => {
    const before = (await send("snapshot")).sessions.length;
    const response = await page.evaluate(() => chrome.runtime.sendMessage({ type: "import", kind: "onetab", text: "https://example.com | Valid\n\njavascript:alert(1) | Bad" }));
    assert.equal(response.ok, false);
    assert.equal((await send("snapshot")).sessions.length, before);
    await send("session:update", { id: firstId, title: '<img src=x onerror="window.TABDOCK_XSS=1">' });
    await page.locator(".session-title").filter({ hasText: "<img" }).waitFor();
    assert.equal(await page.locator("#sessions img").count(), 0);
    assert.equal(await page.evaluate(() => window.TABDOCK_XSS), undefined);
    await send("session:update", { id: firstId, title: "Veritabanı notları" });
  });

  await check("CSP prevents background connections to external servers", async () => {
    const prevented = await page.evaluate(async () => {
      try { await fetch("https://example.com/tabdock-should-not-connect"); return false; } catch { return true; }
    });
    assert.equal(prevented, true);
  });

  const beforeRestart = await send("snapshot");
  await context.close();
  await launch();
  await check("Full browser restart retains IndexedDB sessions, folders and settings", async () => {
    const after = await send("snapshot");
    assert.deepEqual(after.sessions, beforeRestart.sessions);
    assert.deepEqual(after.folders, beforeRestart.folders);
    assert.deepEqual(after.settings, beforeRestart.settings);
  });

  await check("Permanent deletion requires confirmation in trash UI", async () => {
    const id = (await send("snapshot")).sessions.find((session) => session.source === "onetab").id;
    await send("session:trash", { id });
    await page.locator('[data-view="trash"]').click();
    await page.locator(`[data-session-id="${id}"]`).getByRole("button", { name: "Delete permanently", exact: true }).click();
    await page.locator("#confirm-dialog").waitFor();
    await page.locator("#confirm-cancel").click();
    assert.ok((await send("snapshot")).sessions.some((session) => session.id === id));
    await page.locator(`[data-session-id="${id}"]`).getByRole("button", { name: "Delete permanently", exact: true }).click();
    await page.locator("#confirm-ok").click();
    await page.locator(`[data-session-id="${id}"]`).waitFor({ state: "hidden" });
    assert.equal((await send("snapshot")).sessions.some((session) => session.id === id), false);
    await page.locator('[data-view="all"]').click();
  });

  await check("Keyboard search focus and responsive layout at desktop and phone widths", async () => {
    await page.locator("h1").click();
    await page.keyboard.press("/");
    assert.equal(await page.locator("#search").evaluate((input) => input === document.activeElement), true);
    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, `horizontal overflow at ${width}`);
    }
    await page.screenshot({ path: path.join(output, "mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: path.join(output, "light.png"), fullPage: true });
  });

  await check("An empty folder can be deleted while its archived sessions remain", async () => {
    await page.locator("#folders .nav-button").filter({ hasText: "İş Araştırması" }).click();
    await page.locator("#delete-folder").click();
    await page.locator("#confirm-ok").click();
    await page.waitForFunction(() => document.querySelector("#view-title").textContent === "All sessions");
    const snapshot = await send("snapshot");
    assert.equal(snapshot.folders.length, 0);
    assert.equal(snapshot.sessions.find((session) => session.id === firstId).folderId, null);
  });

  await check("Card/list preference persists and archive totals use live records rather than search results", async () => {
    const snapshot = await send("snapshot");
    const live = snapshot.sessions.filter((session) => !session.deletedAt);
    const tabs = live.reduce((total, session) => total + session.tabs.length, 0);
    assert.equal(await page.locator("#metric-tabs").textContent(), String(tabs));
    assert.equal(await page.locator("#metric-sessions").textContent(), String(live.length));
    assert.equal(await page.locator("#metric-folders").textContent(), String(snapshot.folders.length));
    await page.locator('button[data-layout="list"]').click();
    await page.waitForFunction(() => document.body.dataset.layout === "list");
    await page.reload();
    await page.waitForFunction(() => document.body.dataset.layout === "list");
    assert.equal((await send("snapshot")).settings.layout, "list");
    assert.equal(await page.locator('button[data-layout="list"]').getAttribute("aria-pressed"), "true");
    await page.locator("#search").fill("no-matches-for-this-query");
    assert.equal(await page.locator(".session-card").count(), 0);
    assert.equal(await page.locator("#metric-tabs").textContent(), String(tabs));
    await page.locator("#search").fill("");
    await page.locator('button[data-layout="grid"]').click();
    await page.waitForFunction(() => document.body.dataset.layout === "grid");
    assert.equal(await page.locator("#sessions").evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length), 2);
  });

  await check("Legacy backups still import into the rebranded extension", async () => {
    const before = await send("snapshot");
    const session = structuredClone(before.sessions[0]);
    session.id = "legacy-compatibility-check";
    session.folderId = null;
    session.title = "TabDock user title — preserve exactly";
    const imported = await send("import", { kind: "json", data: { format: "tabdock-backup", version: 1, folders: [], sessions: [session] } });
    assert.equal(imported.imported, 1);
    assert.equal((await send("snapshot")).sessions.find((item) => item.id === session.id).title, session.title);
    await send("session:trash", { id: session.id });
    await send("session:delete", { id: session.id });
  });

  const beforeLanguages = await send("snapshot");
  for (const { code } of LANGUAGES) {
    await check(`Language ${code}: saved UI selection, labels, dates, errors, toolbar and responsive layout`, async () => {
      await page.locator("#settings-button").click();
      await page.locator("#language").selectOption(code);
      await page.locator("#settings-form button[type=submit]").click();
      await page.waitForFunction((language) => document.documentElement.lang === language, code);
      assert.equal((await send("snapshot")).settings.language, code);
      assert.equal(await page.title(), CATALOGS[code].app_title);
      const strings = await page.evaluate(() => ({
        text: [...document.querySelectorAll("[data-i18n]")].map((node) => [node.dataset.i18n, node.textContent]),
        labels: [...document.querySelectorAll("[data-i18n-label]")].map((node) => [node.dataset.i18nLabel, node.getAttribute("aria-label")]),
        placeholders: [...document.querySelectorAll("[data-i18n-placeholder]")].map((node) => [node.dataset.i18nPlaceholder, node.placeholder]),
      }));
      for (const [key, text] of [...strings.text, ...strings.labels, ...strings.placeholders]) assert.equal(text, translate(code, key), `${code}.${key}`);
      assert.equal(await page.evaluate(() => chrome.action.getTitle({})), CATALOGS[code].toolbar_title);
      const snapshot = await send("snapshot");
      assert.deepEqual(snapshot.sessions, beforeLanguages.sessions, "Language change must not rewrite session names, notes or URLs");
      const browserDateText = await page.locator(`[data-session-id="${firstId}"] time`).textContent();
      // Use the browser's time zone for an exact comparison, independently of the host locale.
      const expectedDate = await page.evaluate(({ date, locale }) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(date)), { date: snapshot.sessions.find((session) => session.id === firstId).createdAt, locale: localeFor(code) });
      assert.equal(browserDateText, expectedDate);
      assert.equal(await page.locator("#notice-text").textContent(), translateNotice(code, snapshot.notice));

      await page.locator("#backup-button").click();
      await page.locator("#import-kind").selectOption("onetab");
      await page.locator("#import-file").setInputFiles({ name: "invalid.txt", mimeType: "text/plain", buffer: Buffer.from("https://example.com | Valid\njavascript:alert(1) | Bad") });
      const expectedError = translate(code, "onetab_invalid", { group: 1, line: 2 });
      await page.locator("#backup-dialog #toast").filter({ hasText: expectedError }).waitFor();
      assert.equal((await send("snapshot")).sessions.length, beforeLanguages.sessions.length);
      await page.screenshot({ path: path.join(output, `import-error-${code}.png`) });
      await page.locator("#backup-dialog [data-close]").click();
      await page.locator("#toast").evaluate((node) => { node.hidden = true; });

      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${code}: overflow at ${width}`);
        await page.locator("#settings-button").click();
        assert.equal(await page.locator("#language").inputValue(), code);
        assert.equal(await page.locator("#settings-dialog").evaluate((dialog) => dialog.scrollWidth > dialog.clientWidth), false, `${code}: dialog overflow at ${width}`);
        if (width === 390) await page.screenshot({ path: path.join(output, `settings-${code}-mobile.png`) });
        await page.locator("#settings-dialog .icon-button[data-close]").click();
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
    });
  }

  const beforeLanguageRestart = await send("snapshot");
  await context.close();
  await launch();
  await check("Chosen language survives a full browser restart and translations sync across archive tabs", async () => {
    const snapshot = await send("snapshot");
    assert.equal(snapshot.settings.language, "es");
    assert.deepEqual(snapshot.sessions, beforeLanguageRestart.sessions);
    assert.equal(await page.locator("#settings-button").innerText(), CATALOGS.es.settings);
    const second = await context.newPage();
    await second.goto(managerUrl);
    await second.waitForFunction(() => document.documentElement.lang === "es");
    await page.locator("#settings-button").click();
    await page.locator("#language").selectOption("tr");
    await page.locator("#settings-form button[type=submit]").click();
    await second.waitForFunction(() => document.documentElement.lang === "tr");
    assert.equal(await second.locator("#settings-button").innerText(), CATALOGS.tr.settings);
    await second.close();
  });

  await check("v1.0 settings migrate to English without changing archives or retaining Turkish notices", async () => {
    const before = await send("snapshot");
    await page.evaluate(async () => {
      const { database } = await import("./database.js");
      await database.putMeta("settings", { includePinned: true, scope: "current", theme: "light" });
      await database.putMeta("notice", { kind: "success", text: "Eski Türkçe bildirim", at: Date.now() });
    });
    await page.reload();
    await page.waitForFunction(() => document.documentElement.lang === "en" && document.querySelector("#view-description").textContent.includes(" · "));
    const after = await send("snapshot");
    assert.deepEqual(after.settings, { includePinned: true, scope: "current", theme: "light", language: "en", layout: "grid" });
    assert.deepEqual(after.sessions, before.sessions);
    assert.equal(after.notice, null);
    assert.equal(await page.locator("#notice").isVisible(), false);
  });

  // Add local-only sample records for the final screenshot; never ship them in the extension.
  const demo = JSON.parse(await readFile(path.join(root, "tests", "demo-backup.json"), "utf8"));
  await send("import", { kind: "json", data: demo });
  await send("settings", { value: { includePinned: false, scope: "all", theme: "dark", language: "en", layout: "grid" } });
  await send("notice:clear");
  for (const session of (await send("snapshot")).sessions.filter((item) => !item.id.startsWith("demo-"))) {
    await send("session:trash", { id: session.id });
    await send("session:delete", { id: session.id });
  }
  await page.locator("#search").fill("");
  await page.locator("#toast").evaluate((node) => { node.hidden = true; });
  await page.screenshot({ path: path.join(output, "preview.png"), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: path.join(output, "store-overview.png") });
  await page.locator('button[data-layout="list"]').click();
  await page.waitForFunction(() => document.body.dataset.layout === "list");
  await page.locator("#search").fill("database");
  await page.screenshot({ path: path.join(output, "store-search.png") });
  await page.locator("#search").fill("");
  await page.locator('button[data-layout="grid"]').click();
  await page.waitForFunction(() => document.body.dataset.layout === "grid");
  await page.locator("#settings-button").click();
  await page.screenshot({ path: path.join(output, "store-settings.png") });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: path.join(output, "languages.png") });
  await page.locator("#settings-dialog .icon-button[data-close]").click();
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.screenshot({ path: path.join(output, "preview-mobile.png"), fullPage: true });
  assert.deepEqual(errors, [], `Unexpected JavaScript errors: ${errors.join("; ")}`);
  await writeFile(path.join(output, "browser-report.json"), JSON.stringify({ passed: checks.length, checks, errors, browser: context.browser()?.version(), profile, testedAt: new Date().toISOString() }, null, 2));
  console.log(`\n${checks.length} browser checks passed. Screenshots and report: ${output}`);
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
  await writeFile(path.join(output, "browser-report.json"), JSON.stringify({ passed: checks.length, checks, errors, failure: error.stack, profile }, null, 2));
  throw error;
} finally {
  if (context) await context.close();
  await new Promise((resolve) => server.close(resolve));
}
