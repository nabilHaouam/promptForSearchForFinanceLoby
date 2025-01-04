const express = require('express');

const app = express();
const port = 5001;

// Use Express's built-in JSON parser middleware
app.use(express.json({
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));

// Define the mappings from clickupTags.json
const clickupTags = {
  assetType: {
    "0": "Multifamily",
    "1": "Retail",
    "2": "Industrial", 
    "3": "Office",
    "4": "Owner Occupied",
    "5": "Land",
    "6": "Mixed Use",
    "7": "Hospitality",
    "8": "Cannabis",
    "9": "Self storage",
    "10": "RV Parks / Mobile Homes",
    "11": "Assisted Living Facilities",
    "12": "Healthcare",
    "13": "Gas Stations",
    "14": "Car wash",
    "15": "Religious venues",
    "16": "Golf Courses",
    "17": "Medical Office",
    "18": "Camping Grounds",
    "19": "Retail + Office",
    "20": "Multifamily + Retail",
    "21": "Hospitality + Multifamily",
    "22": "Retail + Industrial",
    "23": "Residential Complex",
    "24": "Marine Services Facility",
    "25": "no result",
    "26": "School",
    "27": "AIRBNB",
    "28": "Daycare",
    "29": "Hotel",
    "30": "Logistic Centre",
    "31": "business acquisition",
    "32": "Towing service",
    "33": "Commercial trucking facility",
    "34": "Community center",
    "35": "Autobody Repair",
    "36": "Not a CRE deal",
    "37": "Rehab center",
    "38": "Event Venue",
    "39": "Sports complex",
    "40": "Shoping centre",
    "41": "Agricultural Land",
    "42": "Pickleball Facility",
    "43": "Single Residential",
    "44": "Dog Grooming",
    "45": "Tourism attraction",
    "46": "Residential deal not supported",
    "47": "Residential",
    "48": "Recreational Facility",
    "49": "Mining side",
    "50": "Power Plant",
    "51": "Waste Disposal Plant",
    "52": "Auto Body Shop",
    "53": "Wedding Venue",
    "54": "Residential Development"
  },
  loanType: {
    "0": "Refinance",
    "1": "Purchase",
    "2": "Construction"
  },
  loanTerm: {
    "0": "Permanent",
    "1": "Bridge"
  }
};

// Function to get mapped value from clickupTags
function getMappedValue(category, value) {
  if (!clickupTags[category] || !clickupTags[category][value]) {
    return 'Unknown';
  }
  return clickupTags[category][value];
}

// Function to generate prompt from the provided data
function generatePrompt(data) {
  // Get mapped values from clickupTags
  const assetType = getMappedValue('assetType', data.assetType);
  const loanType = getMappedValue('loanType', data.loanType);
  const loanTerm = getMappedValue('loanTerm', data.loanTerm);
  
  // Format loan amount with commas and dollar sign
  const formattedLoanAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(data.loanAmount);

  // Generate the prompt
  return `Location: ${data.location}
Deal Summary: ${data.dealSummary}
Deal Description: ${data.dealDescription}
Asset Type: ${assetType}
Loan Amount: ${formattedLoanAmount}
Loan Type: ${loanType}
Loan Term: ${loanTerm}`;
}

// Validate required fields in the request
function validateRequest(data) {
  const requiredFields = [
    'location',
    'dealSummary',
    'assetType',
    'dealDescription',
    'loanAmount',
    'loanType',
    'loanTerm'
  ];

  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`
    };
  }

  return { valid: true };
}

// POST endpoint to receive deal data and return generated prompt
app.post('/generate-prompt', (req, res) => {
  try {
    // Validate the request
    const validation = validateRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error
      });
    }

    // Generate the prompt
    const prompt = generatePrompt(req.body);

    // Return the generated prompt and mapped values
    res.json({
      success: true,
      prompt,
      mappedValues: {
        assetType: getMappedValue('assetType', req.body.assetType),
        loanType: getMappedValue('loanType', req.body.loanType),
        loanTerm: getMappedValue('loanTerm', req.body.loanTerm)
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate prompt',
      details: error.message
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});