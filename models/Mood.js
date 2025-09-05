const mongoose = require("mongoose");

const moodSchema = new mongoose.Schema(
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
    date: {
      type: Date,
      default: Date.now,
    },
    color: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one mood per user per day
moodSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Mood", moodSchema);
