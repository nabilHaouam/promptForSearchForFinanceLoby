const express = require('express');

const app = express();
const port = 5001;

// Custom middleware to parse JSON with detailed error handling
app.use((req, res, next) => {
    let rawData = '';
    
    req.on('data', chunk => {
      rawData += chunk;
    });
  
    req.on('end', () => {
      // Log the raw data before any processing
      console.log('Raw data received:', rawData);
      console.log('Raw data length:', rawData.length);
      console.log('Raw data first 50 characters:', rawData.slice(0, 50));
      
      // If empty request
      if (!rawData) {
        req.body = {};
        return next();
      }
  
      try {
        // Try to parse as-is first
        req.body = JSON.parse(rawData);
        console.log('Successfully parsed JSON');
        next();
      } catch (e) {
        console.log('First parse attempt failed, trying with cleanup...');
        try {
          // Try to clean the data
          let cleanedData = rawData
            .replace(/^\uFEFF/, '') // Remove BOM if present
            .trim() // Remove leading/trailing whitespace
            .replace(/\r?\n|\r/g, ' ') // Replace newlines with spaces
            .replace(/\s+/g, ' '); // Replace multiple spaces with single space
  
          console.log('Cleaned data:', cleanedData);
          req.body = JSON.parse(cleanedData);
          console.log('Successfully parsed cleaned JSON');
          next();
        } catch (e2) {
          console.error('Both parse attempts failed');
          console.error('Original error:', e);
          console.error('Cleanup error:', e2);
          res.status(400).json({
            error: 'Invalid JSON',
            originalError: e.message,
            cleanupError: e2.message,
            receivedData: rawData.slice(0, 100) // First 100 chars for debugging
          });
        }
      }
    });
  });
  
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
  
  function generatePrompt(data) {
    const assetType = getMappedValue('assetType', data.assetType);
    const loanType = getMappedValue('loanType', data.loanType);
    const loanTerm = getMappedValue('loanTerm', data.loanTerm);
    
    const formattedLoanAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(data.loanAmount);
  
    return `Location: ${data.location}
  Deal Summary: ${data.dealSummary}
  Deal Description: ${data.dealDescription}
  Asset Type: ${assetType}
  Loan Amount: ${formattedLoanAmount}
  Loan Type: ${loanType}
  Loan Term: ${loanTerm}`;
  }
  
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
  
  app.post('/generate-prompt', (req, res) => {
    try {
      console.log('Processing request body:', req.body);
  
      const validation = validateRequest(req.body);
      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error
        });
      }
  
      const prompt = generatePrompt(req.body);
  
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
      console.error('Error processing request:', error);
      res.status(500).json({
        error: 'Failed to generate prompt',
        details: error.message,
        stack: error.stack
      });
    }
  });

  app.post('/parse-paste-data', (req, res) => {
    try {
      const { inputString } = req.body;
      
      if (!inputString) {
        return res.status(400).json({
          error: 'Missing required input string'
        });
      }
  
      // Parse the input string as JSON array
      let parsedArray;
      try {
        parsedArray = JSON.parse(inputString);
      } catch (e) {
        return res.status(400).json({
          error: 'Invalid JSON format',
          details: e.message
        });
      }
  
      // Initialize result object
      const result = {
        similarDealsLenders: [],
        capableLenders: [],
        localLenders: [],
        voicemailScript: '',
        emailDetails: {
          subject: '',
          summary: ''
        }
      };
  
      let currentSection = null;
  
      // Process each row in the array
      parsedArray.forEach(row => {
        // Check for section headers
        if (row[0].includes("institutions that have done similar deals")) {
          currentSection = "similarDeals";
        } else if (row[0].includes("institutions that can do the deal")) {
          currentSection = "capable";
        } else if (row[0].includes("institutions within a 20km radius")) {
          currentSection = "local";
        } else if (row[0] === "Voicemail Script") {
          currentSection = "voicemail";
        } else if (row[0] === "Deal Summary for Email") {
          currentSection = "email";
        }
        // Process data rows
        else if (row[0] !== "Company Name" && row[0] && currentSection) {
          switch (currentSection) {
            case "similarDeals":
            case "capable":
            case "local":
              if (row[0] && row[1] && row[2]) {
                const lender = {
                  companyName: row[0],
                  website: row[1],
                  reasonForFit: row[2]
                };
                if (currentSection === "similarDeals") {
                  result.similarDealsLenders.push(lender);
                } else if (currentSection === "capable") {
                  result.capableLenders.push(lender);
                } else {
                  result.localLenders.push(lender);
                }
              }
              break;
            case "voicemail":
              if (row[0] && !row[0].includes("Script")) {
                result.voicemailScript = row[0];
              }
              break;
            case "email":
              if (row[0] && row[1]) {
                result.emailDetails = {
                  subject: row[0],
                  summary: row[1]
                };
              }
              break;
          }
        }
      });
  
      res.json({
        success: true,
        data: result
      });
  
    } catch (error) {
      console.error('Error processing paste data:', error);
      res.status(500).json({
        error: 'Failed to parse paste data',
        details: error.message
      });
    }
  });
  // Add error handling middleware
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Server error',
      details: err.message
    });
  });
  
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });