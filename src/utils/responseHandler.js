const generateResponse = (statusCode, message, data = null) => {
    return {
      statusCode,
      message,
      ...(data && { data }),
    };
  };
  
  const errorHandler = (error) => {
    console.error(error.message || "Unknown Error");
    return { message: "Internal Server Error", error: error.message };
  };
  
  module.exports = { generateResponse, errorHandler };