# Image Search Setup

Kayıt sayfasına sağ tarafta Google Image Search özelliği eklendi.

## Özellikler

- ✅ Google Images araması (Apify API ile)
- ✅ Unsplash API fallback (ücretsiz alternatif)
- ✅ Resim seçme özelliği
- ✅ Responsive tasarım (mobilde gizli, desktop'ta görünür)

## API Setup

### Seçenek 1: Apify API (Önerilen - Google Images)

1. [Apify](https://apify.com) hesabı oluşturun
2. API token'ınızı alın
3. Railway'de front-end servisinin "Variables" sekmesine ekleyin:
   ```
   NEXT_PUBLIC_APIFY_TOKEN=your-apify-token-here
   ```

### Seçenek 2: Unsplash API (Ücretsiz)

1. [Unsplash Developers](https://unsplash.com/developers) hesabı oluşturun
2. Access Key alın
3. Railway'de front-end servisinin "Variables" sekmesine ekleyin:
   ```
   NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your-unsplash-access-key
   ```

### Seçenek 3: Her İkisi de (En İyi)

Her iki API'yi de ekleyin, sistem otomatik olarak hangisini kullanacağını seçer:
- Apify varsa Google Images kullanır
- Apify yoksa Unsplash kullanır
- İkisi de yoksa hata mesajı gösterir

## Kullanım

1. Kayıt sayfasına gidin
2. Sağ tarafta "Image Search" bölümünü görün
3. Arama yapın ve resim seçin
4. Seçilen resim profil fotoğrafı olarak kullanılabilir (ileride eklenebilir)

## Notlar

- Image Search sadece desktop'ta görünür (lg ekranlarda)
- Mobilde gizlidir (kayıt formu tam genişlikte)
- Resimler lazy loading ile yüklenir
- Hata durumunda kullanıcıya bilgi verilir
