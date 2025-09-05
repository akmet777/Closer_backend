const mongoose = require("mongoose");
const Question = require("./models/Question");
const questions = require("./questions.json");

const MONGO_URI =
  "mongodb+srv://norovpeltemuulen:AUyiaxPJgF4BsZeC@cluster0.h5eszbj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Clear existing questions
    await Question.deleteMany({});
    console.log("Cleared existing questions");

    // Insert new questions
    await Question.insertMany(questions);
    console.log(`Successfully seeded ${questions.length} questions`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
