/**
 * Calendar Service
 * Islamic and Gregorian calendar data
 */

import { apiClient } from '../core/api-client.mjs';
import { getConfig } from '../core/config.mjs';

class CalendarService {
  constructor() {
    this.baseUrl = getConfig('apis.aladhan.baseUrl');
    this.cacheDuration = getConfig('apis.aladhan.cacheDuration');
  }

  /**
   * Get current Islamic date
   * @returns {Promise<Object>} Hijri date
   */
  async getCurrentIslamicDate() {
    const today = new Date().toISOString().split('T')[0];
    return this.getIslamicDate(today);
  }

  /**
   * Get Islamic date for specific Gregorian date
   * @param {string} date - Gregorian date (YYYY-MM-DD)
   * @returns {Promise<Object>} Hijri date
   */
  async getIslamicDate(date) {
    try {
      const response = await apiClient.get(
        `${this.baseUrl}/gToH/${date}`,
        { cacheDuration: this.cacheDuration }
      );

      const hijri = response.data.hijri;
      
      return {
        day: parseInt(hijri.day),
        month: {
          number: hijri.month.number,
          en: hijri.month.en,
          ar: hijri.month.ar
        },
        year: parseInt(hijri.year),
        formatted: `${hijri.day} ${hijri.month.en} ${hijri.year} AH`,
        gregorian: date
      };
    } catch (error) {
      console.error('Failed to fetch Islamic date:', error);
      return this.calculateIslamicDate(date);
    }
  }

  /**
   * Calculate approximate Islamic date (fallback)
   * @param {string} date - Gregorian date
   * @returns {Object} Approximate Hijri date
   */
  calculateIslamicDate(date) {
    const gregorian = new Date(date);
    
    // Approximate calculation (not 100% accurate but close)
    const islamicYear = Math.floor((gregorian.getFullYear() - 622) * 1.03);
    const islamicMonth = gregorian.getMonth() + 1;
    const islamicDay = gregorian.getDate();
    
    const months = [
      'Muharram', 'Safar', "Rabi' al-awwal", "Rabi' al-thani",
      'Jumada al-awwal', 'Jumada al-thani', 'Rajab', "Sha'ban",
      'Ramadan', 'Shawwal', "Dhu al-Qi'dah", "Dhu al-Hijjah"
    ];
    
    return {
      day: islamicDay,
      month: {
        number: islamicMonth,
        en: months[islamicMonth - 1],
        ar: ''
      },
      year: islamicYear,
      formatted: `${islamicDay} ${months[islamicMonth - 1]} ${islamicYear} AH`,
      gregorian: date,
      approximate: true
    };
  }

  /**
   * Get upcoming Islamic events
   * @returns {Array} List of events
   */
  getUpcomingEvents() {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Approximate dates for 2024-2025
    const events = [
      { name: 'Ramadan', date: new Date(currentYear, 2, 11), type: 'major' },
      { name: 'Eid al-Fitr', date: new Date(currentYear, 3, 10), type: 'major' },
      { name: 'Eid al-Adha', date: new Date(currentYear, 5, 17), type: 'major' },
      { name: 'Islamic New Year', date: new Date(currentYear, 6, 7), type: 'regular' },
      { name: 'Ashura', date: new Date(currentYear, 6, 17), type: 'regular' },
      { name: 'Mawlid', date: new Date(currentYear, 8, 16), type: 'regular' }
    ];

    return events
      .map(event => ({
        ...event,
        daysUntil: Math.ceil((event.date - now) / (1000 * 60 * 60 * 24)),
        isPast: event.date < now
      }))
      .filter(e => !e.isPast)
      .sort((a, b) => a.date - b.date);
  }

  /**
   * Get next upcoming event
   * @returns {Object|null} Next event
   */
  getNextEvent() {
    const events = this.getUpcomingEvents();
    return events.length > 0 ? events[0] : null;
  }

  /**
   * Get prayer times for location
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {Promise<Object>} Prayer times
   */
  async getPrayerTimes(latitude = 41.0082, longitude = 28.9784) {
    const date = new Date().toISOString().split('T')[0];
    
    try {
      const response = await apiClient.get(
        `${this.baseUrl}/timings/${date}`,
        {
          params: { latitude, longitude, method: 13 }
        }
      );

      return response.data.timings;
    } catch (error) {
      console.error('Failed to fetch prayer times:', error);
      return null;
    }
  }
}

// Singleton instance
export const calendarService = new CalendarService();

export default calendarService;
