const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 4000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

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


app.use(express.raw({type: '*/*'}), (req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] Raw Request Body:`);
    console.log(req.body.toString());
    
    try {
      if (req.body.length) {
        req.rawBody = req.body;
        req.body = JSON.parse(req.body.toString());
      }
      next();
    } catch (error) {
      console.error('JSON Parse Error:', error);
      console.log('Problematic JSON string:', req.body.toString());
      return res.status(400).json({
        error: 'Invalid JSON',
        details: error.message,
        receivedData: req.body.toString()
      });
    }
  });
  
  // Modify the error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      details: err.message,
      stack: err.stack
    });
  });
  
  // Your existing endpoint
  app.post('/generate-prompt', (req, res) => {
    try {
      // Log the cleaned request body
      console.log('\nProcessed Request Body:', JSON.stringify(req.body, null, 2));
  
      const validation = validateRequest(req.body);
      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error
        });
      }
  
      const prompt = generatePrompt(req.body);
      const response = {
        success: true,
        prompt,
        mappedValues: {
          assetType: getMappedValue('assetType', req.body.assetType),
          loanType: getMappedValue('loanType', req.body.loanType),
          loanTerm: getMappedValue('loanTerm', req.body.loanTerm)
        }
      };
  
      res.json(response);
  
    } catch (error) {
      console.error('Processing Error:', error);
      res.status(500).json({
        error: 'Failed to generate prompt',
        details: error.message
      });
    }
  });