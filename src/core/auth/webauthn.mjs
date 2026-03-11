/**
 * WebAuthn FIDO2 Authentication
 * Passwordless authentication with hardware security keys
 * Biometric authentication (TouchID, FaceID, Windows Hello)
 */

// Check for WebAuthn support
export function isWebAuthnSupported() {
  return window.PublicKeyCredential !== undefined;
}

// Check for platform authenticator (biometric)
export async function isPlatformAuthenticatorAvailable() {
  if (!isWebAuthnSupported()) return false;
  
  return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
}

/**
 * Convert ArrayBuffer to Base64URL
 */
function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Convert Base64URL to ArrayBuffer
 */
function base64urlToBuffer(base64url) {
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const str = atob(base64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate random challenge
 */
function generateChallenge(length = 32) {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Register new credential (enrollment)
 */
export async function registerCredential(options = {}) {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn not supported');
  }

  const challenge = generateChallenge();
  const userId = options.userId || generateChallenge(16);
  
  const publicKeyOptions = {
    challenge,
    rp: {
      name: options.rpName || 'Zero Tools Platform',
      id: options.rpId || window.location.hostname
    },
    user: {
      id: userId,
      name: options.userName || 'user@example.com',
      displayName: options.displayName || 'User'
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },   // ES256
      { type: 'public-key', alg: -257 }  // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: options.authenticatorAttachment || undefined,
      userVerification: options.userVerification || 'preferred',
      residentKey: options.residentKey || 'preferred',
      requireResidentKey: options.requireResidentKey || false
    },
    attestation: options.attestation || 'none',
    excludeCredentials: options.excludeCredentials || []
  };

  try {
    const credential = await navigator.credentials.create({ publicKey: publicKeyOptions });
    
    // Serialize credential for storage
    const credentialData = {
      id: credential.id,
      rawId: bufferToBase64url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
        attestationObject: bufferToBase64url(credential.response.attestationObject)
      }
    };

    return {
      success: true,
      credential: credentialData,
      challenge: bufferToBase64url(challenge)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      name: error.name
    };
  }
}

/**
 * Authenticate with existing credential
 */
export async function authenticate(allowCredentials = [], options = {}) {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn not supported');
  }

  const challenge = generateChallenge();
  
  const publicKeyOptions = {
    challenge,
    allowCredentials: allowCredentials.map(cred => ({
      type: 'public-key',
      id: base64urlToBuffer(cred.id),
      transports: cred.transports || ['internal', 'usb', 'nfc', 'ble']
    })),
    userVerification: options.userVerification || 'preferred',
    timeout: options.timeout || 60000,
    rpId: options.rpId || window.location.hostname
  };

  try {
    const assertion = await navigator.credentials.get({ publicKey: publicKeyOptions });
    
    // Serialize assertion
    const assertionData = {
      id: assertion.id,
      rawId: bufferToBase64url(assertion.rawId),
      type: assertion.type,
      response: {
        authenticatorData: bufferToBase64url(assertion.response.authenticatorData),
        clientDataJSON: bufferToBase64url(assertion.response.clientDataJSON),
        signature: bufferToBase64url(assertion.response.signature),
        userHandle: assertion.response.userHandle ? 
          bufferToBase64url(assertion.response.userHandle) : null
      }
    };

    return {
      success: true,
      assertion: assertionData,
      challenge: bufferToBase64url(challenge)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      name: error.name
    };
  }
}

// Local credential store (using IndexedDB)
class CredentialStore {
  constructor() {
    this.dbName = 'WebAuthnCredentials';
    this.storeName = 'credentials';
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveCredential(credential, userId) {
    const db = await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const data = {
        ...credential,
        userId,
        createdAt: Date.now(),
        lastUsed: null
      };
      
      const request = store.put(data);
      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  async getCredentials(userId) {
    const db = await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('userId');
      
      const request = index.getAll(userId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCredential(id) {
    const db = await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateLastUsed(id) {
    const db = await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (data) {
          data.lastUsed = Date.now();
          store.put(data);
        }
        resolve();
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
}

// WebAuthn Manager
export class WebAuthnManager {
  constructor() {
    this.store = new CredentialStore();
    this.userId = null;
  }

  /**
   * Check if platform authenticator (TouchID, FaceID, Windows Hello) is available
   */
  async isBiometricAvailable() {
    return isPlatformAuthenticatorAvailable();
  }

  /**
   * Register biometric authentication
   */
  async registerBiometric(userName, displayName) {
    const result = await registerCredential({
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      userName,
      displayName,
      rpName: 'Zero Tools Platform'
    });

    if (result.success) {
      // Store credential locally
      const userId = `user-${Date.now()}`;
      this.userId = userId;
      await this.store.saveCredential(result.credential, userId);
      
      return {
        success: true,
        credentialId: result.credential.id,
        userId
      };
    }

    return result;
  }

  /**
   * Register security key
   */
  async registerSecurityKey(userName, displayName) {
    const result = await registerCredential({
      authenticatorAttachment: 'cross-platform',
      userVerification: 'discouraged',
      userName,
      displayName,
      rpName: 'Zero Tools Platform'
    });

    if (result.success) {
      const userId = `user-${Date.now()}`;
      this.userId = userId;
      await this.store.saveCredential(result.credential, userId);
      
      return {
        success: true,
        credentialId: result.credential.id,
        userId
      };
    }

    return result;
  }

  /**
   * Authenticate with stored credentials
   */
  async authenticate(userId = null) {
    const targetUserId = userId || this.userId;
    
    if (!targetUserId) {
      // Try to authenticate with any available credential
      return authenticate([], {
        userVerification: 'preferred'
      });
    }

    const credentials = await this.store.getCredentials(targetUserId);
    
    if (credentials.length === 0) {
      return {
        success: false,
        error: 'No credentials found'
      };
    }

    const result = await authenticate(credentials, {
      userVerification: 'preferred'
    });

    if (result.success && result.assertion) {
      // Update last used
      await this.store.updateLastUsed(result.assertion.id);
    }

    return result;
  }

  /**
   * List registered credentials
   */
  async listCredentials(userId = null) {
    const targetUserId = userId || this.userId;
    if (!targetUserId) return [];
    
    return this.store.getCredentials(targetUserId);
  }

  /**
   * Remove credential
   */
  async removeCredential(credentialId) {
    await this.store.deleteCredential(credentialId);
  }
}

// Passwordless Auth Flow
export class PasswordlessAuth {
  constructor() {
    this.manager = new WebAuthnManager();
    this.state = 'idle';
  }

  /**
   * Start registration flow
   */
  async startRegistration(userName) {
    const isBiometric = await this.manager.isBiometricAvailable();
    
    this.state = 'registering';
    
    if (isBiometric) {
      return this.manager.registerBiometric(userName, userName);
    } else {
      return this.manager.registerSecurityKey(userName, userName);
    }
  }

  /**
   * Start authentication flow
   */
  async startAuthentication() {
    this.state = 'authenticating';
    return this.manager.authenticate();
  }

  /**
   * Auto-authenticate if credentials exist
   */
  async autoAuthenticate() {
    const credentials = await this.manager.listCredentials();
    
    if (credentials.length > 0) {
      return this.startAuthentication();
    }
    
    return {
      success: false,
      error: 'No credentials available'
    };
  }
}

// Singleton instances
let webAuthnManager = null;
let passwordlessAuth = null;

export function getWebAuthnManager() {
  if (!webAuthnManager) webAuthnManager = new WebAuthnManager();
  return webAuthnManager;
}

export function getPasswordlessAuth() {
  if (!passwordlessAuth) passwordlessAuth = new PasswordlessAuth();
  return passwordlessAuth;
}

// Utility exports
export async function setupBiometricAuth(userName) {
  return getPasswordlessAuth().startRegistration(userName);
}

export async function loginWithBiometric() {
  return getPasswordlessAuth().startAuthentication();
}

export async function checkBiometricSupport() {
  return {
    webauthn: isWebAuthnSupported(),
    platform: await isPlatformAuthenticatorAvailable()
  };
}

// Conditional UI for passkey autofill
export async function setupConditionalUI() {
  if (!isWebAuthnSupported()) return false;

  try {
    // This enables the browser's autofill with passkeys
    const abortController = new AbortController();
    
    const options = {
      mediation: 'conditional',
      publicKey: {
        challenge: generateChallenge(),
        allowCredentials: [],
        userVerification: 'preferred'
      }
    };

    // The browser will handle the UI
    const credential = await navigator.credentials.get({
      ...options,
      signal: abortController.signal
    });

    return credential;
  } catch (error) {
    // User cancelled or no credentials
    return null;
  }
}
