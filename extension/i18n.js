import en from "./locales/en.js";
import tr from "./locales/tr.js";
import de from "./locales/de.js";
import fr from "./locales/fr.js";
import es from "./locales/es.js";

export const LANGUAGES = Object.freeze([
  { code: "en", name: "English", locale: "en-US" },
  { code: "tr", name: "Türkçe", locale: "tr-TR" },
  { code: "de", name: "Deutsch", locale: "de-DE" },
  { code: "fr", name: "Français", locale: "fr-FR" },
  { code: "es", name: "Español", locale: "es-ES" },
]);
export const CATALOGS = Object.freeze({ en, tr, de, fr, es });
export const normalizeLanguage = (value) => LANGUAGES.some((language) => language.code === value) ? value : "en";
export const localeFor = (value) => LANGUAGES.find((language) => language.code === normalizeLanguage(value)).locale;

export function translate(language, key, params = {}) {
  const code = normalizeLanguage(language);
  const catalog = CATALOGS[code];
  const pluralKey = typeof params.count === "number" ? `${key}_${new Intl.PluralRules(localeFor(code)).select(params.count)}` : key;
  const otherKey = typeof params.count === "number" ? `${key}_other` : key;
  const text = catalog[pluralKey] ?? catalog[otherKey] ?? catalog[key] ?? en[pluralKey] ?? en[otherKey] ?? en[key] ?? `[${key}]`;
  return text.replace(/\{(\w+)\}/gu, (_, name) => {
    const value = params[name];
    if (value && typeof value === "object" && typeof value.key === "string") return translate(code, value.key, value.params);
    return typeof value === "number" ? new Intl.NumberFormat(localeFor(code)).format(value) : String(value ?? "");
  });
}

// A stable key crosses the worker/page boundary; the page chooses its own current language.
export class LocalizedError extends Error {
  constructor(key, params = {}) {
    super(translate("en", key, params));
    this.name = "LocalizedError";
    this.key = key;
    this.params = params;
  }
}

export function translateNotice(language, notice) {
  if (!notice) return "";
  if (notice.key === "archive_summary") {
    const { saved = 0, closed = 0, kept = 0, internalClosed = 0 } = notice.params || {};
    return [saved ? translate(language, "archive_saved", { count: saved }) : "", translate(language, "archive_closed", { count: closed }), internalClosed ? translate(language, "archive_internal_closed", { count: internalClosed }) : "", kept ? translate(language, "archive_not_closed", { count: kept }) : ""].filter(Boolean).join(" ");
  }
  return notice.key ? translate(language, notice.key, notice.params) : notice.text || "";
}
