# 8bitTabs kurulumu

Bu sürüm mağazaya gönderilmemiştir. Hazır paket veya kaynak klasörü üzerinden yüklenir.

## Kaynak klasöründen

1. Kullandığın Chromium tarayıcısında eklentiler sayfasını aç:
   - Brave: `brave://extensions`
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
2. **Geliştirici modu**nu etkinleştir.
3. **Paketlenmemiş öğe yükle / Load unpacked** düğmesine bas.
4. Kaynak projedeki `extension` klasörünü seç.
5. Eklentiler menüsünden 8bitTabs'u araç çubuğuna sabitle.

Bu bilgisayarda kurulum için seçilecek dosya değil, `manifest.json` dosyasını içeren **klasördür**.

## ZIP paketinden

1. `8bitTabs-1.2.1-chromium.zip` dosyasını kalıcı bir klasöre çıkar.
2. Yukarıdaki eklentiler sayfasında, ZIP'ten çıkan ve `manifest.json` içeren klasörü yükle.
3. Yüklediğin klasörü taşıma veya silme; tarayıcı eklenti dosyalarını oradan okur.

`8bitTabs-1.2.1-source.zip` geliştirici kaynakları, testler ve belgeleri de içerir. Bu paketi açtıysan yüklemek için içindeki `extension` alt klasörünü seç.

## İlk kullanım

Arayüz varsayılan olarak **İngilizce** açılır. Türkçe için **Settings → Language → Türkçe → Save settings** yolunu izle. İngilizce, Türkçe, Almanca, Fransızca ve İspanyolca desteklenir. Dil tercihi kaydedilir. Aşağıdaki arayüz adları Türkçe seçildikten sonraki adlardır.

- **Simgeye tıkla:** Tüm normal pencerelerdeki uygun sekmeler tarihli oturum olarak kaydolur ve kapanır. Sabitlenmişler açık kalır.
- **Sadece arşive bak:** `Alt+Shift+O` veya simgeye sağ tık → **Seçenekler**. Kısayol çakışırsa eklentilerin klavye kısayolları sayfasından değiştir.
- **Sabitlenmişleri de dahil et:** Arşiv → **Ayarlar** → **Sabitlenmiş sekmeleri de arşivle**.
- **Sadece tek pencere:** Arşiv → **Ayarlar** → **Arşivleme kapsamı** → **Yalnızca bulunduğum pencere**.
- **Yedek:** **Yedekle ve içe aktar** → **JSON yedeği indir**.

Arşiv bir adres listesidir. Form verileri ve sayfa geçmişi saklanmaz. Eklentiyi kaldırmadan veya profili silmeden önce yedek al.

## Güncelleme

Önce yedek al. Aynı kurulum klasöründeki eklenti dosyalarını güncelleyip eklentiler sayfasındaki **Yeniden yükle** düğmesine bas. Eklentiyi kaldırıp tekrar kurmak yerine mevcut yüklemeyi yenile; kaynak klasörünü değiştirmek tarayıcının yeni bir eklenti kimliği üretmesine neden olabilir.

1.1.0 güncellemesi mevcut arşivi, oturum adlarını, notları ve sabitlenmiş sekme ayarını korur. Önceki sürümde dil seçimi bulunmadığından arayüz İngilizce açılır; Türkçe ayarlardan seçilebilir.

1.2.0 sürümü 8bitTabs adını ve Pixel Core tasarımını getirir. Üst araç çubuğundan kart veya liste görünümünü seçebilirsin. Eski `tabdock-backup` yedekleri içe alınır; yeni yedekler `8bittabs-backup` biçiminde oluşturulur. Aynı kaynak dizininden yüklediysen eklentiler sayfasından Yeniden yükle'ye bas. Farklı dizine veya mağaza sürümüne geçerken önce JSON yedeği al ve yeni kurulumda içe aktar.

## Kaldırma

JSON yedeğini indirip dosyanın kaydedildiğini kontrol et. Eklentiler sayfasından **Kaldır**'ı seç. Kalıcı yedeği sakla; eklenti kaldırıldığında yerel veriler de silinebilir.
