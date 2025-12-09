# ⚡ Webhook Soundboard

A Lightning-enabled soundboard that plays sounds based on webhook payments. Display LNURL QR codes and trigger sound effects when payments arrive.

## Features

- Display LNURL payment QR codes
- WebSocket-based real-time sound triggering
- Webhook endpoint receives payment notifications
- Automatic sound mapping based on payment amount
- Clean, responsive UI

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
```

Edit `.env` and add your LNURL addresses (comma-separated for multiple):
```
LNURL_ADDRESSES=lnurl1...,lnurl2...
PORT=3000
```

3. **Add sound files:**

Place your MP3 sound files in `public/sounds/` directory:
- `airhorn.mp3` (100 sats)
- `drumroll.mp3` (200 sats)
- `tada.mp3` (300 sats)
- `crickets.mp3` (400 sats)

4. **Run the server:**
```bash
npm start
```

5. **Open the soundboard:**

Navigate to `http://localhost:3000` in your browser.

## How It Works

1. Page displays LNURL QR code(s) for payment
2. Browser connects to WebSocket server
3. User scans QR code and pays (with amount like 100, 200, 300, or 400 sats)
4. Payment service sends webhook to `/api/webhook` with message like `100-1000`
5. Server extracts the first number (100) and broadcasts via WebSocket
6. Browser plays the corresponding sound effect

## Sound Mapping

Configure which sounds play for each amount in `server.js`:

```javascript
const SOUND_MAP = {
  100: { id: 'airhorn', name: 'Air Horn', file: 'airhorn.mp3' },
  200: { id: 'drumroll', name: 'Drum Roll', file: 'drumroll.mp3' },
  300: { id: 'tada', name: 'Ta-Da!', file: 'tada.mp3' },
  400: { id: 'crickets', name: 'Crickets', file: 'crickets.mp3' },
};
```

## Webhook API

### POST `/api/webhook`

Receives payment notifications and triggers sounds.

**Expected payload format (any of these fields):**
```json
{
  "message": "100-1000",
  "amount": "100",
  "memo": "100"
}
```

The server extracts the first number from the message (e.g., `100` from `100-1000`) and plays the corresponding sound.

**Response:**
```json
{
  "success": true,
  "amount": 100,
  "sound": "Air Horn"
}
```

### Testing the webhook locally

Use curl to test:
```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"message": "100-1000"}'
```

## Development

Run in watch mode:
```bash
npm run dev
```

## Exposing Webhook Endpoint

For production use, you'll need to expose your webhook endpoint to the internet so payment services can reach it. Options:

1. **ngrok** (for testing):
```bash
ngrok http 3000
```

2. **Deploy to a cloud service**:
   - Railway
   - Render
   - Heroku
   - DigitalOcean
   - AWS/GCP/Azure

Configure your payment service to send webhooks to:
```
https://your-domain.com/api/webhook
```

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **WebSocket**: ws library
- **QR Codes**: qrcode library

## License

ISC
