// const tf = require("@tensorflow/tfjs-node"); 
// // const someMachineLearningModel = require("path/to/your/ml-model"); 

// // Fungsi untuk memproses gambar dan mendapatkan hasil deteksi
// const processImageForDetection = async (imageBuffer) => {
//   try {
//     const tfImage = tf.node.decodeImage(imageBuffer); // Decode buffer menjadi tensor gambar

//     // Melakukan prediksi menggunakan model machine learning
//     const model = await tf.loadLayersModel('file://path/to/your/model/model.json'); 
//     const prediction = model.predict(tfImage.expandDims(0)); 

//     // Konversi hasil prediksi ke bentuk yang lebih mudah dibaca
//     const result = prediction.dataSync(); // Ambil hasil prediksi

//     // Format hasil deteksi sesuai dengan yang Anda butuhkan
//     return result;
//   } catch (error) {
//     console.error("Error processing image with ML model:", error);
//     throw new Error("ML processing failed");
//   }
// };

// module.exports = { processImageForDetection };