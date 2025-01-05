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

  app.post('/parse-csv-data', (req, res) => {
    try {
      const { inputString } = req.body;
      
      if (!inputString) {
        return res.status(400).json({
          error: 'Missing required input string'
        });
      }
  
      // Remove backticks if present
      let processedString = inputString;
      if (inputString.startsWith('```') && inputString.endsWith('```')) {
        processedString = inputString.slice(3, -3).trim();
      }
  
      // Split the input into sections based on "---"
      const sections = processedString.split('---').map(section => section.trim());
      
      // Initialize result object
      const result = {
        lenderLists: [],
        script: '',
        emailDetails: null
      };
  
      // Process each section
      sections.forEach(section => {
        // Check if section is CSV data (starts with "Company Name,Website,Reason for Fit")
        if (section.startsWith('Company Name,Website,Reason for Fit')) {
          // Parse CSV section
          const lines = section.split('\n')
            .map(line => line.trim())
            .filter(line => line && line !== 'Company Name,Website,Reason for Fit');
          
          const lenders = lines.map(line => {
            const [companyName, website, reasonForFit] = line.split(',').map(field => field.trim());
            return {
              companyName,
              website,
              reasonForFit
            };
          });
          
          if (lenders.length > 0) {
            result.lenderLists.push(lenders);
          }
        }
        // Check if section is script
        else if (section.startsWith('Script')) {
          result.script = section.replace('Script', '').trim();
        }
        // Check if section contains email details
        else if (section.includes('Email Subject,Deal Summary')) {
          const lines = section.split('\n')
            .map(line => line.trim())
            .filter(line => line && line !== 'Email Subject,Deal Summary');
          
          if (lines.length > 0) {
            const [subject, summary] = lines[0].split(',').map(field => field.trim());
            result.emailDetails = {
              subject,
              summary
            };
          }
        }
      });
  
      res.json({
        success: true,
        data: result
      });
  
    } catch (error) {
      console.error('Error processing CSV data:', error);
      res.status(500).json({
        error: 'Failed to parse CSV data',
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