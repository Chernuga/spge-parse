// functions/fetch-pdf.js
exports.handler = async function(event) {
  // The URL to fetch is passed as a query parameter
  const url = event.queryStringParameters.url;
  
  if (!url) {
    return {
      statusCode: 400,
      body: 'Missing "url" parameter',
    };
  }

  try {
    // Fetch the PDF from the school server (no CORS worries here)
    const response = await fetch(url);
    
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: `Upstream error: ${response.status} ${response.statusText}`,
      };
    }

    // Read the response as an array buffer
    const buffer = await response.arrayBuffer();

    // Return the PDF with CORS headers so your frontend can use it
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Access-Control-Allow-Origin': '*',   // or your own domain
        'Cache-Control': 'public, max-age=3600',
      },
      body: Buffer.from(buffer).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `Fetch error: ${error.message}`,
    };
  }
};