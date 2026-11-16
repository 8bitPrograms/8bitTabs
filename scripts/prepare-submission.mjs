import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const listing = JSON.parse(await readFile(new URL("store/listing.json", root), "utf8"));
const manifest = JSON.parse(await readFile(new URL("extension/manifest.json", root), "utf8"));
const messages = JSON.parse(await readFile(new URL("extension/_locales/en/messages.json", root), "utf8"));
const destination = new URL("store/submission/", root);
await mkdir(destination, { recursive: true });
assert.equal(listing.version, manifest.version);
assert.equal(listing.defaultLanguage, "en");
for (const key of ["sourceUrl", "supportUrl", "privacyPolicyUrl"]) assert.equal(new URL(listing[key]).protocol, "https:");

const languages = { en: "English", tr: "Türkçe", de: "Deutsch", fr: "Français", es: "Español" };
const fields = [
  { id: "single-purpose", label: "Single purpose description", value: listing.singlePurpose, limit: 1000 },
  { id: "tabs-justification", label: "tabs justification", value: listing.permissionJustifications.tabs, limit: 1000 },
  { id: "unlimitedStorage-justification", label: "unlimitedStorage justification", value: listing.permissionJustifications.unlimitedStorage, limit: 1000 },
  { id: "review-instructions", label: "Additional instructions", value: listing.testInstructions, limit: 500 },
];
for (const field of fields) {
  assert.ok(field.value.length > 0 && field.value.length <= field.limit, `${field.label} exceeds the store limit`);
  await writeFile(new URL(`${field.id}.en.txt`, destination), field.value + "\n");
}
for (const code of Object.keys(languages)) {
  const description = listing.locales[code].description;
  assert.ok(description.length > 0 && description.length <= 16000, `${code} description exceeds the store limit`);
  await writeFile(new URL(`description.${code}.txt`, destination), description + "\n");
}

const release = `${listing.sourceUrl}/releases/download/v${listing.version}`;
const installZip = `${release}/8bitTabs-${listing.version}-chromium.zip`;
const codeBlock = (value) => "```text\n" + value + "\n```";
const markdown = [
  `# 8bitTabs ${listing.version} — Chrome Web Store alanları`,
  "Bu rehber, gönderilen sekiz ekranın sırasını izler. Kutuların içindeki İngilizce metinleri ilgili alana yapıştır. Eklentinin varsayılan dili İngilizcedir.",
  "Yerelde `fill-form.html` dosyasını açarsan her metni yanındaki **Kopyala** düğmesiyle alabilirsin. Bu yardımcı sayfa hesap veya ağ bağlantısı kullanmaz.",
  "## 1. Store listing / Product details",
  "| Alan | Değer |\n| --- | --- |\n| Language | English — en (default) |\n| Title from package | " + manifest.name + " |\n| Summary from package | Paketten gelir; ayrıca girilmez. |\n| Category | " + listing.category + " |",
  "**Description — English**",
  codeBlock(listing.locales.en.description),
  "Diğer mağaza dilleri için üstteki Language menüsünü değiştirip ilgili dosyayı Description alanına yapıştır:\n\n" + Object.entries(languages).map(([code, name]) => `- [${name} — description.${code}.txt](description.${code}.txt)`).join("\n"),
  "## 2. Graphic assets",
  "| Alan | Yüklenecek dosya |\n| --- | --- |\n| Store icon | [icon128.png](../icon128.png) — 128×128; saydam kenar boşluğu var. |\n| Global screenshots | Aşağıdaki üç ekran görüntüsü. |\n| Small promo tile | [small-promo.png](../small-promo.png) — 440×280. |\n| Marquee promo tile | [marquee-promo.png](../marquee-promo.png) — 1400×560; isteğe bağlı. |",
  "Global screenshots sırası:\n\n1. [01-archive.png](../screenshots/01-archive.png)\n2. [02-search.png](../screenshots/02-search.png)\n3. [03-settings.png](../screenshots/03-settings.png)",
  "Üç ekran görüntüsü 1280×800 boyutundadır. Ekran görüntüleri ve tanıtım görselleri 24 bit RGB PNG olarak hazırlanır. Localized screenshots alanını boş bırakabilirsin; genel görseller kullanılır. Localized promo video ve Global promo video alanları da boş kalabilir.",
  "## 3. Additional fields / Item support",
  "| Alan | Değer |\n| --- | --- |\n| Official URL | Boş bırak; doğrulanmış bir alan adı yok. |\n| Homepage URL | " + listing.sourceUrl + " |\n| Support URL | " + listing.supportUrl + " |\n| Mature content | Kapalı |\n| Item support | Açık; destek bağlantısı yukarıdaki Issues sayfası. |",
  "## 4. Privacy / Single purpose ve izinler",
  ...fields.slice(0, 3).flatMap((field) => [`**${field.label}**`, codeBlock(field.value)]),
  "Remote code sorusu görünürse **No, I am not using remote code** seç.",
  "## 5. Data usage / Privacy policy",
  "Veri türlerinden **yalnızca Web history** kutusunu işaretle. Sekme adresi, başlığı ve arşiv tarihi cihazda saklanır. Bu beyan tarayıcının geçmiş veritabanına erişildiği anlamına gelmez. Diğer veri türleri bu sürümün özellikleri için işaretlenmez; sayfa içeriği okunmaz, hesap veya kimlik bilgisi toplanmaz.",
  "Google'ın yerel veri işleme açıklaması: [User Data FAQ, soru 3](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq). Yalnızca cihazda saklamak, veri işlemenin gizlilik beyanından çıkarılması anlamına gelmez.",
  "Altındaki üç sertifika/onay kutusunun **üçünü de işaretle**: üçüncü kişilere satış veya aktarım yok; tek amaç dışı kullanım yok; kredi değerliliği veya kredi verme için kullanım yok.",
  "**Privacy policy URL**",
  codeBlock(listing.privacyPolicyUrl),
  "## 6. Test instructions",
  "Username ve Password alanlarını **boş bırak**. Giriş, hesap, abonelik veya test kimliği gerekmiyor.",
  "**Additional instructions** — 500 karakter sınırına uygun:",
  codeBlock(listing.testInstructions),
  "## 7. Distribution",
  "| Alan | Değer |\n| --- | --- |\n| Payments | Free of charge |\n| Visibility | Public |\n| Grup seçimi | None |\n| Distribution | All regions; All unlisted regions dahil |",
  "## 8. Package",
  `Mağaza panelindeki Package bölümünde **Upload new package** ile [8bitTabs-${listing.version}-chromium.zip](${installZip}) dosyasını yükle. Kaynak kod veya store-assets ZIP'ini eklenti paketi olarak yükleme. Sürüm ${listing.version}, izinler yalnızca tabs ve unlimitedStorage olmalı.`,
  "**Verified CRX uploads** isteğe bağlıdır. İmza anahtarını ve yedekleme sürecini ayrıca hazırlamadan Opt in yapma; bu seçenek etkinleştikten sonra güncellemelerin ilgili özel anahtarla imzalanması gerekir.",
  "Yayıncı hesabındaki iletişim e-postası doğrulaması ve trader/non-trader seçimi, hesap sahibinin gerçek durumuna göre tamamlanır. Burada e-posta veya kişisel bilgi uydurulmamıştır. Mağazaya incelemeye gönderme işlemini sen tamamlayacaksın.",
  "## Bağlantılar ve dayanaklar",
  `- [Kaynak kod](${listing.sourceUrl})\n- [Destek](${listing.supportUrl})\n- [Gizlilik bildirimi](${listing.privacyPolicyUrl})\n- [Güncel sürümler](${listing.sourceUrl}/releases)\n- [Mağaza alanları ve dil seçenekleri](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)\n- [Görsel gereklilikleri](https://developer.chrome.com/docs/webstore/images)\n- [Gizlilik alanları](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)\n- [Yerel veri işleme beyanı](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)\n- [Kategoriler](https://developer.chrome.com/docs/webstore/best-practices)\n- [Dağıtım](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)\n- [Verified CRX uploads](https://developer.chrome.com/docs/webstore/update)`,
];
await writeFile(new URL("README.tr.md", destination), markdown.join("\n\n") + "\n");

const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
function field(id, label, value, limit, rows = 4) {
  return `<article class="field"><div class="field-label"><label for="${id}">${escape(label)}</label><button type="button" data-copy="${id}">Kopyala</button></div><textarea id="${id}" readonly rows="${rows}">${escape(value)}</textarea>${limit ? `<small id="${id}-count">${value.length} / ${limit}</small>` : ""}</article>`;
}
const urlField = (id, label, value) => field(id, label, value, 2048, 2);
const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>8bitTabs · Mağaza alanları</title>
<style>
:root{color-scheme:dark;--bg:#101419;--panel:#141a21;--text:#edf2f7;--muted:#abb7c5;--line:#303c4a;--accent:#f5b544}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 system-ui,sans-serif}main{max-width:960px;margin:auto;padding:32px 22px 64px}a{color:var(--accent);overflow-wrap:anywhere}h1{font-size:30px;line-height:1.2}h2{font-size:21px;margin:36px 0 16px}h3{font-size:17px}p,li{max-width:80ch}header.brand{display:flex;gap:16px;align-items:center}header.brand img{width:64px;height:64px;image-rendering:pixelated}.brand p{margin:0;color:var(--muted)}nav{display:flex;gap:10px 20px;flex-wrap:wrap;margin:24px 0;border-bottom:1px solid var(--line);padding-bottom:20px}.field{margin:20px 0}.field-label{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-bottom:8px}label{font-weight:650}button,select{font:inherit;border:1px solid var(--line);padding:8px 14px;min-height:44px;border-radius:5px;background:var(--panel);color:var(--text)}button{cursor:pointer;color:var(--accent)}button:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:3px}textarea{display:block;resize:vertical;width:100%;font:15px/1.6 system-ui,sans-serif;padding:14px;background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:5px;min-height:70px}small{color:var(--muted)}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{text-align:left;vertical-align:top;padding:12px 8px;border-bottom:1px solid var(--line);overflow-wrap:anywhere}th:first-child,td:first-child{width:32%}.note{border-left:3px solid var(--accent);padding-left:16px}#copy-status{min-height:26px;color:var(--accent)}.languages{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.tag{color:var(--accent)}@media(max-width:480px){main{padding:24px 16px}h1{font-size:25px}th,td{padding:10px 5px}.field-label{align-items:flex-start}button{flex-shrink:0}textarea{font-size:16px}}
</style></head><body><main>
<header class="brand"><img src="../icon128.png" alt="8bitTabs arşiv ikonu"><div><p>8bitPrograms · ${escape(listing.version)}</p><h1>Chrome Web Store alanları</h1></div></header>
<p>Ekran sırasına göre ilerle. İngilizce metinleri <strong>Kopyala</strong> düğmesiyle alıp mağazadaki ilgili alana yapıştır. Bu sayfa yalnızca hazırlık içindir; mağazada işlem yapmaz.</p>
<nav aria-label="Bölümler">${["Listing", "Görseller", "Bağlantılar", "İzinler", "Gizlilik", "Test", "Dağıtım", "Paket"].map((label, i) => `<a href="#step-${i + 1}">${i + 1}. ${label}</a>`).join("")}</nav><p id="copy-status" role="status" aria-live="polite"></p>
<section id="step-1"><h2>1. Store listing / Product details</h2><p><strong>Language:</strong> English — en (default). <strong>Category:</strong> ${escape(listing.category)}.</p><p><strong>Title from package:</strong> ${escape(manifest.name)}<br><strong>Summary from package:</strong> ${escape(messages.appDescription.message)}</p>
<div class="languages"><label for="description-language">Description dili</label><select id="description-language">${Object.entries(languages).map(([code, name]) => `<option value="${code}">${escape(name)}</option>`).join("")}</select></div>${field("description", "Description — English", listing.locales.en.description, 16000, 23)}<p>Diğer mağaza dillerini eklerken mağazanın Language menüsünü de aynı dile getir. Eklentinin varsayılanı İngilizce kalır.</p></section>
<section id="step-2"><h2>2. Graphic assets</h2><table><tbody><tr><th>Store icon</th><td><a href="../icon128.png" download>icon128.png</a> · 128×128, saydam kenar boşluğu</td></tr><tr><th>Global screenshots</th><td><a href="../screenshots/01-archive.png" download>01-archive.png</a><br><a href="../screenshots/02-search.png" download>02-search.png</a><br><a href="../screenshots/03-settings.png" download>03-settings.png</a><br>Her biri 1280×800; bu sırayla yükle.</td></tr><tr><th>Small promo tile</th><td><a href="../small-promo.png" download>small-promo.png</a> · 440×280</td></tr><tr><th>Marquee promo tile</th><td><a href="../marquee-promo.png" download>marquee-promo.png</a> · 1400×560, isteğe bağlı</td></tr></tbody></table><p>Localized screenshots ve iki promo video alanını boş bırakabilirsin. Genel ekran görüntüleri kullanılır. Ekran ve tanıtım görselleri 24 bit RGB PNG olarak hazırlanır.</p></section>
<section id="step-3"><h2>3. Additional fields / Item support</h2><p><strong>Official URL:</strong> boş bırak. <strong>Mature content:</strong> kapalı. <strong>Item support:</strong> açık.</p>${urlField("homepage", "Homepage URL", listing.sourceUrl)}${urlField("support", "Support URL", listing.supportUrl)}</section>
<section id="step-4"><h2>4. Privacy / Single purpose ve izinler</h2>${fields.slice(0, 3).map((f) => field(f.id, f.label, f.value, f.limit)).join("")}<p><strong>Remote code:</strong> No, I am not using remote code.</p></section>
<section id="step-5"><h2>5. Data usage / Privacy policy</h2><p class="note">Veri türlerinden <strong>yalnızca Web history</strong> işaretlenir. Sekme adresleri, başlıkları ve arşiv zamanı cihazda saklanır. Tarayıcının geçmiş veritabanı veya sayfa içeriği okunmaz.</p><p>Diğer veri türleri boş kalır. Altındaki üç veri kullanımı onayının <strong>üçünü de işaretle</strong>: satış/üçüncü kişiye aktarım yok; tek amaç dışı kullanım yok; kredi değerlendirme veya kredi verme için kullanım yok.</p><p>Yerel veri işleme de beyan edilir: <a href="https://developer.chrome.com/docs/webstore/program-policies/user-data-faq">Google User Data FAQ, soru 3</a>.</p>${urlField("privacy", "Privacy policy URL", listing.privacyPolicyUrl)}</section>
<section id="step-6"><h2>6. Test instructions</h2><p><strong>Username ve Password:</strong> boş bırak. Hesap, giriş veya abonelik gerekmiyor.</p>${field("review-instructions", "Additional instructions", listing.testInstructions, 500, 8)}</section>
<section id="step-7"><h2>7. Distribution</h2><table><tbody><tr><th>Payments</th><td>Free of charge</td></tr><tr><th>Visibility</th><td>Public</td></tr><tr><th>Grup</th><td>None</td></tr><tr><th>Distribution</th><td>All regions; All unlisted regions dahil</td></tr></tbody></table></section>
<section id="step-8"><h2>8. Package</h2><p>Mağaza panelindeki Package bölümünde <strong>Upload new package</strong> ile <a href="${installZip}">8bitTabs-${listing.version}-chromium.zip</a> yükle. Sürüm <strong>${listing.version}</strong>; izinler <strong>tabs, unlimitedStorage</strong> olmalı.</p><p>Verified CRX uploads isteğe bağlıdır. İmza anahtarını ve yedeğini ayrıca hazırlamadan Opt in yapma; etkinleştirdikten sonra güncellemelerin o anahtarla imzalanması gerekir.</p><p>Yayıncı hesabının e-posta doğrulamasını ve trader/non-trader seçimini kendi gerçek durumuna göre tamamla. Mağazaya incelemeye gönderme işlemini sen yapacaksın.</p></section>
<footer><h2>Kaynaklar</h2><p><a href="README.tr.md">Aynı rehberin metin sürümü</a> · <a href="${listing.sourceUrl}">GitHub</a> · <a href="https://developer.chrome.com/docs/webstore/cws-dashboard-listing">Mağaza alanları</a> · <a href="https://developer.chrome.com/docs/webstore/images">Görseller</a> · <a href="https://developer.chrome.com/docs/webstore/best-practices">Kategoriler</a> · <a href="https://developer.chrome.com/docs/webstore/update">İmzalı yüklemeler</a></p></footer>
</main><script>
const descriptions=${JSON.stringify(Object.fromEntries(Object.entries(listing.locales).map(([code, locale]) => [code, locale.description]))).replaceAll("<", "\\u003c")};
const languageNames=${JSON.stringify(languages)};
const selector=document.getElementById("description-language");
selector.addEventListener("change",()=>{const value=descriptions[selector.value];document.getElementById("description").value=value;document.querySelector('label[for="description"]').textContent="Description — "+languageNames[selector.value];document.getElementById("description-count").textContent=value.length+" / 16000";});
document.querySelectorAll("button[data-copy]").forEach(button=>button.addEventListener("click",async()=>{const target=document.getElementById(button.dataset.copy);const status=document.getElementById("copy-status");try{await navigator.clipboard.writeText(target.value);}catch{target.focus();target.select();if(!document.execCommand("copy")){status.textContent="Metin seçildi. Ctrl+C ile kopyalayabilirsin.";return;}}status.textContent=document.querySelector('label[for="'+target.id+'"]').textContent+" kopyalandı.";button.textContent="Kopyalandı";setTimeout(()=>button.textContent="Kopyala",1500);}));
</script></body></html>`;
await writeFile(new URL("fill-form.html", destination), html + "\n");
console.log(`Prepared ${Object.keys(languages).length} descriptions, ${fields.length} review fields, and the eight-screen store guide for ${listing.version}.`);
