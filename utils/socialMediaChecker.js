const axios = require('axios');

async function checkSocialMedia(htmlSource) {
  try {
    // Regular expressions for extracting information
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
    
    // Social media patterns
    const socialMediaPatterns = {
      facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[a-zA-Z0-9._%+-]+/gi,
      twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9._%+-]+/gi,
      instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[a-zA-Z0-9._%+-]+/gi,
      linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9._%+-]+/gi,
      youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:channel|user|c)\/[a-zA-Z0-9._%+-]+/gi,
      tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[a-zA-Z0-9._%+-]+/gi
    };

    // Extract emails
    const emails = [...new Set((htmlSource.match(emailRegex) || [])
      .filter(email => !email.includes('example.com') && !email.includes('test.com'))
      .slice(0, 5))]; // Limit to 5 unique emails

    // Extract phone numbers
    const phoneMatches = htmlSource.match(phoneRegex) || [];
    const phoneNumbers = [...new Set(phoneMatches.slice(0, 3))]; // Limit to 3 unique numbers

    // Extract social media links
    const socialLinks = [];
    for (const [platform, pattern] of Object.entries(socialMediaPatterns)) {
      const matches = htmlSource.match(pattern) || [];
      const uniqueMatches = [...new Set(matches)];
      for (const match of uniqueMatches.slice(0, 2)) { // Max 2 per platform
        socialLinks.push({
          platform,
          url: match.startsWith('http') ? match : `https://${match}`,
          status: 'found'
        });
      }
    }

    // Check if social media links are working
    const checkedSocialLinks = await Promise.allSettled(
      socialLinks.map(async (link) => {
        try {
          const response = await axios.head(link.url, {
            timeout: 5000,
            maxRedirects: 3,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          return {
            ...link,
            status: response.status < 400 ? 'active' : 'broken',
            statusCode: response.status
          };
        } catch (error) {
          return {
            ...link,
            status: 'broken',
            error: error.message
          };
        }
      })
    );

    const finalSocialLinks = checkedSocialLinks.map(result => 
      result.status === 'fulfilled' ? result.value : result.reason
    );

    // Extract additional contact information
    const contactPatterns = {
      address: /\b\d+\s+[A-Za-z\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)\b/gi,
      website: /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi
    };

    const addresses = [...new Set((htmlSource.match(contactPatterns.address) || []).slice(0, 3))];
    
    return {
      emails,
      phoneNumbers,
      socialLinks: finalSocialLinks,
      addresses,
      summary: {
        hasContactInfo: emails.length > 0 || phoneNumbers.length > 0,
        hasSocialMedia: finalSocialLinks.length > 0,
        activeSocialLinks: finalSocialLinks.filter(link => link.status === 'active').length,
        brokenSocialLinks: finalSocialLinks.filter(link => link.status === 'broken').length
      }
    };

  } catch (error) {
    console.error('Social media check error:', error.message);
    return {
      emails: [],
      phoneNumbers: [],
      socialLinks: [],
      addresses: [],
      summary: {
        hasContactInfo: false,
        hasSocialMedia: false,
        activeSocialLinks: 0,
        brokenSocialLinks: 0
      },
      error: error.message
    };
  }
}

module.exports = checkSocialMedia;
