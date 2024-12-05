async function predictClassification(model, imageBuffer) {
    try {
      const tensor = tf.node
        .decodeJpeg(imageBuffer)
        .resizeNearestNeighbor([224, 224])  // Sesuaikan ukuran input sesuai model
        .expandDims()
        .toFloat();
  
      // Prediksi hasil menggunakan model
      const prediction = model.predict(tensor);
      const score = await prediction.data();
  
      // Cari label dengan confidence tertinggi
      const maxScoreIndex = score.indexOf(Math.max(...score));
      const label = maxScoreIndex.toString();  // Pastikan label berupa string (0-6)
      const confidenceScore = Math.max(...score) * 100;
  
      // Tentukan saran berdasarkan label yang diprediksi
      let suggestion;
      if (label === '0') {
        suggestion = "Periksa daun yang terinfeksi dan gunakan fungisida untuk mengobati Antraknose.";
      }
      if (label === '1') {
        suggestion = "Batang jagung Anda sehat, pastikan tetap merawatnya dengan baik.";
      }
      if (label === '2') {
        suggestion = "Periksa dengan cermat dan gunakan fungisida untuk mencegah penyebaran bercak daun abu-abu.";
      }
      if (label === '3') {
        suggestion = "Segera tangani busuk batang dengan memotong bagian yang terinfeksi dan jauhkan dari tanaman lain.";
      }
      if (label === '4') {
        suggestion = "Daun jagung Anda sehat. Pertahankan perawatan yang baik dan pastikan penyiraman yang cukup.";
      }
      if (label === '5') {
        suggestion = "Hawar daun dapat ditangani dengan penggunaan fungisida dan pembersihan area tanaman.";
      }
      if (label === '6') {
        suggestion = "Gunakan fungisida berbasis tembaga atau produk yang mengandung triazol untuk mengatasi karat daun jagung.";
      }
  
      return {
        label: label,
        confidence: confidenceScore.toFixed(2), // Persentase kepercayaan
        suggestion: suggestion,
      };
    } catch (error) {
      throw new InputError("Terjadi kesalahan dalam melakukan prediksi");
    }
  }
  