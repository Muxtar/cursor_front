# WebSearch Setup

Bu projede websearch artık **mətn + şəkil axtarışı** edir və **API key olmadan da işləyir**.

## Özellikler

- ✅ Web axtarışı (Wikipedia + DuckDuckGo)
- ✅ Şəkil axtarışı (Openverse – API key tələb etmir)
- ✅ İstəsəniz daha yaxşı nəticə üçün Google Images (Apify) və ya Unsplash da qoşa bilərsiniz

## API Setup (Opsiyonel)

### Seçenek 1: Apify (Google Images)

1. [Apify](https://apify.com) hesabı oluşturun
2. API token'ınızı alın
3. Railway'de front-end servisinin "Variables" sekmesine ekleyin:
   ```env
   APIFY_TOKEN=your-apify-token-here
   ```

### Seçenek 2: Unsplash API (Ücretsiz)

1. [Unsplash Developers](https://unsplash.com/developers) hesabı oluşturun
2. Access Key alın
3. Railway'de front-end servisinin "Variables" sekmesine ekleyin:
   ```env
   UNSPLASH_ACCESS_KEY=your-unsplash-access-key
   ```

### Seçenek 3: Heç biri (Default)

Heç bir API key əlavə etməsəniz belə sistem işləyəcək:
- Web üçün: Wikipedia + DuckDuckGo
- Şəkil üçün: Openverse

## Kullanım

1. Ana səhifədə websearch inputuna yazın
2. Tab-larla “Web / Images / All” nəticələrinə baxın

## Notlar

- API key olmadan da işlədiyi üçün Railway-də “Please configure …” xətası artıq çıxmamalıdır
