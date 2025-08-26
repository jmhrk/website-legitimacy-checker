const axios = require('axios');

async function verifyPhone(phoneNumber) {
  try {
    // Clean and format phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Basic validation
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return {
        phone: phoneNumber,
        valid: false,
        reason: 'Invalid phone number length',
        method: 'basic'
      };
    }

    // Try multiple phone verification services
    const verificationMethods = [
      {
        name: 'numverify',
        verify: async () => await verifyWithNumverify(cleanPhone)
      },
      {
        name: 'twilio',
        verify: async () => await verifyWithTwilio(cleanPhone)
      },
      {
        name: 'freecarrierlookup',
        verify: async () => await verifyWithFreeCarrierLookup(cleanPhone)
      },
      {
        name: 'basic',
        verify: async () => await basicPhoneCheck(cleanPhone, phoneNumber)
      }
    ];

    // Try each method until one succeeds
    for (const method of verificationMethods) {
      try {
        const result = await method.verify();
        if (result && !result.error) {
          return {
            ...result,
            originalPhone: phoneNumber,
            cleanPhone: cleanPhone,
            method: method.name
          };
        }
      } catch (error) {
        console.log(`${method.name} phone verification failed:`, error.message);
        continue;
      }
    }

    // If all methods fail, return basic validation
    return await basicPhoneCheck(cleanPhone, phoneNumber);

  } catch (error) {
    console.error('Phone verification error:', error.message);
    return {
      phone: phoneNumber,
      valid: false,
      reason: 'Verification service unavailable',
      error: error.message,
      method: 'error'
    };
  }
}

async function verifyWithNumverify(phoneNumber) {
  if (!process.env.PHONE_VERIFIER_API_KEY || process.env.PHONE_VERIFIER_API_KEY === 'your_phone_verifier_api_key_here') {
    throw new Error('Numverify API key not configured');
  }

  const response = await axios.get(
    `http://apilayer.net/api/validate?access_key=${process.env.PHONE_VERIFIER_API_KEY}&number=${phoneNumber}`,
    { timeout: 10000 }
  );

  const result = response.data;
  return {
    phone: phoneNumber,
    valid: result.valid,
    country: result.country_name,
    countryCode: result.country_code,
    carrier: result.carrier,
    lineType: result.line_type,
    location: result.location,
    reason: result.valid ? 'Valid phone number' : 'Invalid phone number',
    details: result
  };
}

async function verifyWithTwilio(phoneNumber) {
  if (!process.env.PHONE_VERIFIER_API_KEY || process.env.PHONE_VERIFIER_API_KEY === 'your_phone_verifier_api_key_here') {
    throw new Error('Twilio API key not configured');
  }

  // Note: This would require Twilio Account SID and Auth Token
  // For demo purposes, we'll simulate the structure
  throw new Error('Twilio verification not implemented - requires Account SID and Auth Token');
}

async function verifyWithFreeCarrierLookup(phoneNumber) {
  try {
    // Try free carrier lookup service
    const response = await axios.get(
      `https://freecarrierlookup.com/api/lookup?phone=${phoneNumber}`,
      { 
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    const result = response.data;
    return {
      phone: phoneNumber,
      valid: result.success || false,
      carrier: result.carrier || 'Unknown',
      lineType: result.line_type || 'Unknown',
      country: result.country || 'Unknown',
      reason: result.success ? 'Valid phone number' : 'Phone verification failed',
      details: result
    };
  } catch (error) {
    throw new Error('Free carrier lookup service unavailable');
  }
}

async function basicPhoneCheck(cleanPhone, originalPhone) {
  try {
    // Country code detection
    const countryCodes = {
      '1': { country: 'United States/Canada', minLength: 11, maxLength: 11 },
      '44': { country: 'United Kingdom', minLength: 11, maxLength: 13 },
      '49': { country: 'Germany', minLength: 11, maxLength: 12 },
      '33': { country: 'France', minLength: 10, maxLength: 10 },
      '39': { country: 'Italy', minLength: 10, maxLength: 11 },
      '34': { country: 'Spain', minLength: 9, maxLength: 9 },
      '91': { country: 'India', minLength: 12, maxLength: 13 },
      '86': { country: 'China', minLength: 11, maxLength: 13 },
      '81': { country: 'Japan', minLength: 10, maxLength: 11 },
      '61': { country: 'Australia', minLength: 10, maxLength: 11 }
    };

    let detectedCountry = 'Unknown';
    let isValidLength = false;

    // Check for country codes
    for (const [code, info] of Object.entries(countryCodes)) {
      if (cleanPhone.startsWith(code)) {
        detectedCountry = info.country;
        isValidLength = cleanPhone.length >= info.minLength && cleanPhone.length <= info.maxLength;
        break;
      }
    }

    // If no country code detected, assume US/Canada format
    if (detectedCountry === 'Unknown' && cleanPhone.length === 10) {
      detectedCountry = 'United States/Canada (assumed)';
      isValidLength = true;
    }

    // Basic format validation
    const hasValidFormat = /^[\d\s\-\(\)\+]+$/.test(originalPhone);
    
    // Check for obviously fake numbers
    const fakePatterns = [
      /^(\d)\1{9,}$/, // All same digits
      /^1234567890$/, // Sequential
      /^0000000000$/, // All zeros
      /^1111111111$/, // All ones
    ];

    const isFakePattern = fakePatterns.some(pattern => pattern.test(cleanPhone));

    // US/Canada specific validation
    let areaCodeValid = true;
    if (cleanPhone.length === 10 || (cleanPhone.length === 11 && cleanPhone.startsWith('1'))) {
      const areaCode = cleanPhone.length === 11 ? cleanPhone.substring(1, 4) : cleanPhone.substring(0, 3);
      const invalidAreaCodes = ['000', '001', '002', '003', '004', '005', '006', '007', '008', '009'];
      areaCodeValid = !invalidAreaCodes.includes(areaCode);
    }

    const isValid = hasValidFormat && isValidLength && !isFakePattern && areaCodeValid;

    return {
      phone: originalPhone,
      cleanPhone: cleanPhone,
      valid: isValid,
      country: detectedCountry,
      hasValidFormat,
      isValidLength,
      areaCodeValid,
      isFakePattern,
      reason: !hasValidFormat ? 'Invalid format' :
              !isValidLength ? 'Invalid length for detected country' :
              isFakePattern ? 'Appears to be fake number pattern' :
              !areaCodeValid ? 'Invalid area code' :
              'Basic validation passed',
      method: 'basic',
      confidence: isValid ? 'medium' : 'high'
    };

  } catch (error) {
    return {
      phone: originalPhone,
      valid: false,
      reason: 'Basic validation failed',
      error: error.message,
      method: 'basic'
    };
  }
}

// Additional utility function to format phone numbers
function formatPhoneNumber(phoneNumber, countryCode = 'US') {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (countryCode === 'US' && cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  } else if (countryCode === 'US' && cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7)}`;
  }
  
  return phoneNumber; // Return original if can't format
}

module.exports = verifyPhone;
