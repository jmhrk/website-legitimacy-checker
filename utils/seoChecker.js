const axios = require('axios');

async function checkSEO(domain) {
  try {
    const cleanDomain = domain.replace(/^www\./, '');
    
    // Multiple SEO checking methods
    const seoMethods = [
      {
        name: 'google-search',
        check: async () => await checkGoogleSearch(cleanDomain)
      },
      {
        name: 'serp-api',
        check: async () => await checkSerpApi(cleanDomain)
      },
      {
        name: 'basic-presence',
        check: async () => await checkBasicPresence(cleanDomain)
      }
    ];

    let bestResult = null;

    // Try each method until one succeeds
    for (const method of seoMethods) {
      try {
        const result = await method.check();
        if (result && !result.error) {
          bestResult = {
            ...result,
            method: method.name
          };
          break;
        }
      } catch (error) {
        console.log(`${method.name} SEO check failed:`, error.message);
        continue;
      }
    }

    // If all methods fail, return basic analysis
    if (!bestResult) {
      bestResult = await checkBasicPresence(cleanDomain);
    }

    return bestResult;

  } catch (error) {
    console.error('SEO check error:', error.message);
    return {
      domain,
      appearsInResults: false,
      ranking: null,
      reason: 'SEO check failed',
      error: error.message,
      method: 'error'
    };
  }
}

async function checkGoogleSearch(domain) {
  if (!process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_SEARCH_API_KEY === 'your_google_search_api_key_here') {
    throw new Error('Google Search API key not configured');
  }

  if (!process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.GOOGLE_SEARCH_ENGINE_ID === 'your_google_search_engine_id_here') {
    throw new Error('Google Search Engine ID not configured');
  }

  // Search for the domain
  const searchQuery = `site:${domain}`;
  const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}`;

  const response = await axios.get(apiUrl, { timeout: 15000 });
  const data = response.data;

  // Also search for the domain name as a general query
  const generalQuery = domain.replace(/\.(com|org|net|edu|gov)$/, '');
  const generalApiUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(generalQuery)}`;

  const generalResponse = await axios.get(generalApiUrl, { timeout: 15000 });
  const generalData = generalResponse.data;

  // Analyze results
  const siteResults = data.items || [];
  const generalResults = generalData.items || [];
  
  // Check if domain appears in general search results
  let domainRanking = null;
  let appearsInGeneral = false;

  for (let i = 0; i < generalResults.length; i++) {
    if (generalResults[i].link.includes(domain)) {
      domainRanking = i + 1;
      appearsInGeneral = true;
      break;
    }
  }

  return {
    domain,
    appearsInResults: siteResults.length > 0 || appearsInGeneral,
    indexedPages: siteResults.length,
    ranking: domainRanking,
    isInTopTen: domainRanking && domainRanking <= 10,
    totalResults: data.searchInformation?.totalResults || '0',
    searchTime: data.searchInformation?.searchTime || 0,
    sampleResults: siteResults.slice(0, 3).map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet
    })),
    reason: siteResults.length > 0 ? 
      `Found ${siteResults.length} indexed pages` : 
      appearsInGeneral ? 
        `Appears in general search at position ${domainRanking}` : 
        'No search presence found'
  };
}

async function checkSerpApi(domain) {
  // This would require a SERP API key (like SerpApi, DataForSEO, etc.)
  // For now, we'll throw an error to move to the next method
  throw new Error('SERP API not configured');
}

async function checkBasicPresence(domain) {
  try {
    const checks = {
      domainAge: null,
      hasSSL: false,
      responseTime: null,
      statusCode: null,
      hasRobotsTxt: false,
      hasSitemap: false,
      metaDescription: false,
      metaTitle: false,
      hasAnalytics: false
    };

    // Check if website is accessible
    const startTime = Date.now();
    try {
      const response = await axios.get(`https://${domain}`, {
        timeout: 10000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      checks.responseTime = Date.now() - startTime;
      checks.statusCode = response.status;
      checks.hasSSL = true; // If HTTPS request succeeded

      // Check for basic SEO elements
      const html = response.data;
      checks.metaTitle = /<title[^>]*>([^<]+)<\/title>/i.test(html);
      checks.metaDescription = /<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"']+)["\'][^>]*>/i.test(html);
      checks.hasAnalytics = /google-analytics|gtag|ga\(|_gaq/.test(html);

    } catch (httpsError) {
      // Try HTTP if HTTPS fails
      try {
        const httpResponse = await axios.get(`http://${domain}`, {
          timeout: 10000,
          maxRedirects: 5,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        checks.responseTime = Date.now() - startTime;
        checks.statusCode = httpResponse.status;
        checks.hasSSL = false;

        const html = httpResponse.data;
        checks.metaTitle = /<title[^>]*>([^<]+)<\/title>/i.test(html);
        checks.metaDescription = /<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"']+)["\'][^>]*>/i.test(html);
        checks.hasAnalytics = /google-analytics|gtag|ga\(|_gaq/.test(html);

      } catch (httpError) {
        checks.statusCode = 'unreachable';
      }
    }

    // Check for robots.txt
    try {
      await axios.get(`https://${domain}/robots.txt`, { timeout: 5000 });
      checks.hasRobotsTxt = true;
    } catch (error) {
      try {
        await axios.get(`http://${domain}/robots.txt`, { timeout: 5000 });
        checks.hasRobotsTxt = true;
      } catch (httpError) {
        checks.hasRobotsTxt = false;
      }
    }

    // Check for sitemap
    const sitemapUrls = [
      `https://${domain}/sitemap.xml`,
      `https://${domain}/sitemap_index.xml`,
      `http://${domain}/sitemap.xml`,
      `http://${domain}/sitemap_index.xml`
    ];

    for (const sitemapUrl of sitemapUrls) {
      try {
        await axios.get(sitemapUrl, { timeout: 5000 });
        checks.hasSitemap = true;
        break;
      } catch (error) {
        continue;
      }
    }

    // Calculate SEO score
    let seoScore = 0;
    const maxScore = 100;

    if (checks.statusCode === 200) seoScore += 20;
    if (checks.hasSSL) seoScore += 15;
    if (checks.responseTime && checks.responseTime < 3000) seoScore += 10;
    if (checks.metaTitle) seoScore += 15;
    if (checks.metaDescription) seoScore += 15;
    if (checks.hasRobotsTxt) seoScore += 10;
    if (checks.hasSitemap) seoScore += 10;
    if (checks.hasAnalytics) seoScore += 5;

    // Determine SEO health
    let seoHealth;
    if (seoScore >= 80) seoHealth = 'Excellent';
    else if (seoScore >= 60) seoHealth = 'Good';
    else if (seoScore >= 40) seoHealth = 'Fair';
    else seoHealth = 'Poor';

    return {
      domain,
      appearsInResults: checks.statusCode === 200,
      seoScore,
      seoHealth,
      checks,
      recommendations: generateSEORecommendations(checks),
      reason: checks.statusCode === 200 ? 
        `Website accessible with ${seoHealth.toLowerCase()} SEO health (${seoScore}/100)` : 
        'Website not accessible or has issues'
    };

  } catch (error) {
    return {
      domain,
      appearsInResults: false,
      reason: 'Basic presence check failed',
      error: error.message
    };
  }
}

function generateSEORecommendations(checks) {
  const recommendations = [];

  if (!checks.hasSSL) {
    recommendations.push('Enable HTTPS/SSL certificate for security and SEO benefits');
  }
  
  if (!checks.metaTitle) {
    recommendations.push('Add a descriptive title tag to improve search visibility');
  }
  
  if (!checks.metaDescription) {
    recommendations.push('Add meta description tags to improve click-through rates');
  }
  
  if (!checks.hasRobotsTxt) {
    recommendations.push('Create a robots.txt file to guide search engine crawlers');
  }
  
  if (!checks.hasSitemap) {
    recommendations.push('Create and submit an XML sitemap to help search engines index your site');
  }
  
  if (!checks.hasAnalytics) {
    recommendations.push('Install web analytics (like Google Analytics) to track performance');
  }
  
  if (checks.responseTime && checks.responseTime > 3000) {
    recommendations.push('Improve page load speed for better user experience and SEO');
  }

  return recommendations;
}

module.exports = checkSEO;
