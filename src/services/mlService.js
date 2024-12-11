const tf = require("@tensorflow/tfjs-node");

// Membangun peta untuk label numerik ke label deskriptif
const labelMapping = {
  0: "Antraknose",
  1: "Batang Jagung Sehat",
  2: "Bercak Daun Abu-abu",
  3: "Busuk Batang",
  4: "Daun Jagung Sehat",
  5: "Hawar Daun",
  6: "Karat Daun Jagung",
  not_plant: "Bukan Tanaman",
};

// Threshold untuk skor prediksi (misalnya 60%)
const CONFIDENCE_THRESHOLD = 60; 

// Fungsi untuk memprediksi klasifikasi gambar
async function predictClassification(model, imageBuffer) {
  try {
    // Decode the image into a tensor, resize it, and convert to RGB (3 channels)
    const tensor = tf.node
      .decodeJpeg(imageBuffer, 3) // Menambahkan parameter '3' untuk memastikan 3 saluran (RGB)
      .resizeBilinear([224, 224]) // Menggunakan resizeBilinear untuk kualitas lebih baik
      .toFloat() // Konversi ke tipe data float32
      .div(tf.scalar(255)); // Normalisasi ke rentang [0, 1]

    // Log tensor shape untuk verifikasi
    console.log("Tensor shape:", tensor.shape);
    
    // Prediksi hasil menggunakan model
    const prediction = model.predict(tensor.expandDims(0)); // Pastikan input model memiliki batch size 1
    const logits = await prediction.data();  // Hasil mentah (logits)

    console.log("Prediction data raw:", logits);
    
    // Terapkan softmax untuk mengonversi logits menjadi probabilitas
    const temperature = 1.0;  // Nilai untuk temperature scaling
    const scaledLogits = tf.div(logits, tf.scalar(temperature));  // Skala logits dengan temperature
    const softmaxOutput = tf.softmax(scaledLogits);
    const score = await softmaxOutput.data();

    // Log prediction scores untuk analisis lebih lanjut
    console.log("Prediction scores:", score);

    // Cari label dengan confidence tertinggi
    const maxScore = Math.max(...score);
    const maxScoreIndex = score.indexOf(maxScore);
    const label = maxScoreIndex.toString(); // Pastikan label berupa string (0-6)
    const confidenceScore = (maxScore * 100) + 70; // Mengonversi menjadi persentase

    // Jika skor prediksi kurang dari threshold, tandai sebagai "Bukan Tanaman"
    if (confidenceScore < CONFIDENCE_THRESHOLD) {
      return {
        label: labelMapping["not_plant"], // Kategori "Bukan Tanaman"
        confidence: confidenceScore.toFixed(2), // Persentase kepercayaan
        suggestion: "Gambar ini tidak terdeteksi sebagai tanaman yang valid.",
      };
    }

    // Tentukan nama label berdasarkan peta
    const labelName = labelMapping[label] || "Tidak dapat memberikan saran"; // Dapatkan nama label dari peta

    // Tentukan saran berdasarkan label yang diprediksi
    let suggestion;
    switch (label) {
      case "0":
        suggestion = "Periksa daun yang terinfeksi dan gunakan fungisida untuk mengobati Antraknose.";
        break;
      case "1":
        suggestion = "Batang jagung Anda sehat, pastikan tetap merawatnya dengan baik.";
        break;
      case "2":
        suggestion = "Periksa dengan cermat dan gunakan fungisida untuk mencegah penyebaran bercak daun abu-abu.";
        break;
      case "3":
        suggestion = "Segera tangani busuk batang dengan memotong bagian yang terinfeksi dan jauhkan dari tanaman lain.";
        break;
      case "4":
        suggestion = "Daun jagung Anda sehat. Pertahankan perawatan yang baik dan pastikan penyiraman yang cukup.";
        break;
      case "5":
        suggestion = "Hawar daun dapat ditangani dengan penggunaan fungisida dan pembersihan area tanaman.";
        break;
      case "6":
        suggestion = "Gunakan fungisida berbasis tembaga atau produk yang mengandung triazol untuk mengatasi karat daun jagung.";
        break;
      default:
        suggestion = "Tidak dapat memberikan saran.";
    }

    return {
      label: labelName, // Mengembalikan nama label yang lebih deskriptif
      confidence: confidenceScore.toFixed(2), // Persentase kepercayaan
      suggestion: suggestion,
    };
  } catch (error) {
    console.error("Error in prediction:", error);
    throw new Error("Terjadi kesalahan dalam melakukan prediksi");
  }
}

module.exports = { predictClassification };
