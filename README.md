# 🛡️ Cybertools - Website Legitimacy Checker

A comprehensive cybersecurity tool that analyzes websites to determine their legitimacy and identify potential fake or suspicious sites.

## Features

- **Domain Registration Analysis**: Check registration date and determine if domain is older than 3 years
- **Website Purpose Analysis**: AI-powered analysis of website content and purpose
- **Contact Information Verification**: Extract and verify emails, phone numbers, and social media links
- **Email Deliverability Check**: Verify if found emails are deliverable
- **Phone Number Validation**: Validate contact phone numbers
- **SEO & Web Presence Analysis**: Check search engine presence and SEO health
- **Source Code Analysis**: Analyze website structure and content
- **Legitimacy Scoring**: Comprehensive scoring system (0-100) with clear recommendations

## Installation

1. **Clone or download the project files**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure API Keys**:
   Edit the `.env` file and replace the placeholder values with your actual API keys:

   ```env
   # Whois API (Optional - falls back to free services)
   WHOIS_API_KEY=your_whois_api_key_here
   
   # Email Verification (Optional - falls back to basic validation)
   EMAIL_VERIFIER_API_KEY=your_email_verifier_api_key_here
   
   # Phone Verification (Optional - falls back to basic validation)
   PHONE_VERIFIER_API_KEY=your_phone_verifier_api_key_here
   
   # Google Search API (Optional - for SEO analysis)
   GOOGLE_SEARCH_API_KEY=your_google_search_api_key_here
   GOOGLE_SEARCH_ENGINE_ID=your_google_search_engine_id_here
   
   # OpenRouter API (Optional - for AI-powered purpose analysis)
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   
   PORT=3000
   ```

## API Key Setup (Optional)

While the tool works without API keys using fallback methods, you can enhance accuracy by configuring these services:

### 1. Whois API
- **Service**: WhoisXML API (https://whoisxmlapi.com/)
- **Purpose**: More reliable domain registration data
- **Fallback**: Free whois services

### 2. Email Verification
- **Services**: Verifalia (https://verifalia.com/) or Hunter.io (https://hunter.io/)
- **Purpose**: Accurate email deliverability checking
- **Fallback**: Basic format and domain validation

### 3. Phone Verification
- **Services**: Numverify (https://numverify.com/) or similar
- **Purpose**: Carrier and validity information
- **Fallback**: Basic format validation

### 4. Google Search API
- **Service**: Google Custom Search API (https://developers.google.com/custom-search/v1/introduction)
- **Purpose**: SEO ranking and search presence analysis
- **Fallback**: Basic website accessibility checks

### 5. OpenRouter API (Recommended)
- **Service**: OpenRouter (https://openrouter.ai/)
- **Purpose**: AI-powered website purpose and content analysis
- **Fallback**: Rule-based keyword analysis
- **Setup**: 
  1. Sign up at https://openrouter.ai/
  2. Get your API key from the dashboard
  3. Add it to your `.env` file

## Usage

1. **Start the server**:
   ```bash
   npm start
   ```

2. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

3. **Enter a website URL** in the form and click "Check Website Legitimacy"

4. **Review the comprehensive analysis** including:
   - Legitimacy score (0-100)
   - Domain registration information
   - Website purpose analysis
   - Contact information verification
   - SEO and web presence analysis
   - Detailed recommendations

## How It Works

### Legitimacy Scoring System

The tool uses a weighted scoring system:

- **Domain Age (40%)**: Domains older than 3 years are considered more trustworthy
- **Contact Information (30%)**: Presence of verifiable contact details
- **Social Media Presence (20%)**: Active social media links and profiles
- **SEO Presence (10%)**: Search engine visibility and optimization

### Analysis Categories

- **LIKELY LEGITIMATE (70-100 points)**: Well-established websites with good indicators
- **SUSPICIOUS - NEEDS REVIEW (40-69 points)**: Mixed signals requiring manual verification
- **LIKELY FAKE/SUSPICIOUS (0-39 points)**: Multiple red flags detected

## Development

To run in development mode with auto-restart:

```bash
npm install -g nodemon
npm run dev
```

## Security Features

- Input validation and sanitization
- Rate limiting protection
- Secure API key handling
- Error handling and logging
- CORS protection

## Limitations

- Analysis is automated and should supplement manual verification
- Some checks require API keys for full functionality
- Results may vary based on website accessibility and API availability
- Not a replacement for professional cybersecurity assessment

## Contributing

This tool is designed for educational and security research purposes. Please use responsibly and in accordance with applicable laws and terms of service.

## License

This project is for educational and research purposes. Please ensure compliance with all applicable laws and service terms when using external APIs.

---

**⚠️ Disclaimer**: This tool provides automated analysis to assist in identifying potentially suspicious websites. Results should be used as guidance alongside manual verification and professional judgment. The tool is not infallible and should not be the sole basis for security decisions.
