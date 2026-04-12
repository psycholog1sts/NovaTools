# AdSense Slot Audit (2026-04-12)

## Dönüştürülen/Konfigüre edilen alanlar
- `src/tools/news/summarizer/index.html`: `NEWS_SIDEBAR_SLOT` -> merkezi slot anahtarı (`newsSidebar`) ve numeric slot.
- `src/tools/religious/islamic-calendar/index.html`: `ISLAMIC_CALENDAR_SLOT` -> merkezi slot anahtarı (`islamicCalendar`) ve numeric slot.
- `src/tools/finance/retirement/index.html`: `RETIREMENT_TOOL_SLOT` -> merkezi slot anahtarı (`retirementTool`) ve numeric slot.
- `src/tools/finance/student-loan/index.html`: `STUDENT_LOAN_SLOT` -> merkezi slot anahtarı (`studentLoanTool`) ve numeric slot.
- Yeni merkez dosya: `src/core/ads/ad-slot-ids.mjs`.

## Hâlâ production doğrulaması gereken yerler
1. `src/tools/pdf/*` içinde `__ADSENSE_CLIENT__` geçen reklam birimleri (publisher ID yer tutucu).
2. `src/components/ads/AdSlot.mjs` içindeki varsayılan slot kimlikleri (`BANNER_SLOT_ID`, `RECTANGLE_SLOT_ID`, vb.).
3. `src/tools/request/index.html` içinde `https://formspree.io/f/YOUR_FORM_ID` form action değeri.

## Not
Bu dosya, başvuru öncesi son teknik kontrol listesinin reklam tarafı bölümünü takip etmek için eklenmiştir.
