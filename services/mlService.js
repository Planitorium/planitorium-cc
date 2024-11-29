// const axios = require("axios");

// const detectPlant = async (photo) => {
//   try {
//     // Ganti URL ini dengan endpoint API model Machine Learning Anda
//     const ML_API_URL = process.env.ML_API_URL || "https://example-ml-endpoint.com/predict";

//     const response = await axios.post(ML_API_URL, {
//       image: photo, // Pastikan format image sesuai dengan kebutuhan API Anda
//     });

//     // Asumsikan respons API memiliki format { result: "nama tanaman" }
//     return response.data.result;
//   } catch (error) {
//     console.error("Error communicating with ML service:", error.message);
//     throw new Error("Failed to detect plant");
//   }
// };

// module.exports = { detectPlant };

const detectPlant = async (photo) => {
    try {
      console.log("Simulating ML detection...");
      // Mensimulasikan respons
      return "Mocked Plant Name"; 
    } catch (error) {
      console.error("Error during mock ML service:", error.message);
      throw new Error("Failed to detect plant");
    }
  };
  
  module.exports = { detectPlant };
  