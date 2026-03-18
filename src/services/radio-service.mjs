/**
 * Deep Focus Radio Service
 * Background music streaming for productivity
 */

class RadioService {
  constructor() {
    this.audio = null;
    this.isPlaying = false;
    this.volume = parseFloat(localStorage.getItem('radio-volume')) || 0.3;
    this.currentTrack = 0;
    this.initialized = false;
    
    // Curated playlist - Lo-fi, ambient, focus music
    this.playlist = [
      {
        name: "Lo-Fi Study Beats",
        url: "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=1",
        type: "youtube"
      },
      {
        name: "Ambient Focus",
        url: "https://www.youtube.com/embed/5qap5aO4i9A?autoplay=1&mute=1",
        type: "youtube"
      },
      {
        name: "Deep Work Music",
        url: "https://www.youtube.com/embed/lTRiuFIWV54?autoplay=1&mute=1",
        type: "youtube"
      }
    ];
    
    this.init();
  }
  
  init() {
    // Create audio element
    this.audio = new Audio();
    this.audio.volume = this.volume;
    this.audio.loop = true;
    
    // Restore state
    const savedState = localStorage.getItem('radio-playing');
    if (savedState === 'true') {
      // Don't autoplay immediately - wait for user interaction
      this.isPlaying = false;
    }
    
    this.initialized = true;
    this.renderPlayer();
  }
  
  renderPlayer() {
    // Check if player already exists
    if (document.getElementById('deep-focus-radio')) return;
    
    const player = document.createElement('div');
    player.id = 'deep-focus-radio';
    player.className = 'radio-player';
    player.innerHTML = `
      <div class="radio-container">
        <button class="radio-toggle" aria-label="Toggle radio" title="Deep Focus Radio">
          <span class="radio-icon">🎵</span>
          <span class="radio-status">OFF</span>
        </button>
        <div class="radio-controls" style="display: none;">
          <span class="radio-track">Deep Focus Radio</span>
          <input type="range" class="radio-volume" min="0" max="1" step="0.1" value="${this.volume}" aria-label="Volume">
          <button class="radio-mute" aria-label="Mute">🔊</button>
        </div>
      </div>
    `;
    
    // Add to footer or body
    const footer = document.querySelector('.main-footer');
    if (footer) {
      footer.insertBefore(player, footer.firstChild);
    } else {
      document.body.appendChild(player);
    }
    
    this.attachListeners();
  }
  
  attachListeners() {
    const toggle = document.querySelector('.radio-toggle');
    const volume = document.querySelector('.radio-volume');
    const mute = document.querySelector('.radio-mute');
    const controls = document.querySelector('.radio-controls');
    const status = document.querySelector('.radio-status');
    
    if (toggle) {
      toggle.addEventListener('click', () => {
        if (this.isPlaying) {
          this.pause();
          controls.style.display = 'none';
          status.textContent = 'OFF';
          toggle.classList.remove('playing');
        } else {
          this.play();
          controls.style.display = 'flex';
          status.textContent = 'ON';
          toggle.classList.add('playing');
        }
      });
    }
    
    if (volume) {
      volume.addEventListener('input', (e) => {
        this.setVolume(e.target.value);
      });
    }
    
    if (mute) {
      mute.addEventListener('click', () => {
        this.toggleMute();
      });
    }
  }
  
  play() {
    // Use a reliable audio source
    if (!this.audio.src) {
      // Using a free streaming URL placeholder
      // In production, replace with actual streaming URL
      this.audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVanu87plHQUuh9Dz2YU2Bhxqv+zplkcODVGm5O+4ZSAEMYrO89GFNwYdcfDr4ZdJDQtPp+XysWUeBjiS1/LNfi0GI33R8tOENAcdcO/v4phJDQxPqOXyxWUeBjiT1/PQfS4GI3/R8tSFNwYdcfDr4phJDQxPqOXyxWUeBjiT1/PQfS4GI3/R8tSFNwYdcfDr4phJDQxPqOXyxWUeBjiT1/PQfS4GI3/R8tSFNwYdcfDr4phJDQxPqOXyxWUeBjiT1/PQfS4GI3/R8tSFNwYdcfDr4phJDQxPqOXyxWUeBjiT1/PQfS4GI3/R8tSFNwYdcfDr4phJDQxPqOXyxWUeBjiT1/PQfS4GI3/R8tSFNwYdcfDr4phJDQxPqOXyxWUeBjiT1/PQfS4GI3/R8tSFNwYdcfDr4phJDQxPqOXyxWUeBjiT1/PQfS4GI3/R8tSFNwYdcfDr4phJDQxPqOXyxWUeBjiT1/PQfS4GI3/R8tSFNwYdcfDr4phJDQ==';
    }
    
    this.audio.play().catch(() => {
      // Autoplay prevented - user interaction required
    });
    
    this.isPlaying = true;
    localStorage.setItem('radio-playing', 'true');
  }
  
  pause() {
    if (this.audio) {
      this.audio.pause();
    }
    this.isPlaying = false;
    localStorage.setItem('radio-playing', 'false');
  }
  
  setVolume(value) {
    this.volume = parseFloat(value);
    if (this.audio) {
      this.audio.volume = this.volume;
    }
    localStorage.setItem('radio-volume', this.volume);
  }
  
  toggleMute() {
    if (this.audio) {
      this.audio.muted = !this.audio.muted;
      const muteBtn = document.querySelector('.radio-mute');
      if (muteBtn) {
        muteBtn.textContent = this.audio.muted ? '🔇' : '🔊';
      }
    }
  }
}

// Export singleton
export const radioService = new RadioService();
export default RadioService;
