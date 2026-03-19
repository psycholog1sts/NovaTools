import { google } from 'googleapis';
import axios from 'axios';

// GitHub Secret'tan gelen veriyi oku
const keyContent = process.env.GOOGLE_INDEXING_KEY;
if (!keyContent) {
  throw new Error("HATA: GOOGLE_INDEXING_KEY bulunamadı veya boş!");
}

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
    console.log("Yetki hatası:", err);
    return;
  }

  try {
    console.log("Google botu yola çıktı...");
    const response = await axios.post('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      url: 'https://mc-novatools.com/', 
      type: 'URL_UPDATED'
    }, {
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${tokens.access_token}` 
      }
    });
    console.log("Google'dan gelen cevap: OK");
  } catch (error) {
    console.error("Hata:", error.response ? error.response.data : error.message);
  }
});
