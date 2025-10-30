export class WSClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.onMessage = () => {};
    this.onOpen = () => {};
  }


  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => this.onOpen();
    this.ws.onmessage = (e) => {
      try { const data = JSON.parse(e.data); this.onMessage(data); } catch {}
    };
    this.ws.onclose = () => { /* optional reconnect logic */ };
  }


  send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }


  close() { if (this.ws) this.ws.close(); }
}





