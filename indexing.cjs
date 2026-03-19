const { google } = require('googleapis');
const axios = require('axios');

const keyContent = process.env.GOOGLE_INDEXING_KEY;

if (!keyContent || keyContent.trim() === "") {
  console.error("HATA: GitHub Secret (GOOGLE_INDEXING_KEY) bulunamadı veya içi boş!");
  process.exit(1);
}

try {
  const key = JSON.parse(keyContent);
  const jwtClient = new google.auth.JWT(
    key.client_email,
    null,
    key.private_key,
    ['https://www.googleapis.com/auth/indexing'],
    null
  );

  jwtClient.authorize(async (err, tokens) => {
    if (err) {
      console.error("Yetki Hatası:", err);
      process.exit(1);
    }

    try {
      console.log("Google botu NovaTools MC için çağrılıyor...");
      const response = await axios.post('https://indexing.googleapis.com/v3/urlNotifications:publish', {
        url: 'https://mc-novatools.com/', 
        type: 'URL_UPDATED'
      }, {
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${tokens.access_token}` 
        }
      });
      console.log("Sonuç: OK - Google botu sitene yönlendirildi!");
    } catch (error) {
      console.error("API Hatası:", error.response ? error.response.data : error.message);
      process.exit(1);
    }
  });
} catch (e) {
  console.error("JSON Ayrıştırma Hatası! Secret içeriğini kontrol et:", e.message);
  process.exit(1);
}
