const WebSocket = require('ws');
const http = require('http');
const dotenv = require('dotenv');

dotenv.config();

const port = process.env.PORT || 8765;

// Create a server instance
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end();
});

const wss = new WebSocket.Server({ server });

let sender = null;
const viewers = new Set();
let audioSender = null;
const audioViewers = new Set();

wss.on('connection', function connection(ws) {
  let role = null;

  ws.on('message', function incoming(message) {
    if (!role) {
      role = message.toString();
      if (role === 'audio') {
        audioSender = ws;
        console.log('Audio sender connected');
        ws.on('close', () => {
          audioSender = null;
        });
      } else if (role === 'audioviewer') {
        audioViewers.add(ws);
        console.log('Audio viewer connected');
        ws.on('close', () => {
          audioViewers.delete(ws);
        });
      }
      if (role === 'sender') {
        sender = ws;
        console.log('Sender connected');
        ws.on('close', () => {
          sender = null;
          console.log('Sender disconnected');
        });
      } else if (role === 'viewer') {
        viewers.add(ws);
        console.log('Viewer connected');
        ws.on('close', () => {
          viewers.delete(ws);
          console.log('Viewer disconnected');
        });
      }
      return;
    }

    if (role === 'sender') {
      for (const viewer of viewers) {
        if (viewer.readyState === WebSocket.OPEN) {
            viewer.send(message);
        }
      }
    } else if (role === 'viewer') {
      if (sender && sender.readyState === WebSocket.OPEN) {
        sender.send(message);
      }
    }else if (role === 'audio') {
      for (const viewer of audioViewers) {
        if (viewer.readyState === WebSocket.OPEN) {
          viewer.send(message);
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

const shutdown = () => {
  console.log('Shutting down WebSocket server...');
  wss.clients.forEach((client) => {
    client.close();
  });
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(port, () => {
  console.log(`✅ WebSocket server running at wss://screenshare-server:${port}`);
});
