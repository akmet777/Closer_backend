const { default: mongoose } = require("mongoose");

const questionSchema = new mongoose.Schema({
  text: String,
  category: String,
  isActive: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("Question", questionSchema);
