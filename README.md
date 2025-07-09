# WhatsApp Bulk Sender

A professional bulk messaging solution for WhatsApp built with Node.js and whatsapp-web.js. This tool allows businesses and organizations to send personalized messages and media files to multiple contacts efficiently

## Features

- Personalized message templating with contact name replacement
- Media file attachments (images, videos, documents)
- Configurable delay between messages to prevent rate limiting
- Detailed reporting with success/failure tracking
- JSON-based configuration system
- Contact management through JSON files

## Prerequisites

- Node.js v16 or higher
- npm (included with Node.js)
- Google Chrome or Chromium
- Active WhatsApp account

## Installation

1. Clone the repository:
```bash
git clone https://github.com/a6d00u/WhatsApp-bulk-Sender.git
cd whatsapp-bulk-sender
```

2. Install dependencies:
```bash
npm install
```
3. Set up configuration files:
```bash
my-config.json
phone_numbers.json
```
4. Run the application:
```bash
node whatsapp-bulk-sender.js
```
## Security Notes

- Protect your session.json file
- Store contacts data securely
- Comply with WhatsApp's Terms of Service

## Troubleshooting :

### Authentication Problems:
- Restart application if QR code expires
- Ensure your phone has internet connection

### Message Delivery Failures:
- Verify phone number formats

### Media Attachment Issues:
- Confirm file paths are correct
- Verify file size limits (16MB for videos)

# License

MIT License - See LICENSE file for details.
