const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const axios = require('axios');

const keyContent = process.env.GOOGLE_INDEXING_KEY;

if (!keyContent) {
  console.error("HATA: GOOGLE_INDEXING_KEY bulunamadı! GitHub Secrets kısmını kontrol et.");
  process.exit(1);
}

try {
  const key = JSON.parse(keyContent);
  const privateKey = key.private_key.replace(/\\n/g, '\n');

  const jwtClient = new google.auth.JWT({
    email: key.client_email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/indexing']
  });

  jwtClient.authorize(async (err, tokens) => {
    if (err) {
      console.error("Google Yetki Hatası:", err.message);
      process.exit(1);
    }

    try {
      // 1. Prefer the sitemap produced by this workflow so indexing does not depend
      // on the currently deployed site being healthy. Fall back to production if needed.
      const localSitemapPath = path.join(process.cwd(), 'dist', 'sitemap.xml');
      let sitemapXml;
      if (fs.existsSync(localSitemapPath)) {
        console.log(`Sitemap okunuyor: ${localSitemapPath}`);
        sitemapXml = fs.readFileSync(localSitemapPath, 'utf8');
      } else {
        console.log("Sitemap okunuyor: https://mc-novatools.com/sitemap.xml");
        const sitemapResponse = await axios.get('https://mc-novatools.com/sitemap.xml');
        sitemapXml = sitemapResponse.data;
      }

      // 2. XML içindeki tüm <loc> linklerini ayıklıyoruz.
      const urls = (sitemapXml.match(/<loc>(.*?)<\/loc>/g) || [])
        .map(val => val.replace(/<\/?loc>/g, '').replace(/&amp;/g, '&'));

      if (urls.length === 0) {
        console.log('Sitemap içinde gönderilecek URL bulunamadı; indeksleme atlanıyor.');
        return;
      }

      console.log(`Toplam ${urls.length} adet URL bulundu. İndeksleme başlıyor...`);

      // 3. Her bir URL için Google'a sinyal gönderiyoruz
      for (const url of urls) {
        try {
          await axios.post('https://indexing.googleapis.com/v3/urlNotifications:publish', {
            url: url,
            type: 'URL_UPDATED'
          }, {
            headers: { 
              'Content-Type': 'application/json', 
              Authorization: `Bearer ${tokens.access_token}` 
            }
          });
          console.log(`OK: ${url} -> Google'a bildirildi.`);
        } catch (urlError) {
          console.error(`HATA: ${url} bildirilemedi:`, urlError.response ? urlError.response.data : urlError.message);
        }
      }

      console.log("BÜTÜN ARAÇLAR Google'a başarıyla iletildi! 🚀");
    } catch (error) {
      console.error("Sitemap çekilirken veya API işlenirken genel hata:", error.message);
      process.exit(1);
    }
  });
} catch (e) {
  console.error("JSON Hatası! Secret içeriği bozuk görünüyor:", e.message);
  process.exit(1);
}
