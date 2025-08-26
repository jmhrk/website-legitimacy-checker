const axios = require('axios');

async function getWhoisData(domain) {
  try {
    // Clean domain name
    const cleanDomain = domain.replace(/^www\./, '');
    
    // Try multiple whois APIs for better reliability
    const whoisApis = [
      {
        name: 'whoisjson',
        url: `https://whoisjson.com/api/v1/whois?domain=${cleanDomain}`,
        parser: (data) => {
          const createdDate = data.created_date || data.creation_date;
          return createdDate ? new Date(createdDate) : null;
        }
      },
      {
        name: 'whoisxml',
        url: `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${process.env.WHOIS_API_KEY}&domainName=${cleanDomain}&outputFormat=JSON`,
        parser: (data) => {
          const createdDate = data.WhoisRecord?.createdDateNormalized || data.WhoisRecord?.createdDate;
          return createdDate ? new Date(createdDate) : null;
        }
      }
    ];

    let registrationDate = null;
    let apiUsed = 'none';

    // Try each API until we get a result
    for (const api of whoisApis) {
      try {
        if (api.name === 'whoisxml' && !process.env.WHOIS_API_KEY) {
          continue; // Skip if no API key
        }

        const response = await axios.get(api.url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        registrationDate = api.parser(response.data);
        if (registrationDate) {
          apiUsed = api.name;
          break;
        }
      } catch (error) {
        console.log(`${api.name} API failed:`, error.message);
        continue;
      }
    }

    // Fallback: Try a simple whois lookup service
    if (!registrationDate) {
      try {
        const fallbackResponse = await axios.get(`https://api.whois.vu/?q=${cleanDomain}`, {
          timeout: 10000
        });
        
        if (fallbackResponse.data && fallbackResponse.data.created) {
          registrationDate = new Date(fallbackResponse.data.created);
          apiUsed = 'whois.vu';
        }
      } catch (error) {
        console.log('Fallback whois API failed:', error.message);
      }
    }

    if (!registrationDate) {
      return {
        domain: cleanDomain,
        registrationDate: 'Unknown',
        ageInYears: 0,
        status: 'Unable to determine registration date',
        apiUsed: 'none',
        error: 'All whois services failed'
      };
    }

    const now = new Date();
    const ageInMilliseconds = now - registrationDate;
    const ageInYears = ageInMilliseconds / (1000 * 60 * 60 * 24 * 365.25);

    const formattedDate = registrationDate.toISOString().split('T')[0];
    const status = ageInYears >= 3 ? 'More than 3 years old' : 'Less than 3 years old';

    return {
      domain: cleanDomain,
      registrationDate: formattedDate,
      ageInYears: Math.round(ageInYears * 100) / 100,
      status,
      apiUsed
    };

  } catch (error) {
    console.error('Whois lookup error:', error.message);
    return {
      domain: domain,
      registrationDate: 'Unknown',
      ageInYears: 0,
      status: 'Whois lookup failed',
      error: error.message
    };
  }
}

module.exports = getWhoisData;
