const axios = require('axios');

async function analyzePurpose(url, htmlSource) {
  try {
    // Extract text content from HTML (simple text extraction)
    const textContent = htmlSource
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 3000); // Limit to first 3000 characters

    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
      // Fallback analysis without LLM
      return performBasicAnalysis(url, textContent);
    }

    const prompt = `Analyze this website and determine its purpose, legitimacy indicators, and potential red flags.

Website URL: ${url}
Website Content: ${textContent}

Please provide a comprehensive analysis covering:
1. Primary purpose of the website
2. Business model or service offered
3. Legitimacy indicators (professional design, clear contact info, etc.)
4. Red flags or suspicious elements
5. Overall assessment of trustworthiness

Provide your response in a structured format.`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: "anthropic/claude-3-sonnet",
        messages: [
          {
            role: "system",
            content: "You are a cybersecurity expert specializing in website legitimacy analysis. Provide detailed, objective assessments of websites based on their content and structure."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Cybertools Legitimacy Checker'
        },
        timeout: 30000
      }
    );

    const analysis = response.data.choices[0].message.content;

    return {
      purpose: analysis,
      analysisMethod: 'LLM-powered',
      confidence: 'high'
    };

  } catch (error) {
    console.error('LLM analysis failed:', error.message);
    
    // Fallback to basic analysis
    const textContent = htmlSource
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 3000);

    return performBasicAnalysis(url, textContent);
  }
}

function performBasicAnalysis(url, textContent) {
  try {
    const analysis = {
      purpose: '',
      analysisMethod: 'rule-based',
      confidence: 'medium'
    };

    // Basic keyword analysis
    const keywords = {
      ecommerce: ['shop', 'buy', 'cart', 'checkout', 'product', 'store', 'purchase', 'payment'],
      news: ['news', 'article', 'breaking', 'latest', 'report', 'journalist'],
      blog: ['blog', 'post', 'author', 'comment', 'subscribe', 'archive'],
      business: ['company', 'service', 'about us', 'contact', 'team', 'professional'],
      education: ['course', 'learn', 'education', 'student', 'university', 'school'],
      portfolio: ['portfolio', 'work', 'project', 'gallery', 'resume', 'cv'],
      social: ['social', 'community', 'forum', 'discussion', 'member', 'profile'],
      finance: ['bank', 'finance', 'investment', 'loan', 'credit', 'money'],
      health: ['health', 'medical', 'doctor', 'treatment', 'medicine', 'clinic'],
      technology: ['software', 'app', 'technology', 'digital', 'innovation', 'tech']
    };

    const lowerContent = textContent.toLowerCase();
    const categoryScores = {};

    // Calculate scores for each category
    for (const [category, words] of Object.entries(keywords)) {
      let score = 0;
      for (const word of words) {
        const matches = (lowerContent.match(new RegExp(word, 'g')) || []).length;
        score += matches;
      }
      categoryScores[category] = score;
    }

    // Find the category with highest score
    const topCategory = Object.entries(categoryScores)
      .sort(([,a], [,b]) => b - a)[0];

    // Red flags detection
    const redFlags = [];
    const redFlagPatterns = [
      { pattern: /urgent|limited time|act now|don't miss/gi, flag: 'Urgency tactics' },
      { pattern: /100% guaranteed|risk-free|no questions asked/gi, flag: 'Unrealistic promises' },
      { pattern: /click here|download now|free download/gi, flag: 'Suspicious call-to-actions' },
      { pattern: /winner|congratulations|you've won/gi, flag: 'Prize/lottery scam indicators' },
      { pattern: /verify account|suspended|confirm identity/gi, flag: 'Phishing indicators' }
    ];

    for (const { pattern, flag } of redFlagPatterns) {
      if (pattern.test(textContent)) {
        redFlags.push(flag);
      }
    }

    // Legitimacy indicators
    const legitimacyIndicators = [];
    if (/privacy policy|terms of service|cookie policy/gi.test(textContent)) {
      legitimacyIndicators.push('Has legal policies');
    }
    if (/contact us|phone|email|address/gi.test(textContent)) {
      legitimacyIndicators.push('Contact information available');
    }
    if (/about us|our team|company history/gi.test(textContent)) {
      legitimacyIndicators.push('Company information provided');
    }

    // Generate analysis
    let purposeText = `Website Analysis:\n\n`;
    
    if (topCategory && topCategory[1] > 0) {
      purposeText += `Primary Category: ${topCategory[0].charAt(0).toUpperCase() + topCategory[0].slice(1)}\n`;
      purposeText += `This appears to be a ${topCategory[0]} website based on content analysis.\n\n`;
    } else {
      purposeText += `Unable to determine primary category from content analysis.\n\n`;
    }

    if (legitimacyIndicators.length > 0) {
      purposeText += `Legitimacy Indicators:\n${legitimacyIndicators.map(i => `• ${i}`).join('\n')}\n\n`;
    }

    if (redFlags.length > 0) {
      purposeText += `Red Flags Detected:\n${redFlags.map(f => `• ${f}`).join('\n')}\n\n`;
    }

    purposeText += `Note: This is a basic analysis. For more detailed insights, configure an LLM API key.`;

    analysis.purpose = purposeText;
    return analysis;

  } catch (error) {
    return {
      purpose: 'Unable to analyze website purpose due to processing error.',
      analysisMethod: 'error',
      confidence: 'low',
      error: error.message
    };
  }
}

module.exports = analyzePurpose;
