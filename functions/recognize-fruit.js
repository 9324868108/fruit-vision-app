const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Google Generative AI client with the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

exports.handler = async function(event, context) {
  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    // Parse the request body
    const requestBody = JSON.parse(event.body);
    const { image } = requestBody;

    if (!image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Image is required' })
      };
    }

    // Get the Gemini Pro Vision model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

    // Create the prompt for the model
    const prompt = `
      Analyze this image and identify the fruit shown. 
      If there are multiple fruits, identify the most prominent one.
      If there is no fruit in the image, respond with "No fruit detected".
      
      Respond with a JSON object in the following format:
      {
        "fruitName": "The name of the fruit",
        "scientificName": "Scientific name of the fruit",
        "confidence": 0.95, // A number between 0 and 1 indicating confidence
        "description": "A brief description of the fruit"
      }
      
      Only respond with the JSON object, nothing else.
    `;

    // Generate content with the image
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: image,
          mimeType: 'image/jpeg'
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();

    // Extract JSON from the response (which might be wrapped in markdown code blocks)
    const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonRegex);
    
    let jsonText = match && match[1] ? match[1].trim() : text.trim();
    
    // Parse the JSON
    const fruitResult = JSON.parse(jsonText);

    if (fruitResult.fruitName === 'No fruit detected') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No fruit detected in the image' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(fruitResult)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};
