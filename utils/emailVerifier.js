const axios = require('axios');

async function verifyEmail(email) {
  try {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        email,
        valid: false,
        deliverable: false,
        reason: 'Invalid email format',
        method: 'format-check'
      };
    }

    // Try multiple email verification services
    const verificationMethods = [
      {
        name: 'verifalia',
        verify: async () => await verifyWithVerifalia(email)
      },
      {
        name: 'hunter',
        verify: async () => await verifyWithHunter(email)
      },
      {
        name: 'emailvalidation',
        verify: async () => await verifyWithEmailValidation(email)
      },
      {
        name: 'basic',
        verify: async () => await basicEmailCheck(email)
      }
    ];

    // Try each method until one succeeds
    for (const method of verificationMethods) {
      try {
        const result = await method.verify();
        if (result && !result.error) {
          return {
            ...result,
            method: method.name
          };
        }
      } catch (error) {
        console.log(`${method.name} email verification failed:`, error.message);
        continue;
      }
    }

    // If all methods fail, return basic validation
    return await basicEmailCheck(email);

  } catch (error) {
    console.error('Email verification error:', error.message);
    return {
      email,
      valid: false,
      deliverable: false,
      reason: 'Verification service unavailable',
      error: error.message,
      method: 'error'
    };
  }
}

async function verifyWithVerifalia(email) {
  if (!process.env.EMAIL_VERIFIER_API_KEY || process.env.EMAIL_VERIFIER_API_KEY === 'your_email_verifier_api_key_here') {
    throw new Error('Verifalia API key not configured');
  }

  const response = await axios.post(
    'https://api.verifalia.com/v2.4/email-validations',
    {
      entries: [{ inputData: email }],
      quality: 'standard'
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.EMAIL_VERIFIER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  );

  const result = response.data.entries[0];
  return {
    email,
    valid: result.classification === 'deliverable',
    deliverable: result.classification === 'deliverable',
    reason: result.classification,
    confidence: result.status,
    details: result
  };
}

async function verifyWithHunter(email) {
  if (!process.env.EMAIL_VERIFIER_API_KEY || process.env.EMAIL_VERIFIER_API_KEY === 'your_email_verifier_api_key_here') {
    throw new Error('Hunter API key not configured');
  }

  const response = await axios.get(
    `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${process.env.EMAIL_VERIFIER_API_KEY}`,
    { timeout: 15000 }
  );

  const result = response.data.data;
  return {
    email,
    valid: result.result === 'deliverable',
    deliverable: result.result === 'deliverable',
    reason: result.result,
    confidence: result.score,
    details: result
  };
}

async function verifyWithEmailValidation(email) {
  // Free email validation service
  const response = await axios.get(
    `https://api.emailvalidation.io/v1/info?apikey=ema_live_YOUR_API_KEY&email=${encodeURIComponent(email)}`,
    { timeout: 10000 }
  );

  const result = response.data;
  return {
    email,
    valid: result.state === 'deliverable',
    deliverable: result.state === 'deliverable',
    reason: result.state,
    details: result
  };
}

async function basicEmailCheck(email) {
  try {
    // Extract domain from email
    const domain = email.split('@')[1];
    
    // Basic domain validation
    if (!domain || domain.length < 3) {
      return {
        email,
        valid: false,
        deliverable: false,
        reason: 'Invalid domain',
        method: 'basic'
      };
    }

    // Check for common disposable email domains
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 
      'mailinator.com', 'throwaway.email', 'temp-mail.org',
      'yopmail.com', 'maildrop.cc', 'sharklasers.com'
    ];

    const isDisposable = disposableDomains.some(d => domain.toLowerCase().includes(d));

    // Check for common typos in popular domains
    const commonDomains = {
      'gmail.com': ['gmai.com', 'gmial.com', 'gmail.co'],
      'yahoo.com': ['yaho.com', 'yahoo.co', 'yahooo.com'],
      'hotmail.com': ['hotmai.com', 'hotmial.com', 'hotmail.co'],
      'outlook.com': ['outlok.com', 'outlook.co', 'outloo.com']
    };

    let suggestedDomain = null;
    for (const [correct, typos] of Object.entries(commonDomains)) {
      if (typos.includes(domain.toLowerCase())) {
        suggestedDomain = correct;
        break;
      }
    }

    // Try to resolve domain (basic DNS check)
    let domainExists = true;
    try {
      await axios.get(`https://dns.google/resolve?name=${domain}&type=MX`, { timeout: 5000 });
    } catch (error) {
      domainExists = false;
    }

    return {
      email,
      valid: domainExists && !isDisposable,
      deliverable: domainExists && !isDisposable ? 'unknown' : false,
      reason: !domainExists ? 'Domain does not exist' : 
              isDisposable ? 'Disposable email domain' : 
              suggestedDomain ? `Possible typo, did you mean ${email.split('@')[0]}@${suggestedDomain}?` : 
              'Basic validation passed',
      domainExists,
      isDisposable,
      suggestedDomain,
      method: 'basic'
    };

  } catch (error) {
    return {
      email,
      valid: false,
      deliverable: false,
      reason: 'Basic validation failed',
      error: error.message,
      method: 'basic'
    };
  }
}

module.exports = verifyEmail;
