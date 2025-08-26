const express = require('express');
const router = express.Router();

const getWhoisData = require('../utils/whois');
const analyzePurpose = require('../utils/purposeAnalyzer');
const checkSocialMedia = require('../utils/socialMediaChecker');
const verifyEmail = require('../utils/emailVerifier');
const verifyPhone = require('../utils/phoneVerifier');
const checkSEO = require('../utils/seoChecker');
const fetchSourceCode = require('../utils/sourceCodeFetcher');

router.post('/check', async (req, res, next) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    let validUrl;
    try {
      validUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log(`Starting legitimacy check for: ${validUrl.href}`);

    // Run all checks concurrently for better performance
    const [
      whoisResult,
      sourceCode,
      seoResult
    ] = await Promise.allSettled([
      getWhoisData(validUrl.hostname),
      fetchSourceCode(validUrl.href),
      checkSEO(validUrl.hostname)
    ]);

    // Extract social media and contact info from source code
    let socialMediaResult = { emails: [], phoneNumbers: [], socialLinks: [] };
    let purposeResult = { purpose: 'Unable to analyze purpose' };
    
    if (sourceCode.status === 'fulfilled') {
      socialMediaResult = await checkSocialMedia(sourceCode.value);
      purposeResult = await analyzePurpose(validUrl.href, sourceCode.value);
    }

    // Verify emails found
    const emailVerifications = [];
    if (socialMediaResult.emails && socialMediaResult.emails.length > 0) {
      for (let email of socialMediaResult.emails.slice(0, 3)) { // Limit to 3 emails
        try {
          const verification = await verifyEmail(email);
          emailVerifications.push({ email, verification });
        } catch (error) {
          emailVerifications.push({ email, verification: { error: 'Verification failed' } });
        }
      }
    }

    // Verify phone numbers found
    const phoneVerifications = [];
    if (socialMediaResult.phoneNumbers && socialMediaResult.phoneNumbers.length > 0) {
      for (let phone of socialMediaResult.phoneNumbers.slice(0, 3)) { // Limit to 3 phones
        try {
          const verification = await verifyPhone(phone);
          phoneVerifications.push({ phone, verification });
        } catch (error) {
          phoneVerifications.push({ phone, verification: { error: 'Verification failed' } });
        }
      }
    }

    // Calculate overall legitimacy score
    let legitimacyScore = 0;
    let factors = [];

    // Domain age factor (40% weight)
    if (whoisResult.status === 'fulfilled' && whoisResult.value.ageInYears >= 3) {
      legitimacyScore += 40;
      factors.push('Domain registered more than 3 years ago');
    } else if (whoisResult.status === 'fulfilled') {
      factors.push('Domain registered less than 3 years ago');
    }

    // Contact information factor (30% weight)
    if (socialMediaResult.emails.length > 0 || socialMediaResult.phoneNumbers.length > 0) {
      legitimacyScore += 30;
      factors.push('Contact information found');
    } else {
      factors.push('No contact information found');
    }

    // Social media presence factor (20% weight)
    if (socialMediaResult.socialLinks.length > 0) {
      legitimacyScore += 20;
      factors.push('Social media presence detected');
    } else {
      factors.push('No social media links found');
    }

    // SEO presence factor (10% weight)
    if (seoResult.status === 'fulfilled' && seoResult.value.appearsInResults) {
      legitimacyScore += 10;
      factors.push('Website appears in search results');
    } else {
      factors.push('Limited search engine presence');
    }

    // Determine legitimacy status
    let legitimacyStatus;
    if (legitimacyScore >= 70) {
      legitimacyStatus = 'LIKELY LEGITIMATE';
    } else if (legitimacyScore >= 40) {
      legitimacyStatus = 'SUSPICIOUS - NEEDS REVIEW';
    } else {
      legitimacyStatus = 'LIKELY FAKE/SUSPICIOUS';
    }

    const finalResult = {
      url: validUrl.href,
      legitimacyScore,
      legitimacyStatus,
      factors,
      whois: whoisResult.status === 'fulfilled' ? whoisResult.value : { error: 'Whois lookup failed' },
      purpose: purposeResult,
      socialMedia: socialMediaResult,
      emailVerifications,
      phoneVerifications,
      seo: seoResult.status === 'fulfilled' ? seoResult.value : { error: 'SEO check failed' },
      timestamp: new Date().toISOString()
    };

    return res.json(finalResult);
  } catch (error) {
    console.error('Legitimacy check error:', error);
    next(error);
  }
});

module.exports = router;
