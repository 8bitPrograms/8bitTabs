# 8bitTabs 1.3.0 doğrulama notları

Tarih: 16 Kasım 2026. Ortam: Windows, Node.js 24.22.1, Playwright 1.62.1, Brave'in Chromium 157.0.8103.79 motoru. Testler kullanıcının kişisel profili yerine proje altında oluşturulan ayrı test profillerinde yapıldı.

## Temel kontroller

47 otomatik kontrol geçti. Önceki 34 kontrolün yanında boş/dahili sekme sınıflandırması, kapalı varsayılan, eski ayarların yükseltilmesi, bildirimler ve güvenli kapatma için 13 kontrol eklendi:

- Varsayılan sabitlenmiş sekme koruması ve tüm pencereler kapsamı.
- Güvenli URL politikası, Türkçe/aksansız arama ve oturum/sekme bağlamının birleşmesi.
- Yinelenen adreslerin korunması, pencere/sekme sırası, bekleyen URL, sabitlenme ve sessize alma verileri.
- JSON gidiş-dönüşü; sürüm, tarih, kimlik, klasör ve adres doğrulaması.
- OneTab BOM/CRLF/boş satır ayrımı; hatalı girişte hiçbir kaydın alınmaması.
- Kalıcı kayıt ve geri okuma doğrulamasının sekme kapatmadan önce gerçekleşmesi.
- Depolama hatası, doğrulama uyuşmazlığı veya arşiv ekranına ulaşılamaması durumunda hiçbir sekmenin kapatılmaması.
- Kayıt sırasında adresi, sabitlenmesi veya penceresi değişen sekmelerin açık tutulması.
- Eşzamanlı tıklama, tek sekme kapatma hatası ve kısmi geri açma hatası.
- Özgün pencere ayrımının korunması, çöp kutusu/geri alma, kalıcı silme koruması.
- Yedek birleştirmede mevcut kayıt ve ayarların korunması; klasör silmenin sekmeleri silmemesi.
- Yeni, eski ve geçersiz dil ayarlarında İngilizce varsayılanı; beş dilin ayarlarda korunması.
- Beş çeviri dosyasındaki tüm mesajların ve yer tutucuların eksiksizliği.
- Tekil/çoğul ifadeler, sayı ayraçları ve Fransızca/İspanyolca çoğul kuralları.
- İç içe yedek doğrulama hatalarının tamamen çevrilmesi.
- Aynı bildirim kaydının veri değiştirmeden farklı dilde görüntülenmesi.
- Otomatik oturum tarihleri ve OneTab başlıklarının seçilen dilde oluşturulması.
- Türkçe, Fransızca, Almanca ve İspanyolca metinlerde aksansız arama.
- Statik arayüzün İngilizce açılması, çeviri anahtarlarının geçerliliği ve izinlerin değişmemesi.
- Yeni `8bittabs-backup` dışa aktarımı ve eski `tabdock-backup` dosyalarının kullanıcı başlıklarını değiştirmeden içe alınması.
- Kart/liste tercihinin dil, tema ve sabitlenmiş sekme ayarından bağımsız olarak saklanması.
- Chrome mağaza meta verilerinin beş dilde bulunması ve her kısa açıklamanın 132 karakter sınırını koruması.

## Gerçek tarayıcı kontrolleri

28 senaryo geçti. Tarayıcı dili özellikle Türkçe seçildi; eklentinin İngilizce varsayılanı ayrıca doğrulandı:

1. MV3 eklentinin gerçek tarayıcıda yüklenmesi; yalnızca `tabs` ve `unlimitedStorage` izinleri; içerik betiği, host izni ve popup bulunmaması.
2. Gerçek iki penceredeki sekmelerin arşiv ekranındaki düğmeyle kaydedilip kapatılması; sabitlenmiş sekmenin açık kalması.
3. Arayüzden klasör oluşturma, oturum adlandırma, not ve yıldız ekleme.
4. URL, not ve klasör adına göre Türkçe arama; boş sonuç görünümü.
5. Tek bağlantı ve özgün pencere ayrımına göre geri açma; arşiv kayıtlarının korunması.
6. Çöp kutusu, geri alma ve aktif oturumun kalıcı silinmesinin engellenmesi.
7. Ayarlardan sabitlenmişleri dahil etme, tek pencere kapsamı ve açık tema; kapsam dışındaki test penceresinin korunması.
8. DevTools `Extensions.triggerAction` komutuyla gerçek araç çubuğu olayının tetiklenmesi; tıklanan test sekmesinin arşivlenmesi.
9. JSON dosyasının gerçekten indirilmesi; tekrar içe aktarımda oturum, klasör ve ayarların korunması.
10. Dosya seçiciyle OneTab metninin iki ayrı oturum olarak içe alınması.
11. Tehlikeli adresli aktarımın bütünüyle reddi; HTML benzeri başlığın çalıştırılmadan metin olarak gösterilmesi.
12. Eklenti sayfasından dış sunucu bağlantısının içerik güvenliği ilkesiyle engellenmesi.
13. Tarayıcının tamamen kapatılıp aynı test profiliyle yeniden açılması; oturum, klasör ve ayarların değişmeden kalması.
14. Kalıcı silme onayında vazgeçme ve onaylayarak silme.
15. `/` ile aramaya odaklanma; 1440, 1024, 768 ve 390 piksel genişliklerde yatay taşma olmaması.
16. Klasör silindikten sonra içindeki oturumların klasörsüz olarak korunması.
17. İngilizce: arayüzden dil seçme, tüm statik metin ve erişilebilirlik etiketleri, tarih, hata mesajı, araç çubuğu açıklaması ve 1440/768/390 piksel görünümü.
18. Türkçe: aynı kontrollerin tamamı.
19. Almanca: aynı kontrollerin tamamı.
20. Fransızca: aynı kontrollerin tamamı.
21. İspanyolca: aynı kontrollerin tamamı.
22. İspanyolca tercihinin tarayıcı tamamen kapatılıp açılınca korunması; ikinci arşiv sekmesinin dil değişimine güncellenmesi.
23. 1.0.0 biçimindeki dil alanı olmayan ayarların İngilizceye geçmesi; eski geçici Türkçe bildirimin gösterilmemesi; oturumlar, notlar, adresler, tema, kapsam ve sabitlenmiş sekme tercihinin korunması.
24. Kart/liste geçişinin gerçek arayüzden yapılması ve yeniden yükleyince korunması; üstteki arşiv toplamlarının arama sonuçlarına göre değişmemesi; masaüstünde iki kart sütununun oluşması.
25. Önceki geliştirme sürümünün yedeğinin yeni adla çalışan eklentiye aktarılması; kullanıcının eski adı içeren başlığının aynen korunması.

26. Gerçek boş/yeni sekme, Ayarlar ve Sürüm sekmelerinin varsayılan ayarda açık kalması; normal web sekmesinin arşivlenmesi.
27. Yeni ayarın arayüzden açılması ve yeniden yüklemede korunması; dahili sekmelerin boş oturum oluşturmadan kapatılması, sabitlenmiş sekme ile kapsam dışı pencerenin korunması.
28. Sabitlenmiş dahili sekmenin ancak iki seçenek birlikte açıkken kapatılması ve yeni tercihin tam tarayıcı yeniden başlatmasından sonra korunması.

Her dilde geçersiz OneTab dosyası gerçek dosya seçiciden alındı; hata mesajının aynı dilde ve açık iletişim kutusunun önünde görünmesi doğrulandı. Dil değişiklikleri sırasında kayıtlı oturumlar değiştirilmeden kaldı. Fransızca ve İspanyolca gibi daha uzun metinler dar ekranda da yatay taşma oluşturmadı. Yeni temizlik ayarı ve açıklaması beş dildeki gerçek ayar penceresine dahildir. 1280×800 görünümde beş dilin tamamında Ayarları kaydet düğmesinin pencerenin içinde görünmesi ayrıca doğrulandı.

İndirme kontrolü ilk çalıştırmada çalışma ortamının dosya izinlerine takıldı; ayrı test profiliyle dosya yazma izni sağlanınca JSON dosyası indirme ve tekrar yükleme kontrolü geçti. Test için eklentiye yeni bir izin eklenmedi.

`test-results/browser-report.json` ayrıntılı makine raporudur; test profilleri ve raporlar dağıtım ZIP'lerine girmez. `test-results/preview.png` ve `test-results/languages.png` örnek verilerle oluşturulan arayüz ve dil ayarı görüntüleridir. Örnek oturumlar kullanıcıya kurulan eklentiye eklenmez.

## Görsel ve paket kontrolleri

Pixel Core simgesi; koyu, açık ve mobil görünümler; uzun Almanca/Fransızca/İspanyolca metinlerin iletişim kutuları görsel olarak incelendi. Mağaza için kullanılan üç 1280×800 görüntü gerçek tarayıcı ekranından alındı. İsteğe bağlı tanıtım görselleri aynı kaynak SVG ve renklerle yerelde üretildi.

Onaylanan sade piksel arşiv kutusu simgesi korundu. Kaynak SVG'nin onaylı önizlemeyle birebir eşleşmesi ve 16, 32, 48 ve 512 piksel çıktılarda aynı piksel ızgarasının korunması doğrulandı. 128 piksel mağaza simgesinin 16 piksel saydam kenar boşluğu kontrol edildi. Ekran görüntüleri ve paketler 1.3.0 arayüzüyle yeniden üretildi; 47 temel ve 28 gerçek tarayıcı kontrolü geçti.

Mevcut GitHub deposunun GPL-3.0 lisansı, kaynak, destek ve gizlilik bağlantıları korundu. Mağaza ekran ve tanıtım PNG'leri üç kanallı RGB biçimindedir; yalnızca mağaza simgesinin saydam kenar boşluğu vardır. Sekiz ekranı izleyen mağaza rehberinin açıklamaları ve izin gerekçesi yeni davranışa uyarlandı; metinlerin karakter sınırları doğrulandı. Yardımcı sayfanın beş dil seçimi, kopyalama düğmeleri ve dar ekran görünümü Google Chrome'da ayrıca kontrol edildi; bu, eklentinin ayrıca Google Chrome'da test edildiği anlamına gelmez.

Paketlerin ZIP CRC kontrolü, iç dosyaların kaynak dosyalarla SHA-256 karşılaştırması, tekil/güvenli arşiv yolları, manifest sürümü ve izinleri bağımsız bir ZIP okuyucusuyla doğrulandı. Aynı kaynaktan iki paketleme çalışmasının aynı dosya özetlerini üretmesi kontrol edildi. Bu kontroller mağaza incelemesinin yerini tutmaz.

## Sınırlar

Arşiv ekranındaki gerçek düğme ve araç çubuğunun gerçek olay işleyicisi ayrı ayrı çalıştırıldı. Araç çubuğu olayı DevTools ile tetiklendi; kişisel tarayıcı araç çubuğundaki simge fiziksel olarak tıklanmadı. Chrome ve Edge için ayrıca ayrı çalıştırma yapılmadı. Chromium 120 alt sınırında ayrıca test yapılmadı.

Fiziksel güç kesintisi, gerçek disk doluluğu/bozulması, 100.000 sekmeli aktarım yük testi ve tüm kurumsal tarayıcı politikaları denenmedi. Temel kontrollerde depolama ve API hataları taklit edildi; bu, gerçek güç kaybı veya disk arızası kanıtı değildir.

Vivaldi 8.3.4191.44 (Chromium 156.0.8078.104) ayrı deneme profillerinde başlatıldı. Yerel otomasyon bağlantısı ve başlatma akışı tam arayüz testinin tamamlanmasına izin vermedi; bu denemeler başarılı Vivaldi doğrulaması olarak sayılmadı. Vivaldi Start Page/Ayarlar adresleri ve yerleşik UI bileşen adresleri temel kontrollerde kapsanır. Tarayıcının kendi ana pencere/uygulama adresleri kapatma kapsamına alınmaz. Gerçek Vivaldi arayüzündeki son kullanım kontrolü ayrıca yapılmalıdır.
