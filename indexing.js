const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');

// GitHub Secret'tan gelen JSON anahtarı
const key = JSON.parse(process.env.GOOGLE_INDEXING_KEY);

const jwtClient = new google.auth.JWT(
  key.client_email,
  null,
  key.private_key,
  ['https://www.googleapis.com/auth/indexing'],
  null
);

jwtClient.authorize(async (err, tokens) => {
  if (err) {
    console.log("Yetki hatası:", err);
    return;
  }

  // Buraya sitendeki sitemap linkini yaz
  const sitemapUrl = 'https://mc-novatools.com/sitemap.xml'; 
  
  try {
    // Sitemap'i oku ve içindeki linkleri Google'a gönder (Basit bir örnek)
    console.log("Google botu yola çıktı...");
    const response = await axios.post('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      url: 'https://mc-novatools.com/', // Ana sayfanı mutlaka bildir
      type: 'URL_UPDATED'
    }, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.access_token}` }
    });
    console.log("Google'dan gelen cevap:", response.statusText);
  } catch (error) {
    console.error("Hata oluştu:", error.response ? error.response.data : error.message);
  }
});
