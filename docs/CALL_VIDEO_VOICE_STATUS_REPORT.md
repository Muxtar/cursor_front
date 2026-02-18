# Sesli ve Görüntülü Arama – Durum Raporu

Bu rapor, sesli ve görüntülü aramanın neden çalışmadığını ve eksik/hatalı noktaları özetler.

---

## 1. Genel Akış (Mevcut Tasarım)

- **Çağıran (caller):** Arama butonuna tıklar → `callApi.initiateCall()` → Backend çağrı kaydı oluşturur ve WebSocket ile `call` event’i gönderir.
- **Aranan (callee):** `call` event’ini alır → Gelen arama modalı gösterilir → Kabul ederse `callApi.answerCall()` → Backend `call_answered` event’ini çağırana gönderir.
- **WebRTC:** Offer/Answer ve ICE adayları WebSocket üzerinden (`webrtc_offer`, `webrtc_answer`, `webrtc_ice`) iletilir.

---

## 2. Tespit Edilen Kritik Sorunlar

### 2.1 Offer’ın Yanlış Zamanda Gönderilmesi (En Önemli Hata)

**Nerede:** `ChatWindow.tsx` – `initializePeerConnection()` içinde.

**Ne oluyor:** Çağıran taraf, aramayı başlatır başlatmaz (callee cevap vermeden) WebRTC offer’ı oluşturup gönderiyor:

```ts
// initializePeerConnection sonunda:
if (activeCall && !incomingCall && pc.localDescription === null) {
  // ...
  const offer = await pc.createOffer({ ... });
  await pc.setLocalDescription(offer);
  ws.send({ type: 'webrtc_offer', chat_id: chatId, call_id: ..., offer: JSON.stringify(offer) });
}
```

**Sonuç:**

- Aranan kişi henüz “Kabul” demeden offer geliyor.
- Aranan tarafta `handleWebRTCOffer` çalışıyor; bu sırada `incomingCall` hâlâ dolu, kullanıcı medya izni vermemiş olabilir.
- İstenen davranış: Offer **sadece** backend’den `call_answered` alındıktan sonra gönderilmeli. Şu an hem burada hem de `handleCallAnswered` içinde (doğru yerde) offer gönderiliyor; bu da sıra ve durum karışıklığına yol açıyor.

**Öneri:** `initializePeerConnection` içindeki offer oluşturma ve gönderme blokunu **tamamen kaldırın**. Offer yalnızca `handleCallAnswered` içinde (caller tarafında, `call_answered` geldikten sonra) oluşturulup gönderilsin.

---

### 2.2 Gelen Aramanın Sadece Aynı Sohbet Açıkken Görünmesi

**Nerede:** `ChatWindow.tsx` – `handleIncomingCall` ve WebSocket `call` dinleyicisi; chat sayfası.

**Ne oluyor:** `call` event’i yalnızca `ChatWindow` mount olduğunda dinleniyor. `ChatWindow` ise yalnızca kullanıcı **o sohbeti seçtiyse** (yani o chat açıkken) mount oluyor.

**Sonuç:**

- Kullanıcı sohbet listesindeyken veya başka bir sohbet açıkken arama gelirse, hiçbir bileşen `call` event’ini işlemiyor.
- Gelen arama modalı hiç görünmüyor; sesli/görüntülü arama “çalışmıyor” gibi algılanıyor.

**Öneri:** `call` event’ini **chat sayfası (veya WebSocket’in bağlı olduğu üst layout)** seviyesinde dinleyin. Gelen arama bilgisini (chat_id, call_id, caller, type) state’te tutun; hangi ekran açık olursa olsun bir “gelen arama” modalı gösterin. Kullanıcı kabul ederse ilgili sohbeti açın (`setSelectedChat(chatId)`) ve gerekirse `prefilledIncomingCall` ile çağrı bilgisini `ChatWindow`’a geçirin.

---

### 2.3 WebRTC Mesajlarının Sadece “Odaya” Gönderilmesi

**Nerede:** `back-end/internal/websocket/websocket.go` – `webrtc_offer`, `webrtc_answer`, `webrtc_ice` işlenirken sadece `BroadcastJSONToRoomExcludingSender(chatID, ...)` kullanılıyor.

**Ne oluyor:** WebRTC sinyalleri yalnızca o chat odasına **join** etmiş kullanıcılara gidiyor. Aranan kullanıcı o sohbet ekranında değilse `join_chat` yapmamış olabilir; dolayısıyla offer/answer/ICE hiç ona ulaşmıyor.

**Sonuç:** Aranan kullanıcı listeyken veya başka sohbet açıkken aramayı kabul etse bile, çağıran offer gönderdiğinde aranan tarafta offer gelmeyebilir; WebRTC bağlantısı kurulamaz.

**Öneri:** WebRTC mesajlarını sadece oda broadcast’i ile sınırlamayın. Çağrıdaki üyeleri (veya en azından karşı tarafı) biliyorsanız, `SendJSONToUser` ile ilgili kullanıcıya da gönderin; böylece odaya join etmemiş olsa bile sinyal alsın.

---

### 2.4 createOffer / createAnswer Seçenekleri (Deprecated)

**Nerede:** `ChatWindow.tsx` – `createOffer` ve `createAnswer` çağrılarında `offerToReceiveAudio` / `offerToReceiveVideo` kullanılıyor.

**Ne oluyor:** Bu seçenekler tarayıcılar tarafından deprecated kabul ediliyor; bazı ortamlarda yok sayılabilir veya hata verebilir.

**Öneri:** Sadece `createOffer()` / `createAnswer()` kullanın veya gerekirse `addTransceiver('audio'|'video')` ile alıcı yönü açın. Deprecated parametreleri kaldırın.

---

### 2.5 Callee Tarafında Offer Gelmeden Önce PC Açılması (Race)

**Nerede:** `ChatWindow.tsx` – `handleAnswerCall` ve `handleWebRTCOffer`.

**Ne oluyor:** Aranan “Kabul” deyince `handleAnswerCall` çalışıyor; video için `startVideoCall()`, ses için `getUserMedia` + `initializePeerConnection` tetikleniyor. Bu işlemler asenkron. Aynı sırada caller `call_answered` alıp offer gönderebiliyor. Offer, callee’nin `initializePeerConnection` bitmeden gelebilir.

**Sonuç:** `handleWebRTCOffer` çalıştığında `peerConnectionRef.current` veya `localStream` hâlâ null olabilir; kod tekrar stream/PC oluşturmaya çalışıyor, çift başlatma veya state karışıklığı olabilir.

**Öneri:** Offer’ı sadece `call_answered` sonrası göndererek (2.1) sırayı düzeltin. Callee tarafında “offer geldi ama henüz Accept sonrası stream/PC hazır değil” durumunda offer’ı kısa bir süre bekletip (queue) PC ve stream hazır olduktan sonra işleyin; veya handleWebRTCOffer içinde “zaten initializePeerConnection çalışıyorsa” tekrar başlatmayın.

---

### 2.6 Backend API Yanıt Formatı (id / call_id)

**Nerede:** Backend `call_handler.go` – `c.JSON(http.StatusCreated, call)`; modelde alan `ID` ve json tag `"id"`.

**Durum:** Backend `id` döndürüyor; frontend’de `activeCall?.call_id || activeCall?.id` kullanıldığı için `id` ile devam edilebiliyor. Bu kısım tutarlı, ancak backend’in `call_answered` event’inde de aynı call için `call_id` göndermesi ve frontend’in tek bir yerden (örn. `call_id`) okuması daha net olur.

---

### 2.7 HTTPS / Ortam Güvenliği

**Ne oluyor:** `getUserMedia` (mikrofon/kamera) birçok tarayıcıda **sadece güvenli bağlamda** (HTTPS veya localhost) çalışır. Production’da HTTP kullanılıyorsa medya açılmayabilir; arama “sessiz” kalır.

**Öneri:** Production’da mutlaka HTTPS kullanın; gerekirse WebSocket de `wss://` olsun.

---

### 2.8 TURN Sunucusu Olmaması

**Nerede:** `ChatWindow.tsx` – `RTCConfiguration` içinde sadece STUN (Google) var.

**Ne oluyor:** Symmetric NAT veya sıkı kurumsal ağlarda sadece STUN yetmeyebilir; ICE “failed” kalabilir, ses/video gelmez.

**Öneri:** Mümkünse TURN ekleyin (örn. Twilio, Xirsys, self‑hosted coturn). Önce STUN ile test edin; “bazı ağlarda çalışmıyor” derseniz TURN’e geçin.

---

## 3. Özet Tablo

| # | Sorun | Önem | Nerede | Önerilen Aksiyon |
|---|--------|------|--------|-------------------|
| 1 | Offer, cevap gelmeden gönderiliyor | Kritik | Frontend `initializePeerConnection` | Offer göndermeyi kaldır; sadece `handleCallAnswered` içinde gönder |
| 2 | Gelen arama sadece ilgili sohbet açıkken dinleniyor | Kritik | Chat sayfası / WebSocket dinleyicisi | `call` event’ini sayfa/layout seviyesinde dinle; global gelen arama modalı + kabulde ilgili sohbeti aç |
| 3 | WebRTC sinyalleri sadece chat odasına | Yüksek | Backend websocket | WebRTC mesajlarını ilgili kullanıcıya da `SendJSONToUser` ile gönder |
| 4 | createOffer/createAnswer deprecated parametreler | Orta | Frontend WebRTC | Deprecated seçenekleri kaldır; gerekirse transceiver kullan |
| 5 | Callee’de offer – stream/PC race | Orta | Frontend handleWebRTCOffer / handleAnswerCall | Offer’ı doğru sıraya al (2.1); gerekirse offer kuyruğu |
| 6 | HTTP’de getUserMedia engeli | Orta | Ortam | Production’da HTTPS (ve wss) kullan |
| 7 | TURN yok | Düşük (ağa bağlı) | Frontend RTC config | Zor ağlar için TURN ekle |

---

## 4. Önerilen Düzeltme Sırası

1. **Offer zamanlaması:** `initializePeerConnection` içinden offer oluşturma/gönderme kaldırılsın; offer yalnızca caller’da `handleCallAnswered` içinde gönderilsin.
2. **Gelen arama her yerde:** Chat sayfasında (veya WebSocket’in bağlı olduğu yerde) global `call` dinleyicisi ekleyin; modal + kabulde ilgili sohbeti açıp `prefilledIncomingCall` ile ChatWindow’a geçirin.
3. **WebRTC sinyallerinin iletilmesi:** Backend’de webrtc_offer/answer/ice için, chat odasına ek olarak çağrıdaki diğer kullanıcıya doğrudan `SendJSONToUser` ile gönderim ekleyin.
4. **Deprecated WebRTC API:** `createOffer` / `createAnswer` çağrılarını sadeleştirin.
5. **HTTPS/TURN:** Production’da HTTPS; gerekiyorsa TURN ekleyin.

Bu adımlar uygulandıktan sonra sesli ve görüntülü aramanın temel senaryoda (aynı sohbet açık + doğru izinler + HTTPS) çalışması beklenir. İstersen bir sonraki adımda 1 ve 2 numaralı maddeler için net patch önerisi (hangi satırların silinmesi/değişmesi) de yazabilirim.
