const tf = require("@tensorflow/tfjs-node");

async function loadModel() {
  try {
    const model = await tf.loadGraphModel(process.env.MODEL_URL);
    return model;
  } catch (error) {
    console.error("Error loading model:", error);
    throw new Error("Failed to load TensorFlow model");
  }
}

module.exports = loadModel;
