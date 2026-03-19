const { google } = require('googleapis');
const axios = require('axios');

const keyContent = process.env.GOOGLE_INDEXING_KEY;

if (!keyContent) {
  console.error("HATA: GOOGLE_INDEXING_KEY bulunamadı! GitHub Secrets kısmını kontrol et.");
  process.exit(1);
}

try {
  const key = JSON.parse(keyContent);
  
  // Kırık satır sonlarını (\n) Google'ın anlayacağı hale getiriyoruz
  const privateKey = key.private_key.replace(/\\n/g, '\n');

  // Daha sağlam olan nesne tabanlı yetkilendirme
  const jwtClient = new google.auth.JWT({
    email: key.client_email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/indexing']
  });

  jwtClient.authorize(async (err, tokens) => {
    if (err) {
      console.error("Google Yetki Hatası (Detaylı):", err.message);
      process.exit(1);
    }

    try {
      console.log("NovaTools MC için Google botuna sinyal gönderiliyor...");
      const response = await axios.post('https://indexing.googleapis.com/v3/urlNotifications:publish', {
        url: 'https://mc-novatools.com/', 
        type: 'URL_UPDATED'
      }, {
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${tokens.access_token}` 
        }
      });
      console.log("SONUÇ: OK - Google artık sitemizden haberdar!");
    } catch (error) {
      console.error("API Hatası:", error.response ? error.response.data : error.message);
      process.exit(1);
    }
  });
} catch (e) {
  console.error("JSON Hatası! Secret içeriği bozuk görünüyor:", e.message);
  process.exit(1);
}
