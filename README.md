# WhatsApp Pre-Verified Numbers Management

A web application for managing pre-verified phone numbers for WhatsApp Business API integration.

## Features

- **Phone Number Management**: Add, verify, and delete pre-verified phone numbers
- **SMS Verification**: Request and verify phone numbers via SMS codes
- **Embedded Signup**: Configure and test WhatsApp Business Embedded Signup flow
- **Status Monitoring**: Track verification status and expiration dates
- **Real-time Updates**: Monitor number status with automatic refresh

## Quick Start

1. **Start the server**:
   ```bash
   python server.py
   ```

2. **Open in browser**:
   ```
   http://localhost:9000/index.html
   ```

## Usage

### Phone Numbers Tab
- Add new phone numbers in international format (+1234567890)
- Request SMS verification codes
- Verify numbers manually with received codes
- Delete numbers when no longer needed

### Embedded Signup Tab
- Configure business profile settings
- Select verified numbers for signup flow
- Test WhatsApp Business Embedded Signup integration
- Generate configuration code for your application

### Status Monitoring Tab
- View overview of all phone numbers
- Track verification status and expiration dates
- Monitor numbers that need attention

## Requirements

- Python 3.x
- Modern web browser
- WhatsApp Business API credentials (Business Portfolio ID and Access Token)

## Setup

1. **Install dependencies**:
   ```bash
   pip install python-dotenv
   ```

2. **Configure environment variables**:
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your credentials:
   ```
   BUSINESS_PORTFOLIO_ID=your_business_portfolio_id_here
   ACCESS_TOKEN=your_access_token_here
   ```

## Files

- `app.js` - Main React application
- `index.html` - HTML entry point
- `server.py` - Simple HTTP server
- `test.html` - Test page
- `index-inline.html` - Inline version of the app 