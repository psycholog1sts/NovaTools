/**
 * WebRTC P2P Collaboration Layer
 * Real-time multi-user collaboration without central server
 * Uses mesh topology for small groups (<8 users), star for larger
 */

// WebRTC configuration
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Free public STUN servers - no TURN needed for same-network collaboration
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

// Message types
const MSG_TYPES = {
  CURSOR: 'cursor',          // Cursor position
  SELECTION: 'selection',    // Text/element selection
  STATE: 'state',            // Tool state update
  FILE_OFFER: 'file_offer',  // P2P file transfer offer
  FILE_ANSWER: 'file_answer',// P2P file transfer answer
  FILE_CHUNK: 'file_chunk',  // File data chunk
  PRESENCE: 'presence',      // User joined/left
  CHAT: 'chat',              // Text chat message
  CURSOR_ANNOTATION: 'cursor_annotation', // Drawing/cursor trail
  FOCUS: 'focus'             // Element focus
};

// P2P Collaboration Session
export class CollaborationSession {
  constructor(sessionId, userId, userName) {
    this.sessionId = sessionId;
    this.userId = userId || this.generateId();
    this.userName = userName || 'Anonymous';
    this.peers = new Map(); // userId -> { pc, dc, state }
    this.userStates = new Map(); // userId -> user info
    this.listeners = new Map();
    this.isHost = false;
    this.meshMode = true; // Use mesh for small groups
    this.maxMeshSize = 8;
    this.fileTransfers = new Map();
  }

  generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * Generate session invite code
   */
  getInviteCode() {
    // Encode session info for sharing
    const data = {
      s: this.sessionId,
      h: this.userId,
      t: Date.now()
    };
    return btoa(JSON.stringify(data)).replace(/[+/=]/g, c => 
      c === '+' ? '-' : c === '/' ? '_' : '');
  }

  /**
   * Parse invite code
   */
  static parseInviteCode(code) {
    try {
      const normalized = code.replace(/[-_]/g, c => 
        c === '-' ? '+' : c === '_' ? '/' : c);
      const data = JSON.parse(atob(normalized));
      
      // Check expiry (24 hours)
      if (Date.now() - data.t > 24 * 60 * 60 * 1000) {
        throw new Error('Invite expired');
      }
      
      return { sessionId: data.s, hostId: data.h };
    } catch (e) {
      throw new Error('Invalid invite code');
    }
  }

  /**
   * Initialize as host
   */
  async host() {
    this.isHost = true;
    this.sessionId = this.sessionId || this.generateId();
    
    // Set up signaling via BroadcastChannel (same-device) or QR code (cross-device)
    this.initSignaling();
    
    this.emit('hosted', {
      sessionId: this.sessionId,
      inviteCode: this.getInviteCode()
    });
    
    return this.getInviteCode();
  }

  /**
   * Join existing session
   */
  async join(inviteCode) {
    const { sessionId, hostId } = CollaborationSession.parseInviteCode(inviteCode);
    this.sessionId = sessionId;
    
    // Create peer connection to host
    await this.connectToPeer(hostId, true);
    
    this.emit('joined', { sessionId, hostId });
  }

  /**
   * Initialize signaling (using various methods)
   */
  initSignaling() {
    // Method 1: BroadcastChannel for same-browser tabs
    if (typeof BroadcastChannel !== 'undefined') {
      this.signalChannel = new BroadcastChannel(`collab-${this.sessionId}`);
      this.signalChannel.onmessage = (e) => this.handleSignal(e.data);
    }
    
    // Method 2: QR code scanning for cross-device (handled by UI layer)
  }

  /**
   * Handle incoming signal
   */
  async handleSignal(data) {
    const { from, type, payload } = data;
    
    switch (type) {
      case 'offer':
        await this.handleOffer(from, payload);
        break;
      case 'answer':
        await this.handleAnswer(from, payload);
        break;
      case 'ice':
        await this.handleIceCandidate(from, payload);
        break;
      case 'join-request':
        await this.handleJoinRequest(from);
        break;
    }
  }

  /**
   * Send signal
   */
  sendSignal(to, type, payload) {
    const signal = { from: this.userId, to, type, payload };
    
    if (this.signalChannel) {
      this.signalChannel.postMessage(signal);
    }
    
    // Also emit for external signaling (QR, etc.)
    this.emit('signal', signal);
  }

  /**
   * Connect to a peer
   */
  async connectToPeer(peerId, isInitiator) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.sendSignal(peerId, 'ice', e.candidate);
      }
    };
    
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        this.emit('peer-connected', { peerId });
      } else if (pc.connectionState === 'disconnected') {
        this.removePeer(peerId);
      }
    };
    
    // Create data channel if initiator
    let dc;
    if (isInitiator) {
      dc = pc.createDataChannel('collab', {
        ordered: false,
        maxRetransmits: 0 // Real-time, drop old packets
      });
      this.setupDataChannel(peerId, dc);
    } else {
      pc.ondatachannel = (e) => {
        this.setupDataChannel(peerId, e.channel);
      };
    }
    
    this.peers.set(peerId, { pc, dc: dc || null, state: 'connecting' });
    
    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.sendSignal(peerId, 'offer', offer);
    }
    
    return pc;
  }

  /**
   * Handle offer
   */
  async handleOffer(from, offer) {
    const pc = await this.connectToPeer(from, false);
    await pc.setRemoteDescription(offer);
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    this.sendSignal(from, 'answer', answer);
  }

  /**
   * Handle answer
   */
  async handleAnswer(from, answer) {
    const peer = this.peers.get(from);
    if (peer) {
      await peer.pc.setRemoteDescription(answer);
    }
  }

  /**
   * Handle ICE candidate
   */
  async handleIceCandidate(from, candidate) {
    const peer = this.peers.get(from);
    if (peer) {
      await peer.pc.addIceCandidate(candidate);
    }
  }

  /**
   * Handle join request (host only)
   */
  async handleJoinRequest(from) {
    // If mesh mode and too many peers, suggest new peer connect to existing peer
    if (this.meshMode && this.peers.size >= this.maxMeshSize) {
      // Switch to star topology or reject
      this.emit('mesh-full', { peerId: from });
      return;
    }
    
    await this.connectToPeer(from, true);
  }

  /**
   * Setup data channel
   */
  setupDataChannel(peerId, dc) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.dc = dc;
    }
    
    dc.onopen = () => {
      this.emit('peer-ready', { peerId });
      
      // Send presence info
      this.sendToPeer(peerId, MSG_TYPES.PRESENCE, {
        userId: this.userId,
        userName: this.userName,
        action: 'join'
      });
    };
    
    dc.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      this.handleMessage(peerId, msg);
    };
    
    dc.onclose = () => {
      this.removePeer(peerId);
    };
  }

  /**
   * Remove peer
   */
  removePeer(peerId) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.pc.close();
      this.peers.delete(peerId);
      this.userStates.delete(peerId);
      this.emit('peer-left', { peerId });
    }
  }

  /**
   * Send message to specific peer
   */
  sendToPeer(peerId, type, payload) {
    const peer = this.peers.get(peerId);
    if (peer?.dc?.readyState === 'open') {
      peer.dc.send(JSON.stringify({ type, payload, from: this.userId }));
    }
  }

  /**
   * Broadcast to all peers
   */
  broadcast(type, payload) {
    this.peers.forEach((peer, peerId) => {
      this.sendToPeer(peerId, type, payload);
    });
  }

  /**
   * Handle incoming message
   */
  handleMessage(from, msg) {
    const { type, payload } = msg;
    
    switch (type) {
      case MSG_TYPES.PRESENCE:
        this.userStates.set(from, {
          userId: payload.userId,
          userName: payload.userName,
          joinedAt: Date.now()
        });
        this.emit('user-joined', payload);
        break;
        
      case MSG_TYPES.CURSOR:
        this.emit('cursor-move', { userId: from, ...payload });
        break;
        
      case MSG_TYPES.SELECTION:
        this.emit('selection-change', { userId: from, ...payload });
        break;
        
      case MSG_TYPES.STATE:
        this.emit('state-update', { userId: from, ...payload });
        break;
        
      case MSG_TYPES.CHAT:
        this.emit('chat-message', { userId: from, ...payload });
        break;
        
      case MSG_TYPES.FILE_OFFER:
        this.handleFileOffer(from, payload);
        break;
        
      case MSG_TYPES.FILE_ANSWER:
        this.handleFileAnswer(from, payload);
        break;
        
      case MSG_TYPES.FILE_CHUNK:
        this.handleFileChunk(from, payload);
        break;
    }
    
    // Re-broadcast if in mesh mode (flood routing for small networks)
    if (this.meshMode) {
      this.peers.forEach((peer, peerId) => {
        if (peerId !== from) {
          this.sendToPeer(peerId, type, payload);
        }
      });
    }
  }

  /**
   * Send cursor position
   */
  sendCursor(x, y, toolId) {
    this.broadcast(MSG_TYPES.CURSOR, { x, y, toolId, timestamp: Date.now() });
  }

  /**
   * Send selection
   */
  sendSelection(selection, toolId) {
    this.broadcast(MSG_TYPES.SELECTION, { selection, toolId });
  }

  /**
   * Send state update
   */
  sendState(state, toolId) {
    this.broadcast(MSG_TYPES.STATE, { state, toolId });
  }

  /**
   * Send chat message
   */
  sendChat(text) {
    this.broadcast(MSG_TYPES.CHAT, { 
      text, 
      userName: this.userName,
      timestamp: Date.now() 
    });
  }

  /**
   * Send file via data channel (P2P file transfer)
   */
  async sendFile(file, peerId = null) {
    const CHUNK_SIZE = 16384; // 16KB chunks
    const fileId = this.generateId();
    
    const metadata = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type
    };
    
    // Send offer
    const targets = peerId ? [peerId] : Array.from(this.peers.keys());
    
    for (const target of targets) {
      this.sendToPeer(target, MSG_TYPES.FILE_OFFER, metadata);
    }
    
    // Wait for answers and send chunks
    this.fileTransfers.set(fileId, { file, chunks: Math.ceil(file.size / CHUNK_SIZE) });
  }

  handleFileOffer(from, metadata) {
    this.emit('file-offer', { from, ...metadata });
  }

  handleFileAnswer(from, { fileId, accepted }) {
    if (accepted) {
      this.startFileTransfer(from, fileId);
    }
  }

  async startFileTransfer(peerId, fileId) {
    const transfer = this.fileTransfers.get(fileId);
    if (!transfer) return;
    
    const { file, chunks } = transfer;
    const CHUNK_SIZE = 16384;
    
    for (let i = 0; i < chunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      
      const buffer = await chunk.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      
      this.sendToPeer(peerId, MSG_TYPES.FILE_CHUNK, {
        fileId,
        index: i,
        total: chunks,
        data: base64
      });
      
      // Throttle to prevent overwhelming connection
      await new Promise(r => setTimeout(r, 1));
    }
  }

  handleFileChunk(from, { fileId, index, total, data }) {
    this.emit('file-chunk', { from, fileId, index, total, data });
  }

  /**
   * Get all connected users
   */
  getUsers() {
    return Array.from(this.userStates.entries()).map(([id, info]) => ({
      userId: id,
      ...info
    }));
  }

  /**
   * Event handling
   */
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

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    this.broadcast(MSG_TYPES.PRESENCE, {
      userId: this.userId,
      action: 'leave'
    });
    
    this.peers.forEach((peer) => {
      peer.pc.close();
    });
    this.peers.clear();
    
    if (this.signalChannel) {
      this.signalChannel.close();
    }
    
    this.emit('disconnected');
  }
}

// Presence cursors manager
export class PresenceCursors {
  constructor(container, session) {
    this.container = container;
    this.session = session;
    this.cursors = new Map();
    this.labels = new Map();
    
    session.on('cursor-move', ({ userId, x, y, userName }) => {
      this.updateCursor(userId, x, y, userName);
    });
    
    session.on('user-joined', ({ userId, userName }) => {
      this.createCursor(userId, userName);
    });
    
    session.on('peer-left', ({ peerId }) => {
      this.removeCursor(peerId);
    });
  }

  createCursor(userId, userName) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    const color = colors[Math.abs(userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length];
    
    const cursor = document.createElement('div');
    cursor.className = 'presence-cursor';
    cursor.style.cssText = `
      position: absolute;
      width: 20px;
      height: 20px;
      pointer-events: none;
      z-index: 9999;
      transition: transform 0.1s ease-out;
    `;
    cursor.innerHTML = `
      <svg viewBox="0 0 24 24" fill="${color}">
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"/>
      </svg>
      <span style="
        position: absolute;
        top: 18px;
        left: 18px;
        background: ${color};
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
      ">${userName}</span>
    `;
    
    this.container.appendChild(cursor);
    this.cursors.set(userId, cursor);
    this.labels.set(userId, userName);
  }

  updateCursor(userId, x, y, userName) {
    if (!this.cursors.has(userId)) {
      this.createCursor(userId, userName || this.labels.get(userId) || 'User');
    }
    
    const cursor = this.cursors.get(userId);
    cursor.style.transform = `translate(${x}px, ${y}px)`;
  }

  removeCursor(userId) {
    const cursor = this.cursors.get(userId);
    if (cursor) {
      cursor.remove();
      this.cursors.delete(userId);
      this.labels.delete(userId);
    }
  }
}

// Singleton session manager
let currentSession = null;

export function createCollaborationSession(userName) {
  if (currentSession) {
    currentSession.disconnect();
  }
  
  currentSession = new CollaborationSession(null, null, userName);
  return currentSession;
}

export function getCurrentSession() {
  return currentSession;
}

export function joinCollaboration(inviteCode, userName) {
  if (currentSession) {
    currentSession.disconnect();
  }
  
  currentSession = new CollaborationSession(null, null, userName);
  currentSession.join(inviteCode);
  return currentSession;
}

// Re-export message types
export { MSG_TYPES };
