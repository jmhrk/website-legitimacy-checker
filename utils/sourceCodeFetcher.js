const axios = require('axios');

async function fetchSourceCode(url) {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (response.status === 200 && response.data) {
      return response.data;
    } else {
      throw new Error(`HTTP ${response.status}: Unable to fetch content`);
    }
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      throw new Error('Domain not found or unreachable');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Connection refused by server');
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('Request timeout');
    } else if (error.response) {
      throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
    } else {
      throw new Error(`Failed to fetch source code: ${error.message}`);
    }
  }
}

module.exports = fetchSourceCode;
