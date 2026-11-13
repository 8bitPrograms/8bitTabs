import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CATALOGS, LANGUAGES, LocalizedError, localeFor, normalizeLanguage, translate, translateNotice } from "../extension/i18n.js";
import { cleanSettings, DEFAULT_SETTINGS, makeSession, parseOneTab, searchSession, validateBackup } from "../extension/core.js";

test("English is the explicit default for fresh, legacy and invalid language settings", () => {
  assert.equal(DEFAULT_SETTINGS.language, "en");
  assert.deepEqual(cleanSettings({ includePinned: true, scope: "current", theme: "light" }), { includePinned: true, scope: "current", theme: "light", language: "en", layout: "grid" });
  for (const input of [undefined, null, "auto", "xx", "tr-TR", "__proto__", "constructor"]) {
    assert.equal(normalizeLanguage(input), "en");
    assert.equal(translate(input, "settings"), "Settings");
  }
  for (const { code } of LANGUAGES) assert.equal(cleanSettings({ language: code }).language, code);
});

test("Card/list preference is independent of language and retains safe defaults", () => {
  assert.equal(cleanSettings({ language: "tr", layout: "list" }).layout, "list");
  assert.equal(cleanSettings({ layout: "unknown" }).layout, "grid");
  assert.equal(cleanSettings({ layout: "list" }).includePinned, false);
});

test("All five catalogs contain every English message and the same interpolation fields", () => {
  const keys = Object.keys(CATALOGS.en).sort();
  const fields = (text) => [...text.matchAll(/\{(\w+)\}/gu)].map((match) => match[1]).sort();
  assert.deepEqual(LANGUAGES.map((item) => item.code), ["en", "tr", "de", "fr", "es"]);
  for (const { code } of LANGUAGES) {
    assert.deepEqual(Object.keys(CATALOGS[code]).sort(), keys, code);
    for (const key of keys) {
      assert.equal(typeof CATALOGS[code][key], "string", `${code}.${key}`);
      assert.ok(CATALOGS[code][key].trim(), `${code}.${key} is empty`);
      assert.deepEqual(fields(CATALOGS[code][key]), fields(CATALOGS.en[key]), `${code}.${key}`);
    }
  }
});

test("Plural counts and number separators follow the chosen language", () => {
  assert.equal(translate("en", "tab_count", { count: 1 }), "1 tab");
  assert.equal(translate("en", "tab_count", { count: 2 }), "2 tabs");
  assert.equal(translate("tr", "tab_count", { count: 2 }), "2 sekme");
  assert.equal(translate("de", "tab_count", { count: 1000 }), "1.000 Tabs");
  assert.equal(translate("fr", "tab_count", { count: 0 }), "0 onglet");
  for (const code of ["fr", "es"]) assert.ok(!translate(code, "tab_count", { count: 1000000 }).includes("[tab_count]"));
});

test("Nested backup errors are translated completely at the display boundary", () => {
  let error;
  try { validateBackup({ format: "wrong" }); } catch (caught) { error = caught; }
  assert.ok(error instanceof LocalizedError);
  assert.equal(error.key, "invalid_backup");
  const expected = { en: "Invalid backup:", tr: "Geçersiz yedek:", de: "Ungültige Sicherung:", fr: "Sauvegarde invalide", es: "Copia no válida:" };
  for (const { code } of LANGUAGES) {
    const message = translate(code, error.key, error.params);
    assert.ok(message.startsWith(expected[code]), code);
    assert.ok(message.includes(CATALOGS[code].reason_format), code);
    assert.ok(!message.includes("[object Object]"));
  }
});

test("Archive notices can be redisplayed in another language without rewriting saved content", () => {
  const notice = { key: "archive_summary", params: { saved: 2, closed: 1, kept: 1 } };
  const copy = structuredClone(notice);
  assert.ok(translateNotice("en", notice).includes("2 tabs saved"));
  assert.ok(translateNotice("tr", notice).includes("2 sekme yeni"));
  assert.ok(translateNotice("de", notice).includes("2 Tabs"));
  assert.deepEqual(notice, copy);
  assert.equal(translateNotice("es", { key: "no_tabs" }), CATALOGS.es.no_tabs);
});

test("Generated dates and OneTab titles use the saved language, defaulting to English", () => {
  const now = new Date("2026-11-13T12:30:00Z");
  const tab = { id: 1, windowId: 1, index: 0, url: "https://example.com", title: "İş notları" };
  for (const { code } of LANGUAGES) {
    const session = makeSession([tab], { ...DEFAULT_SETTINGS, language: code }, now);
    assert.equal(session.title, new Intl.DateTimeFormat(localeFor(code), { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(now));
    assert.equal(session.tabs[0].title, "İş notları");
    assert.equal(parseOneTab("https://example.com | Örnek", now, code).sessions[0].title, translate(code, "onetab_session", { index: 1 }));
  }
  assert.ok(makeSession([tab], { ...DEFAULT_SETTINGS }, now).title.includes("November"));
});

test("Search handles Turkish, French, German and Spanish text independently of UI language", () => {
  const session = { title: "İş Straße École mañana", notes: "", tabs: [{ title: "Örnek", url: "https://example.com" }] };
  for (const query of ["is", "STRASSE", "ecole", "manana"]) assert.ok(searchSession(session, query).matches, query);
});

test("Every static UI translation key exists and English remains the HTML fallback", async () => {
  const html = await readFile(new URL("../extension/manager.html", import.meta.url), "utf8");
  assert.ok(html.includes('<html lang="en"'));
  for (const match of html.matchAll(/data-i18n(?:-label|-placeholder)?="([^"]+)"/gu)) assert.ok(Object.hasOwn(CATALOGS.en, match[1]), match[1]);
  const manifest = JSON.parse(await readFile(new URL("../extension/manifest.json", import.meta.url), "utf8"));
  assert.equal(manifest.action.default_title, CATALOGS.en.toolbar_title);
  assert.ok(manifest.description.length <= 132);
  assert.equal(manifest.default_locale, "en");
  for (const { code } of LANGUAGES) {
    const messages = JSON.parse(await readFile(new URL(`../extension/_locales/${code}/messages.json`, import.meta.url), "utf8"));
    assert.ok(messages.appDescription.message.length > 0 && messages.appDescription.message.length <= 132, code);
  }
  assert.deepEqual(manifest.permissions, ["tabs", "unlimitedStorage"]);
});
