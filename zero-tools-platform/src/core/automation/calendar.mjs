/**
 * Religious & Global Calendar Engine
 * Calculates Islamic (Hijri) dates, global holidays, and special events
 * Auto-generates content for 2026-2027
 */

// Islamic/Hijri Calendar calculation
export class IslamicCalendar {
  constructor() {
    // Islamic year is approximately 354.36707 days
    this.ISLAMIC_YEAR_DAYS = 354.36707;
    this.HIJRI_EPOCH = 1948439.5; // Julian day number of 1 Muharram 1 AH
  }

  /**
   * Convert Gregorian date to Hijri date
   * @param {Date} date - Gregorian date
   * @returns {Object} Hijri date info
   */
  gregorianToHijri(date = new Date()) {
    const jd = this.gregorianToJulian(date);
    return this.julianToHijri(jd);
  }

  /**
   * Convert Gregorian date to Julian Day Number
   */
  gregorianToJulian(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    
    return day + Math.floor((153 * m + 2) / 5) + 
           365 * y + Math.floor(y / 4) - Math.floor(y / 100) + 
           Math.floor(y / 400) - 32045;
  }

  /**
   * Convert Julian Day Number to Hijri date
   */
  julianToHijri(jd) {
    jd = Math.floor(jd) + 0.5;
    let days = jd - this.HIJRI_EPOCH;
    const months = Math.floor(days / 29.53059);
    
    // Refine calculation
    let year = Math.floor(months / 12);
    let month = months % 12;
    // _day calculation removed (unused variable)
    
    // Adjust to actual calendar
    year = Math.floor((jd - this.HIJRI_EPOCH) / this.ISLAMIC_YEAR_DAYS) + 1;
    const yearStart = this.HIJRI_EPOCH + (year - 1) * this.ISLAMIC_YEAR_DAYS;
    days = jd - yearStart;
    
    // Month lengths (alternating 30 and 29 days)
    const monthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];
    month = 0;
    while (days > monthLengths[month]) {
      days -= monthLengths[month];
      month++;
    }
    
    return {
      year,
      month: month + 1,
      day: Math.floor(days) + 1,
      monthName: this.getHijriMonthName(month),
      formatted: `${Math.floor(days) + 1} ${this.getHijriMonthName(month)} ${year} AH`
    };
  }

  getHijriMonthName(monthIndex) {
    const months = [
      'Muharram', 'Safar', 'Rabi\' al-Awwal', 'Rabi\' al-Thani',
      'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
      'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
    ];
    return months[monthIndex] || months[0];
  }

  /**
   * Get upcoming Islamic events for current year
   * @param {number} year - Gregorian year
   * @returns {Array} List of Islamic events
   */
  getIslamicEvents(year = new Date().getFullYear()) {
    const events = [
      // 2026 dates (approximate)
      { name: 'Islamic New Year', hijri: { day: 1, month: 1 }, date: new Date(year, 6, 16), type: 'islamic' },
      { name: 'Ashura', hijri: { day: 10, month: 1 }, date: new Date(year, 6, 25), type: 'islamic' },
      { name: 'Mawlid al-Nabi', hijri: { day: 12, month: 3 }, date: new Date(year, 8, 23), type: 'islamic' },
      { name: 'Start of Rajab', hijri: { day: 1, month: 7 }, date: new Date(year, 11, 19), type: 'islamic' },
      { name: 'Laylat al-Mi\'raj', hijri: { day: 27, month: 7 }, date: new Date(year, 0, 14), type: 'islamic' },
      { name: 'Laylat al-Bara\'at', hijri: { day: 15, month: 8 }, date: new Date(year, 1, 3), type: 'islamic' },
      { name: 'Start of Ramadan', hijri: { day: 1, month: 9 }, date: new Date(year, 1, 17), type: 'islamic', major: true },
      { name: 'Laylat al-Qadr', hijri: { day: 27, month: 9 }, date: new Date(year, 2, 15), type: 'islamic', major: true },
      { name: 'Eid al-Fitr', hijri: { day: 1, month: 10 }, date: new Date(year, 2, 19), type: 'islamic', major: true },
      { name: 'Eid al-Adha', hijri: { day: 10, month: 12 }, date: new Date(year, 4, 27), type: 'islamic', major: true },
    ];

    // Sort by date and add countdown
    const now = new Date();
    return events
      .map(event => ({
        ...event,
        daysUntil: Math.ceil((event.date - now) / (1000 * 60 * 60 * 24)),
        isPast: event.date < now
      }))
      .sort((a, b) => a.date - b.date);
  }
}

// Global Holidays Calendar
export class GlobalHolidays {
  constructor() {
    this.currentYear = new Date().getFullYear();
  }

  /**
   * Get all global holidays for the year
   * @param {number} year - Gregorian year
   * @returns {Array} List of global holidays
   */
  getGlobalHolidays(year = this.currentYear) {
    return [
      // Christian Holidays
      { name: 'Christmas', date: new Date(year, 11, 25), type: 'christian', regions: ['US', 'UK', 'EU'], major: true },
      { name: 'Easter Sunday', date: this.calculateEaster(year), type: 'christian', regions: ['US', 'UK', 'EU'] },
      { name: 'Good Friday', date: this.addDays(this.calculateEaster(year), -2), type: 'christian', regions: ['US', 'UK', 'EU'] },
      
      // Jewish Holidays
      { name: 'Rosh Hashanah', date: new Date(year, 8, 22), type: 'jewish', regions: ['US', 'UK'] },
      { name: 'Yom Kippur', date: new Date(year, 9, 1), type: 'jewish', regions: ['US', 'UK'] },
      { name: 'Hanukkah', date: new Date(year, 11, 14), type: 'jewish', regions: ['US', 'UK'] },
      
      // Secular/Global
      { name: 'New Year\'s Day', date: new Date(year, 0, 1), type: 'secular', regions: ['GLOBAL'], major: true },
      { name: 'Valentine\'s Day', date: new Date(year, 1, 14), type: 'secular', regions: ['US', 'UK', 'EU'] },
      { name: 'International Women\'s Day', date: new Date(year, 2, 8), type: 'secular', regions: ['EU', 'GLOBAL'] },
      { name: 'Earth Day', date: new Date(year, 3, 22), type: 'secular', regions: ['GLOBAL'] },
      { name: 'Labor Day', date: new Date(year, 8, 7), type: 'secular', regions: ['US'] },
      { name: 'Halloween', date: new Date(year, 9, 31), type: 'secular', regions: ['US', 'UK'] },
      { name: 'Black Friday', date: this.addDays(new Date(year, 10, 1).getDay() === 4 ? new Date(year, 10, 1) : new Date(year, 10, 26), -1), type: 'secular', regions: ['US', 'GLOBAL'] },
      
      // Regional
      { name: 'Thanksgiving (US)', date: this.getNthThursday(year, 10, 4), type: 'regional', regions: ['US'], major: true },
      { name: 'Boxing Day', date: new Date(year, 11, 26), type: 'regional', regions: ['UK', 'CA', 'AU'] },
      { name: 'Cinco de Mayo', date: new Date(year, 4, 5), type: 'regional', regions: ['US', 'MX'] },
    ];
  }

  calculateEaster(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
  }

  getNthThursday(year, month, n) {
    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay();
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7;
    return new Date(year, month, 1 + daysUntilThursday + (n - 1) * 7);
  }

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Get upcoming holidays with countdown
   * @param {number} count - Number of holidays to return
   * @returns {Array} Upcoming holidays
   */
  getUpcomingHolidays(count = 5) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;
    
    const allHolidays = [
      ...this.getGlobalHolidays(currentYear),
      ...this.getGlobalHolidays(nextYear)
    ];

    return allHolidays
      .map(holiday => ({
        ...holiday,
        daysUntil: Math.ceil((holiday.date - now) / (1000 * 60 * 60 * 24)),
        isPast: holiday.date < now
      }))
      .filter(h => !h.isPast)
      .sort((a, b) => a.date - b.date)
      .slice(0, count);
  }
}

// Special Day Content Generator
export class SpecialDayContent {
  constructor() {
    this.islamicCalendar = new IslamicCalendar();
    this.globalHolidays = new GlobalHolidays();
  }

  /**
   * Generate special content based on current date
   * @returns {Object} Content for the special day
   */
  generateDailyContent() {
    const now = new Date();
    const hijri = this.islamicCalendar.gregorianToHijri(now);
    const upcomingIslamic = this.islamicCalendar.getIslamicEvents().filter(e => e.daysUntil > 0 && e.daysUntil <= 30);
    const upcomingGlobal = this.globalHolidays.getUpcomingHolidays(3);
    
    // Check for special periods
    const isRamadan = hijri.month === 9;
    const isRamadanSoon = upcomingIslamic.find(e => e.name === 'Start of Ramadan' && e.daysUntil <= 7);
    const isEidAlFitr = hijri.month === 10 && hijri.day <= 3;
    const isEidAlAdha = hijri.month === 12 && hijri.day >= 10 && hijri.day <= 13;
    
    // Generate content
    let content = {
      hijriDate: hijri.formatted,
      mainEvent: null,
      secondaryEvents: [],
      message: '',
      emoji: '📅',
      showBanner: false,
      bannerColor: 'var(--accent-primary)'
    };

    // Priority: Major Islamic events > Upcoming major holidays > Regular day
    if (isRamadan) {
      content = {
        ...content,
        mainEvent: 'Ramadan Mubarak',
        message: `We are in the blessed month of Ramadan (${hijri.day} ${hijri.monthName}). May your fasts be accepted.`,
        emoji: '🌙',
        showBanner: true,
        bannerColor: '#6366F1'
      };
    } else if (isEidAlFitr) {
      content = {
        ...content,
        mainEvent: 'Eid Mubarak',
        message: 'Wishing you and your family a blessed Eid al-Fitr filled with joy and prosperity.',
        emoji: '🎉',
        showBanner: true,
        bannerColor: '#22C55E'
      };
    } else if (isEidAlAdha) {
      content = {
        ...content,
        mainEvent: 'Eid Mubarak',
        message: 'May the spirit of sacrifice and devotion bring blessings to your life. Eid al-Adha Mubarak!',
        emoji: '🐑',
        showBanner: true,
        bannerColor: '#F59E0B'
      };
    } else if (isRamadanSoon) {
      content = {
        ...content,
        mainEvent: 'Ramadan is Coming',
        message: `Ramadan begins in ${isRamadanSoon.daysUntil} days. Prepare your heart and soul for this blessed month.`,
        emoji: '🌙',
        showBanner: true,
        bannerColor: '#8B5CF6'
      };
    } else if (upcomingIslamic[0] && upcomingIslamic[0].daysUntil <= 3) {
      const event = upcomingIslamic[0];
      content = {
        ...content,
        mainEvent: event.name,
        message: `${event.name} is in ${event.daysUntil} days. Mark your calendar for this special occasion.`,
        emoji: '✨',
        showBanner: event.major
      };
    } else if (upcomingGlobal[0] && upcomingGlobal[0].daysUntil <= 7) {
      const holiday = upcomingGlobal[0];
      content = {
        ...content,
        mainEvent: holiday.name,
        message: `${holiday.name} is approaching in ${holiday.daysUntil} days!`,
        emoji: '🎊',
        showBanner: holiday.major
      };
    }

    // Add upcoming events
    content.secondaryEvents = [
      ...upcomingIslamic.slice(0, 3).map(e => ({ ...e, type: 'islamic' })),
      ...upcomingGlobal.slice(0, 2).map(e => ({ ...e, type: 'global' }))
    ];

    return content;
  }

  /**
   * Get Kandil dates (special Islamic nights)
   * @param {number} year - Gregorian year
   * @returns {Array} Kandil dates
   */
  getKandilDates(year = new Date().getFullYear()) {
    return [
      { name: 'Mevlid Kandili', date: new Date(year, 8, 23), description: 'Birth of Prophet Muhammad (PBUH)' },
      { name: 'Regaib Kandili', date: new Date(year, 1, 20), description: 'Beginning of the three holy months' },
      { name: 'Miraç Kandili', date: new Date(year, 0, 14), description: 'The Night Journey and Ascension' },
      { name: 'Berat Kandili', date: new Date(year, 1, 3), description: 'Night of Forgiveness' },
      { name: 'Kadir Gecesi', date: new Date(year, 2, 15), description: 'Night of Power (Laylat al-Qadr)' }
    ].map(k => ({
      ...k,
      daysUntil: Math.ceil((k.date - new Date()) / (1000 * 60 * 60 * 24))
    })).filter(k => k.daysUntil >= 0);
  }
}

// Export singleton instances
export const islamicCalendar = new IslamicCalendar();
export const globalHolidays = new GlobalHolidays();
export const specialDayContent = new SpecialDayContent();

/**
 * Get special day content for homepage banner
 * @returns {Object|null} Banner content or null
 */
export function getSpecialDayContent() {
  const content = specialDayContent.generateDailyContent();
  
  if (!content.showBanner) {
    return null;
  }
  
  return {
    banner: `${content.emoji} ${content.mainEvent}: ${content.message}`,
    theme: content.bannerColor,
    emoji: content.emoji,
    message: content.message
  };
}

/**
 * Get Islamic holidays for the year
 * @param {number} year - Gregorian year
 * @returns {Object} Islamic holidays with dates
 */
export function getIslamicHolidays(year = new Date().getFullYear()) {
  const events = islamicCalendar.getIslamicEvents(year);
  const holidays = {};
  
  events.forEach(event => {
    const key = event.name.toLowerCase().replace(/[^a-z]/g, '');
    holidays[key] = {
      name: event.name,
      date: event.date.toISOString().split('T')[0],
      type: event.major ? 'major' : 'islamic',
      daysLeft: event.daysUntil
    };
  });
  
  return holidays;
}

/**
 * Get global holidays for the year
 * @param {number} year - Gregorian year  
 * @returns {Object} Global holidays with dates
 */
export function getGlobalHolidays(year = new Date().getFullYear()) {
  const holidays = globalHolidays.getGlobalHolidays(year);
  const result = {};
  
  holidays.forEach(holiday => {
    const key = holiday.name.toLowerCase().replace(/[^a-z]/g, '');
    result[key] = {
      name: holiday.name,
      date: holiday.date.toISOString().split('T')[0],
      type: holiday.type,
      major: holiday.major || false
    };
  });
  
  return result;
}

// Default export
export default {
  IslamicCalendar,
  GlobalHolidays,
  SpecialDayContent,
  islamicCalendar,
  globalHolidays,
  specialDayContent,
  getSpecialDayContent,
  getIslamicHolidays,
  getGlobalHolidays
};
