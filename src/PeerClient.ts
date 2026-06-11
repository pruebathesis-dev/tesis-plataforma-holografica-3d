import Peer, { DataConnection, MediaConnection } from 'peerjs';

export class PeerClient {
  peer: Peer;
  id: string | null = null;
  conn?: DataConnection;
  call?: MediaConnection;
  private pendingCall?: MediaConnection;

  onOpen?: (id: string) => void;
  onRemoteStream?: (s: MediaStream) => void;
  onFaceData?: (data: any) => void;
  onIncomingCall?: (call: MediaConnection) => void;
  onDataConnected?: () => void;
  onDisconnected?: () => void;

  constructor() {
    this.peer = new Peer(undefined as unknown as string, {
      host: '0.peerjs.com',
      secure: true,
      port: 443
    });

    this.peer.on('open', (id) => {
      this.id = id;
      console.log('🔗 My Peer ID:', id);
      this.onOpen?.(id);
    });

    this.peer.on('call', (call) => {
      this.pendingCall = call;
      this.onIncomingCall?.(call);
    });

    this.peer.on('connection', (conn) => {
      this.wireDataConnection(conn);
    });
  }

  connect(remoteId: string) {
    const conn = this.peer.connect(remoteId);
    this.wireDataConnection(conn);
  }

  private wireDataConnection(conn: DataConnection): void {
    this.conn = conn;

    conn.on('open', () => {
      console.log('📡 Data channel open');
      this.onDataConnected?.();
    });

    conn.on('data', (d: unknown) => this.onFaceData?.(d));

    conn.on('close', () => {
      this.conn = undefined;
      this.onDisconnected?.();
    });
  }

  callPeer(remoteId: string, stream: MediaStream) {
    this.call = this.peer.call(remoteId, stream);
    this.call.on('stream', (s: MediaStream) => this.onRemoteStream?.(s));
    this.call.on('close', () => this.onDisconnected?.());
  }

  answerCall(stream: MediaStream): void {
    const call = this.pendingCall;
    if (!call) return;

    call.answer(stream);
    call.on('stream', (s: MediaStream) => this.onRemoteStream?.(s));
    call.on('close', () => this.onDisconnected?.());
    this.call = call;
    this.pendingCall = undefined;
  }

  sendFaceData(data: unknown) {
    if (this.conn?.open) {
      this.conn.send(data);
    }
  }

  isDataConnected(): boolean {
    return this.conn?.open ?? false;
  }

  hangup() {
    try {
      this.call?.close();
    } catch {
      /* ignore */
    }
    try {
      this.conn?.close();
    } catch {
      /* ignore */
    }
    this.call = undefined;
    this.conn = undefined;
    this.pendingCall = undefined;
  }
}
