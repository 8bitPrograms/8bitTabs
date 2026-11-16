# 8bitTabs gizlilik bildirimi

Sürüm 1.3.0 · 16 Kasım 2026

[English](PRIVACY.md)

8bitTabs'un bir sunucusu, hesabı, analiz altyapısı veya otomatik güncelleme servisi yoktur. Eklenti; sekme başlıkları ve adreslerini, arşivleme tarihini, oturum adlarını, notları, klasörleri, yıldızları, çöp kutusu durumunu, pencere/sekme sıralarını, sabitlenme ve sessize alma durumunu kullanıcının mevcut tarayıcı profilindeki IndexedDB veritabanına yazar. Görünüm ve arşivleme ayarları da aynı yerde tutulur.

Bu veriler 8bitTabs tarafından herhangi bir üçüncü kişiye gönderilmez veya satılmaz. İçerik betikleri bulunmaz; sayfa içerikleri, formlar, çerezler, parolalar, tarayıcı geçmişi ve dosya içerikleri okunmaz. Site simgeleri için dış servise istek yapılmaz. Kullanıcı tarafından seçilen içe aktarım dosyaları cihazda okunur.

Dil ve kart/liste görünümü tercihi cihazda saklanır. İngilizce, Türkçe, Almanca, Fransızca ve İspanyolca çevirileri eklenti paketinin içindedir; bir çeviri servisine bağlantı kurulmaz. Varsayılan İngilizcedir. Dil değişikliği arşivdeki kullanıcı içeriğini değiştirmez.

Eklenti paketinde uzak kod ve üçüncü taraf çalıştırma bağımlılığı yoktur. İçerik güvenliği ilkesi eklenti sayfaları ve arka plan işlemcisinin ağ bağlantılarını `connect-src 'none'` ile engeller. Kullanıcı bir bağlantıyı geri açtığında, tarayıcının açtığı o web sayfası kendi olağan ağ bağlantılarını yapar. Bu bildirimin kapsamı diğer web sitelerinin ve tarayıcının davranışı değildir.

Gizli pencereler desteklenmez ve arşivlenmez. Sayfaları arşivleme yalnızca kullanıcının araç çubuğundaki simgeye veya arşiv sayfasındaki düğmeye basmasıyla başlar. Periyodik tarama veya kendiliğinden arşivleme yapılmaz.

**Boş ve dahili sekmeleri de kapat** seçeneği varsayılan olarak kapalıdır. Açılırsa, arşivleme sırasında boş ve dahili tarayıcı sayfaları adreslerinden tanınır ve arşive eklenmeden kapatılır. Sabitlenmiş sekme koruması ve pencere kapsamı geçerlidir. Temizlik tercihi ve tamamlanma sayaçları aynı yerel tarayıcı profilinde tutulur; yeni izin veya veri aktarımı eklenmez.

Yerel kayıtlar ve indirilen JSON yedekleri 8bitTabs tarafından şifrelenmez. URL'ler sorgu parametrelerinde kişisel bilgiler veya erişim belirteçleri içerebilir. Cihaza, tarayıcı profiline veya yedek dosyalarına erişimi olan kişiler bu verileri okuyabilir. Yedeklerini paylaşmadan önce içeriğini gözden geçir.

Çöp kutusundaki oturumlar kullanıcı kalıcı olarak silene kadar tutulur. Otomatik saklama süresi veya otomatik temizleme yoktur. JSON dışa aktarımı çöp kutusunu da içerir; ayarları içermez. Kalıcı silme yedek dosyalarını değiştirmez.

Kullanıcı oturumları kalıcı olarak silebilir veya eklentiyi kaldırabilir. Eklentinin kaldırılması, tarayıcı profilinin silinmesi, disk arızası veya profil bozulması verileri kaybettirebilir. Kaldırmadan önce JSON yedeği alınmalıdır. `unlimitedStorage` izni, normal depolama kotası ve tahliye kısıtlarını azaltır; fiziksel disk arızalarına veya alan yetersizliğine karşı yedek yerine geçmez.

Bu bildirimin teknik karşılığı, aynı paketle dağıtılan okunabilir kaynak kodudur. Yazılım [GNU Genel Kamu Lisansı v3.0](LICENSE) ile sağlanır.

8bitTabs, 8bitPrograms tarafından geliştirilir. Kaynak kod: [8bitPrograms/8bitTabs](https://github.com/8bitPrograms/8bitTabs). Destek veya bu bildirimle ilgili sorular için [projenin issue sayfasını](https://github.com/8bitPrograms/8bitTabs/issues) kullanabilirsin. Herkese açık kayıtlarda özel adreslerini, kimlik bilgilerini veya kişisel veri içeren yedeklerini paylaşma.
