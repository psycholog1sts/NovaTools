import { google } from 'googleapis';
import axios from 'axios';

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

  try {
    console.log("Google botuna sinyal gönderiliyor...");
    const response = await axios.post('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      url: 'https://mc-novatools.com/', 
      type: 'URL_UPDATED'
    }, {
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${tokens.access_token}` 
      }
    });
    console.log("Google'dan gelen cevap:", response.statusText);
  } catch (error) {
    console.error("Hata oluştu:", error.response ? error.response.data : error.message);
  }
});
