/**
 * Advanced Hardware Integration
 * WebHID, Web Serial, Web USB, and Device Orientation APIs
 */

// WebHID Manager for barcode scanners, card readers, etc.
export class HIDManager {
  constructor() {
    this.devices = new Map();
    this.listeners = new Map();
  }

  /**
   * Check if WebHID is supported
   */
  isSupported() {
    return 'hid' in navigator;
  }

  /**
   * Request device access
   */
  async requestDevice(filters = []) {
    if (!this.isSupported()) {
      throw new Error('WebHID not supported');
    }

    const defaultFilters = [
      { vendorId: 0x1234, productId: 0x5678 }, // Example scanner
      { usagePage: 0x01, usage: 0x06 },        // Generic keyboard
      { usagePage: 0x8C, usage: 0x01 }         // Barcode scanner
    ];

    const devices = await navigator.hid.requestDevice({
      filters: filters.length > 0 ? filters : defaultFilters
    });

    for (const device of devices) {
      this.devices.set(device.productId, device);
      this.setupDevice(device);
    }

    return devices;
  }

  /**
   * Get previously authorized devices
   */
  async getDevices() {
    if (!this.isSupported()) return [];
    
    const devices = await navigator.hid.getDevices();
    
    for (const device of devices) {
      if (!this.devices.has(device.productId)) {
        this.devices.set(device.productId, device);
        this.setupDevice(device);
      }
    }
    
    return devices;
  }

  /**
   * Setup device event handlers
   */
  async setupDevice(device) {
    if (device.opened) return;

    try {
      await device.open();
      
      device.addEventListener('inputreport', (e) => {
        this.handleInputReport(device, e);
      });

      this.emit('device-connected', {
        productId: device.productId,
        productName: device.productName,
        vendorId: device.vendorId
      });
    } catch (error) {
      console.error('Failed to open HID device:', error);
    }
  }

  /**
   * Handle input report from device
   */
  handleInputReport(device, event) {
    const { data, reportId } = event;
    const bytes = new Uint8Array(data.buffer);

    // Parse based on device type
    let parsed;
    
    if (this.isBarcodeScanner(device)) {
      parsed = this.parseBarcodeData(bytes);
    } else if (this.isCardReader(device)) {
      parsed = this.parseCardData(bytes);
    } else {
      parsed = { raw: bytes };
    }

    this.emit('input', {
      device: device.productId,
      reportId,
      data: parsed,
      timestamp: Date.now()
    });
  }

  isBarcodeScanner(device) {
    return device.productName.toLowerCase().includes('scanner') ||
           device.productName.toLowerCase().includes('barcode');
  }

  isCardReader(device) {
    return device.productName.toLowerCase().includes('reader') ||
           device.productName.toLowerCase().includes('card');
  }

  parseBarcodeData(bytes) {
    // Most barcode scanners send data as keyboard HID reports
    // This is a simplified parser
    const chars = [];
    for (let i = 0; i < bytes.length; i += 8) {
      const modifier = bytes[i];
      const keycode = bytes[i + 2];
      
      if (keycode > 0) {
        const char = this.hidToAscii(keycode, modifier);
        if (char) chars.push(char);
      }
    }
    
    return {
      type: 'barcode',
      data: chars.join('')
    };
  }

  parseCardData(bytes) {
    // Smart card reader data
    return {
      type: 'card',
      atr: Array.from(bytes.slice(0, 6)).map(b => b.toString(16)).join(' '),
      data: bytes
    };
  }

  hidToAscii(keycode, modifier) {
    // Simplified HID to ASCII mapping
    const map = {
      0x04: 'a', 0x05: 'b', 0x06: 'c', 0x07: 'd', 0x08: 'e', 0x09: 'f',
      0x0A: 'g', 0x0B: 'h', 0x0C: 'i', 0x0D: 'j', 0x0E: 'k', 0x0F: 'l',
      0x10: 'm', 0x11: 'n', 0x12: 'o', 0x13: 'p', 0x14: 'q', 0x15: 'r',
      0x16: 's', 0x17: 't', 0x18: 'u', 0x19: 'v', 0x1A: 'w', 0x1B: 'x',
      0x1C: 'y', 0x1D: 'z',
      0x1E: '1', 0x1F: '2', 0x20: '3', 0x21: '4', 0x22: '5', 0x23: '6',
      0x24: '7', 0x25: '8', 0x26: '9', 0x27: '0',
      0x28: '\n', 0x2C: ' ', 0x2D: '-', 0x2E: '=', 0x2F: '[', 0x30: ']'
    };
    
    let char = map[keycode];
    if (char && (modifier & 0x02 || modifier & 0x20)) {
      char = char.toUpperCase();
    }
    return char;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  async disconnect() {
    for (const device of this.devices.values()) {
      if (device.opened) {
        await device.close();
      }
    }
    this.devices.clear();
  }
}

// Web Serial Manager for Arduino, sensors, etc.
export class SerialManager {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.listeners = new Map();
    this.reading = false;
  }

  isSupported() {
    return 'serial' in navigator;
  }

  async requestPort(filters = []) {
    if (!this.isSupported()) {
      throw new Error('Web Serial not supported');
    }

    const port = await navigator.serial.requestPort({
      filters: filters.length > 0 ? filters : [
        { usbVendorId: 0x2341 }, // Arduino
        { usbVendorId: 0x2A03 }, // Arduino (old)
        { usbVendorId: 0x10C4 }, // CP210x
        { usbVendorId: 0x1A86 }  // CH340
      ]
    });

    this.port = port;
    return port;
  }

  async connect(options = {}) {
    if (!this.port) {
      throw new Error('No port selected');
    }

    await this.port.open({
      baudRate: options.baudRate || 115200,
      dataBits: options.dataBits || 8,
      stopBits: options.stopBits || 1,
      parity: options.parity || 'none',
      bufferSize: options.bufferSize || 255
    });

    this.setupReading();
    
    this.emit('connected', {
      baudRate: options.baudRate || 115200
    });
  }

  async setupReading() {
    if (this.reading) return;
    this.reading = true;

    const textDecoder = new TextDecoderStream();
    this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    try {
      while (this.port.readable && this.reading) {
        const { value, done } = await this.reader.read();
        if (done) break;
        
        this.emit('data', value);
        
        // Try to parse as JSON
        try {
          const lines = value.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const json = JSON.parse(line.trim());
              this.emit('json', json);
            }
          }
        } catch (e) {
          // Not JSON, treat as raw data
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Serial read error:', error);
        this.emit('error', error);
      }
    }
  }

  async write(data) {
    if (!this.port || !this.port.writable) {
      throw new Error('Port not writable');
    }

    const writer = this.port.writable.getWriter();
    
    try {
      const encoder = new TextEncoder();
      const bytes = typeof data === 'string' ? encoder.encode(data) : data;
      await writer.write(bytes);
    } finally {
      writer.releaseLock();
    }
  }

  async writeJSON(obj) {
    return this.write(`${JSON.stringify(obj)  }\n`);
  }

  async disconnect() {
    this.reading = false;
    
    if (this.reader) {
      await this.reader.cancel();
      await this.readableStreamClosed.catch(() => {});
      this.reader = null;
    }

    if (this.port) {
      await this.port.close();
      this.port = null;
    }

    this.emit('disconnected');
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

// Device Orientation for gesture control
export class OrientationManager {
  constructor() {
    this.listeners = new Map();
    this.isTracking = false;
    this.calibration = null;
  }

  isSupported() {
    return 'DeviceOrientationEvent' in window;
  }

  async requestPermission() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await DeviceOrientationEvent.requestPermission();
      return permission === 'granted';
    }
    return true;
  }

  async startTracking() {
    if (this.isTracking) return;
    
    const permitted = await this.requestPermission();
    if (!permitted) {
      throw new Error('Orientation permission denied');
    }

    this.handler = (e) => this.handleOrientation(e);
    window.addEventListener('deviceorientation', this.handler);
    this.isTracking = true;

    // Also listen to motion for shake detection
    this.motionHandler = (e) => this.handleMotion(e);
    window.addEventListener('devicemotion', this.motionHandler);
  }

  stopTracking() {
    if (!this.isTracking) return;
    
    window.removeEventListener('deviceorientation', this.handler);
    window.removeEventListener('devicemotion', this.motionHandler);
    this.isTracking = false;
  }

  handleOrientation(event) {
    const { alpha, beta, gamma, absolute } = event;
    
    this.emit('orientation', {
      alpha: alpha || 0,   // Z-axis rotation (0-360)
      beta: beta || 0,     // X-axis tilt (-180 to 180)
      gamma: gamma || 0,   // Y-axis tilt (-90 to 90)
      absolute
    });

    // Detect tilt gestures
    if (Math.abs(beta) > 150) {
      this.emit('gesture', { type: 'upsidedown' });
    } else if (beta > 60) {
      this.emit('gesture', { type: 'tilt_forward' });
    } else if (beta < -60) {
      this.emit('gesture', { type: 'tilt_backward' });
    }
  }

  handleMotion(event) {
    const { acceleration, rotationRate, interval } = event;
    
    // Shake detection
    const threshold = 15;
    const magnitude = Math.sqrt(
      Math.pow(acceleration.x || 0, 2) +
      Math.pow(acceleration.y || 0, 2) +
      Math.pow(acceleration.z || 0, 2)
    );

    if (magnitude > threshold) {
      this.emit('gesture', { type: 'shake', magnitude });
    }

    this.emit('motion', {
      acceleration,
      rotationRate,
      interval
    });
  }

  calibrate() {
    // Store current orientation as "zero"
    return new Promise((resolve) => {
      const handler = (e) => {
        this.calibration = {
          alpha: e.alpha || 0,
          beta: e.beta || 0,
          gamma: e.gamma || 0
        };
        window.removeEventListener('deviceorientation', handler);
        resolve(this.calibration);
      };
      window.addEventListener('deviceorientation', handler);
    });
  }

  getRelativeOrientation(event) {
    if (!this.calibration) return event;
    
    return {
      alpha: (event.alpha || 0) - this.calibration.alpha,
      beta: (event.beta || 0) - this.calibration.beta,
      gamma: (event.gamma || 0) - this.calibration.gamma
    };
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

// Vibration API for haptic feedback
export class Haptics {
  isSupported() {
    return 'vibrate' in navigator;
  }

  vibrate(pattern) {
    if (!this.isSupported()) return false;
    
    navigator.vibrate(pattern);
    return true;
  }

  // Predefined patterns
  success() {
    return this.vibrate([50, 100, 50]);
  }

  error() {
    return this.vibrate([100, 50, 100, 50, 100]);
  }

  warning() {
    return this.vibrate([80, 30, 80]);
  }

  light() {
    return this.vibrate(10);
  }

  heavy() {
    return this.vibrate(50);
  }

  // Progress indicator
  progress(percent) {
    const duration = Math.floor(percent * 100);
    return this.vibrate([duration, 50, 20]);
  }
}

// Singleton exports
let hidManager = null;
let serialManager = null;
let orientationManager = null;
let haptics = null;

export function getHIDManager() {
  if (!hidManager) hidManager = new HIDManager();
  return hidManager;
}

export function getSerialManager() {
  if (!serialManager) serialManager = new SerialManager();
  return serialManager;
}

export function getOrientationManager() {
  if (!orientationManager) orientationManager = new OrientationManager();
  return orientationManager;
}

export function getHaptics() {
  if (!haptics) haptics = new Haptics();
  return haptics;
}

// Utility exports
export async function scanBarcode() {
  const hid = getHIDManager();
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Scan timeout'));
    }, 30000);

    const cleanup = hid.on('input', (data) => {
      if (data.data.type === 'barcode') {
        clearTimeout(timeout);
        cleanup();
        resolve(data.data.data);
      }
    });

    hid.requestDevice().catch(reject);
  });
}

export async function connectArduino(baudRate = 115200) {
  const serial = getSerialManager();
  await serial.requestPort();
  await serial.connect({ baudRate });
  return serial;
}

export function vibrate(pattern) {
  return getHaptics().vibrate(pattern);
}

export async function startGestureTracking() {
  const orientation = getOrientationManager();
  await orientation.startTracking();
  return orientation;
}
