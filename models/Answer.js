const { default: mongoose } = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coupleId: {
      type: String,
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    date: { type: Date, default: Date.now },
    answerText: String,
  },
  { timestamps: true }
);
answerSchema.index({ userId: 1, questionId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Answer", answerSchema);
