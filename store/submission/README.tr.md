# 8bitTabs 1.3.0 — Chrome Web Store alanları

Bu rehber, gönderilen sekiz ekranın sırasını izler. Kutuların içindeki İngilizce metinleri ilgili alana yapıştır. Eklentinin varsayılan dili İngilizcedir.

Yerelde `fill-form.html` dosyasını açarsan her metni yanındaki **Kopyala** düğmesiyle alabilirsin. Bu yardımcı sayfa hesap veya ağ bağlantısı kullanmaz.

## 1. Store listing / Product details

| Alan | Değer |
| --- | --- |
| Language | English — en (default) |
| Title from package | 8bitTabs — Private Tab Archive |
| Summary from package | Paketten gelir; ayrıca girilmez. |
| Category | Workflow & Planning |

**Description — English**

```text
Save your tabs. Clear your browser. Come back when you're ready.

8bitTabs saves your open tabs into dated sessions and closes them with one click. Pinned tabs stay open by default; you can include them in Settings.

Optional cleanup closes empty and internal tabs, including Vivaldi's Start Page, without adding them to the archive. It is off by default. Pinned-tab protection and window scope still apply.

YOUR ARCHIVE, YOUR WAY
• Search tab titles, URLs, session names, notes and folders.
• Name sessions, add notes, star favorites and organize folders.
• Switch between cards and a compact list.
• Open a single link, a whole session, or the original window partitions. Restoring keeps the archive copy.
• Recover deleted sessions from Trash. Permanent deletion asks for confirmation.

LOCAL BY DESIGN
No account, cloud sync, analytics, ads, remote code or external favicon service. Tabs are saved to a local database and verified before they are closed. The extension does not read page content or your browsing-history database.

KEEP A COPY
Export JSON backups, merge an existing backup or import OneTab text exports. Backups are not encrypted.

ENGLISH BY DEFAULT
Choose English, Turkish, German, French or Spanish. Dark, light and system themes are included.

The toolbar icon saves and closes tabs. To browse your archive without closing anything, use Alt+Shift+O or right-click the extension and choose Options.

Only URLs, titles and tab metadata are archived. Form data, page content, page navigation history and browser tab groups are not saved. Private windows and third-party extension pages stay untouched.

Open source under the GPL-3.0 license.
```

Diğer mağaza dilleri için üstteki Language menüsünü değiştirip ilgili dosyayı Description alanına yapıştır:

- [English — description.en.txt](description.en.txt)
- [Türkçe — description.tr.txt](description.tr.txt)
- [Deutsch — description.de.txt](description.de.txt)
- [Français — description.fr.txt](description.fr.txt)
- [Español — description.es.txt](description.es.txt)

## 2. Graphic assets

| Alan | Yüklenecek dosya |
| --- | --- |
| Store icon | [icon128.png](../icon128.png) — 128×128; saydam kenar boşluğu var. |
| Global screenshots | Aşağıdaki üç ekran görüntüsü. |
| Small promo tile | [small-promo.png](../small-promo.png) — 440×280. |
| Marquee promo tile | [marquee-promo.png](../marquee-promo.png) — 1400×560; isteğe bağlı. |

Global screenshots sırası:

1. [01-archive.png](../screenshots/01-archive.png)
2. [02-search.png](../screenshots/02-search.png)
3. [03-settings.png](../screenshots/03-settings.png)

Üç ekran görüntüsü 1280×800 boyutundadır. Ekran görüntüleri ve tanıtım görselleri 24 bit RGB PNG olarak hazırlanır. Localized screenshots alanını boş bırakabilirsin; genel görseller kullanılır. Localized promo video ve Global promo video alanları da boş kalabilir.

## 3. Additional fields / Item support

| Alan | Değer |
| --- | --- |
| Official URL | Boş bırak; doğrulanmış bir alan adı yok. |
| Homepage URL | https://github.com/8bitPrograms/8bitTabs |
| Support URL | https://github.com/8bitPrograms/8bitTabs/issues |
| Mature content | Kapalı |
| Item support | Açık; destek bağlantısı yukarıdaki Issues sayfası. |

## 4. Privacy / Single purpose ve izinler

**Single purpose description**

```text
Save browser tabs into searchable local sessions, close the archived tabs, and restore saved links on request.
```

**tabs justification**

```text
Read tab URLs, titles, window order, pin and mute state for the user's archive action. Ordinary tabs are saved and verified locally before closing. A separate, disabled-by-default setting closes empty and internal browser pages without archiving them, respecting pinned-tab and window settings. No page content or browsing-history database is read.
```

**unlimitedStorage justification**

```text
Keep the local IndexedDB archive available as it grows, without the normal storage quota or automatic eviction limits. The archive contains user-created sessions, folders and notes; nothing is uploaded.
```

Remote code sorusu görünürse **No, I am not using remote code** seç.

## 5. Data usage / Privacy policy

Veri türlerinden **yalnızca Web history** kutusunu işaretle. Sekme adresi, başlığı ve arşiv tarihi cihazda saklanır. Bu beyan tarayıcının geçmiş veritabanına erişildiği anlamına gelmez. Diğer veri türleri bu sürümün özellikleri için işaretlenmez; sayfa içeriği okunmaz, hesap veya kimlik bilgisi toplanmaz.

Google'ın yerel veri işleme açıklaması: [User Data FAQ, soru 3](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq). Yalnızca cihazda saklamak, veri işlemenin gizlilik beyanından çıkarılması anlamına gelmez.

Altındaki üç sertifika/onay kutusunun **üçünü de işaretle**: üçüncü kişilere satış veya aktarım yok; tek amaç dışı kullanım yok; kredi değerliliği veya kredi verme için kullanım yok.

**Privacy policy URL**

```text
https://github.com/8bitPrograms/8bitTabs/blob/main/PRIVACY.md
```

## 6. Test instructions

Username ve Password alanlarını **boş bırak**. Giriş, hesap, abonelik veya test kimliği gerekmiyor.

**Additional instructions** — 500 karakter sınırına uygun:

```text
No login is required. Use a clean test profile. Open a web page, a blank tab and a browser settings tab; pin another web page. Click the icon: normal tabs are saved and closed; pinned and internal tabs stay open. In Settings, enable Close empty and internal tabs too, then repeat: internal tabs close without being saved. Enable Archive pinned tabs too to include pinned tabs. Search and restore a session; export/import JSON to check backups. Alt+Shift+O opens the archive.
```

## 7. Distribution

| Alan | Değer |
| --- | --- |
| Payments | Free of charge |
| Visibility | Public |
| Grup seçimi | None |
| Distribution | All regions; All unlisted regions dahil |

## 8. Package

Mağaza panelindeki Package bölümünde **Upload new package** ile [8bitTabs-1.3.0-chromium.zip](https://github.com/8bitPrograms/8bitTabs/releases/download/v1.3.0/8bitTabs-1.3.0-chromium.zip) dosyasını yükle. Kaynak kod veya store-assets ZIP'ini eklenti paketi olarak yükleme. Sürüm 1.3.0, izinler yalnızca tabs ve unlimitedStorage olmalı.

**Verified CRX uploads** isteğe bağlıdır. İmza anahtarını ve yedekleme sürecini ayrıca hazırlamadan Opt in yapma; bu seçenek etkinleştikten sonra güncellemelerin ilgili özel anahtarla imzalanması gerekir.

Yayıncı hesabındaki iletişim e-postası doğrulaması ve trader/non-trader seçimi, hesap sahibinin gerçek durumuna göre tamamlanır. Burada e-posta veya kişisel bilgi uydurulmamıştır. Mağazaya incelemeye gönderme işlemini sen tamamlayacaksın.

## Bağlantılar ve dayanaklar

- [Kaynak kod](https://github.com/8bitPrograms/8bitTabs)
- [Destek](https://github.com/8bitPrograms/8bitTabs/issues)
- [Gizlilik bildirimi](https://github.com/8bitPrograms/8bitTabs/blob/main/PRIVACY.md)
- [Güncel sürümler](https://github.com/8bitPrograms/8bitTabs/releases)
- [Mağaza alanları ve dil seçenekleri](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Görsel gereklilikleri](https://developer.chrome.com/docs/webstore/images)
- [Gizlilik alanları](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Yerel veri işleme beyanı](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Kategoriler](https://developer.chrome.com/docs/webstore/best-practices)
- [Dağıtım](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)
- [Verified CRX uploads](https://developer.chrome.com/docs/webstore/update)
