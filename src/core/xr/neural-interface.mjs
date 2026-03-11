/**
 * Neural Interface & Spatial Computing Layer
 * WebXR, eye-tracking, and BCI preparation
 */

export class WebXRLayer {
  constructor() {
    this.session = null;
    this.renderer = null;
    this.referenceSpace = null;
  }

  async init() {
    if (!navigator.xr) return false;
    
    const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
    return isSupported;
  }

  async startSession() {
    this.session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test', 'dom-overlay'],
      domOverlay: { root: document.body }
    });

    this.referenceSpace = await this.session.requestReferenceSpace('local');
    
    // Create WebGL renderer
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { xrCompatible: true });
    
    this.renderer = gl;
    
    this.session.addEventListener('end', () => {
      this.session = null;
    });

    return this.session;
  }

  renderTool3D(toolData) {
    // Render calculator/data as 3D hologram
    const renderLoop = (time, frame) => {
      const pose = frame.getViewerPose(this.referenceSpace);
      
      if (pose) {
        // Render 3D interface at user position
        this.renderHolographicUI(pose.transform.position);
      }
      
      this.session.requestAnimationFrame(renderLoop);
    };
    
    this.session.requestAnimationFrame(renderLoop);
  }

  renderHolographicUI(position) {
    // Placeholder for actual WebGL rendering
    console.log('[WebXR] Rendering at:', position);
  }
}

export class EyeTrackingLayer {
  constructor() {
    this.tracker = null;
    this.heatmap = new Map();
    this.calibrated = false;
  }

  async init() {
    // Use WebGazer.js for eye tracking via webcam
    const script = document.createElement('script');
    script.src = 'https://webgazer.cs.brown.edu/webgazer.js';
    document.head.appendChild(script);
    
    await new Promise((resolve) => {
      script.onload = resolve;
    });

    this.tracker = window.webgazer;
    await this.tracker.begin();
    
    this.tracker.setGazeListener((data, timestamp) => {
      if (data) {
        this.recordGaze(data.x, data.y, timestamp);
      }
    });
  }

  recordGaze(x, y, timestamp) {
    // Create heatmap data
    const cellX = Math.floor(x / 100) * 100;
    const cellY = Math.floor(y / 100) * 100;
    const key = `${cellX}-${cellY}`;
    
    this.heatmap.set(key, (this.heatmap.get(key) || 0) + 1);
    
    // Track element attention
    const element = document.elementFromPoint(x, y);
    if (element) {
      element.dataset.gazeTime = (parseInt(element.dataset.gazeTime) || 0) + 100;
    }
  }

  getAttentionReport() {
    const sorted = Array.from(this.heatmap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    
    return {
      hotspots: sorted,
      totalSamples: Array.from(this.heatmap.values()).reduce((a, b) => a + b, 0)
    };
  }
}

export class AmbientIntelligence {
  constructor() {
    this.recognition = null;
    this.intentPatterns = [
      { pattern: /buy(ing)?\s+a?\s*house/i, action: 'open_mortgage_calc' },
      { pattern: /retir(ement|ing)/i, action: 'open_retirement_calc' },
      { pattern: /merge\s*pdf/i, action: 'open_pdf_merge' },
      { pattern: /compress\s*image/i, action: 'open_image_compress' },
      { pattern: /tax\s*return/i, action: 'open_tax_calc' }
    ];
  }

  async init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      
      this.recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(r => r[0].transcript)
          .join(' ');
        
        this.analyzeIntent(transcript);
      };
      
      this.recognition.start();
    }
  }

  analyzeIntent(text) {
    for (const { pattern, action } of this.intentPatterns) {
      if (pattern.test(text)) {
        console.log('[Ambient] Detected intent:', action, 'from:', text);
        this.triggerAction(action);
        break;
      }
    }
  }

  triggerAction(action) {
    const actions = {
      open_mortgage_calc: () => window.location.href = '/src/tools/finance/mortgage-tr/',
      open_retirement_calc: () => window.location.href = '/src/tools/finance/retirement/',
      open_pdf_merge: () => window.location.href = '/src/tools/pdf/merge/',
      open_image_compress: () => window.location.href = '/src/tools/image/compress/'
    };
    
    actions[action]?.();
  }
}
