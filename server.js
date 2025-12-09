const express = require('express');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');
const QRCode = require('qrcode');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Available sounds mapped to amounts
const SOUND_MAP = {
  100: { id: 'airhorn', name: 'Air Horn', file: 'airhorn.mp3' },
  200: { id: 'drumroll', name: 'Drum Roll', file: 'drumroll.mp3' },
  300: { id: 'tada', name: 'Ta-Da!', file: 'tada.mp3' },
  400: { id: 'crickets', name: 'Crickets', file: 'crickets.mp3' },
};

// LNURL addresses (to be configured via .env)
const LNURL_ADDRESSES = process.env.LNURL_ADDRESSES
  ? process.env.LNURL_ADDRESSES.split(',').map(addr => addr.trim())
  : ['lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcenxc6r2c35xvukxefcv5mkvv34x5ekzd3ev56nyd3hxqurzepexejxxepnxscrvwfnv9nxzcn9xq6xyefhvgcxxcmyxymnserxfq5fns'];

// Connect to payment service WebSocket
const PAYMENT_WS_URL = process.env.PAYMENT_WS_URL || 'wss://tornode.brodie.rocks/api/v1/ws/XcYK345aEjsURLa8jwXT5j';
let paymentWs = null;

function connectToPaymentService() {
  console.log(`🔗 Connecting to payment service: ${PAYMENT_WS_URL}`);

  paymentWs = new WebSocket(PAYMENT_WS_URL);

  paymentWs.on('open', () => {
    console.log('✅ Connected to payment service WebSocket');
  });

  paymentWs.on('message', (data) => {
    try {
      const messageStr = data.toString();
      console.log('📥 Payment WebSocket message received:', messageStr);

      // Try to parse as JSON, if it fails, treat as plain text
      let message;
      try {
        message = JSON.parse(messageStr);
      } catch {
        // Plain text message, treat as the amount directly
        message = { message: messageStr };
      }

      handlePaymentNotification(message);
    } catch (error) {
      console.error('❌ Error handling payment message:', error);
    }
  });

  paymentWs.on('close', () => {
    console.log('❌ Payment WebSocket disconnected. Reconnecting in 5s...');
    setTimeout(connectToPaymentService, 5000);
  });

  paymentWs.on('error', (error) => {
    console.error('❌ Payment WebSocket error:', error);
  });
}

// Handle payment notification from payment service
function handlePaymentNotification(message) {
  console.log('💳 Processing payment notification:', message);

  // Extract the amount from the message - adjust based on actual payload structure
  const messageText = message.message || message.amount || message.memo || message.comment || JSON.stringify(message);
  console.log('📝 Message text:', messageText);

  // Extract the first number from the message
  const match = messageText.toString().match(/^(\d+)/);

  if (!match) {
    console.log('⚠️  No amount found in payment notification');
    return;
  }

  const amount = parseInt(match[1]);
  const sound = SOUND_MAP[amount];

  if (!sound) {
    console.log(`⚠️  No sound mapped for amount: ${amount}`);
    return;
  }

  console.log(`🔊 Playing sound: ${sound.name} (${amount} sats)`);

  // Broadcast to all connected browser clients
  broadcast({
    type: 'play-sound',
    amount,
    soundId: sound.id,
    soundName: sound.name,
    soundFile: sound.file
  });
}

// Connect to payment service on startup
connectToPaymentService();

// WebSocket connection handler for browser clients
wss.on('connection', (ws) => {
  console.log('🔌 Browser client connected to WebSocket');

  ws.on('close', () => {
    console.log('🔌 Browser client disconnected from WebSocket');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast to all connected WebSocket clients
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// API Routes

// Get sound mapping
app.get('/api/sounds', (req, res) => {
  res.json(Object.entries(SOUND_MAP).map(([amount, sound]) => ({
    amount: parseInt(amount),
    ...sound
  })));
});

// Get LNURL addresses
app.get('/api/lnurl', (req, res) => {
  res.json({ addresses: LNURL_ADDRESSES });
});

// Generate QR code for an LNURL address
app.get('/api/qr/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index) || 0;
    const address = LNURL_ADDRESSES[index];

    if (!address) {
      return res.status(404).json({ error: 'LNURL address not found' });
    }

    const qrCode = await QRCode.toDataURL(address.toUpperCase(), {
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({ qrCode, address });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

server.listen(PORT, () => {
  console.log(`🎵 Webhook Soundboard server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready`);
  console.log(`📱 LNURL addresses configured: ${LNURL_ADDRESSES.length}`);
  console.log(`\nSound mapping:`);
  Object.entries(SOUND_MAP).forEach(([amount, sound]) => {
    console.log(`  ${amount} sats → ${sound.name}`);
  });
});
