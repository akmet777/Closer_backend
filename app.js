require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const auth = require("./middleware");
const Mood = require("./models/Mood");
const Question = require("./models/Question");
const Answer = require("./models/Answer");
const Memory = require("./models/Memory");
const cors = require("cors");
// App initialization
const app = express();
app.use(cors());
app.use(express.json());

function generateSixDigitCode() {
  const code = Math.floor(100000 + Math.random() * 900000);
  return code.toString(); // Return it as a string
}

async function connectDB() {
  try {
    await mongoose.connect(process.env.URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

// Routes
app.get("/test", (req, res) => {
  res.json({ message: "hello world" });
});

// sign up
app.post("/api/auth/signup/", async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email: email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const emailVerifyToken = crypto.randomBytes(32).toString("hex");

    const newUser = new User({
      email: email,
      password: hashedPassword,
      emailVerifyToken: emailVerifyToken,
      isVerified: false,
    });

    await newUser.save();

    const verificationUrl = `http://localhost:3000/api/auth/verify/${emailVerifyToken}`;

    const mailOptions = {
      from: "norovpeltemuulen@gmail.com",
      to: newUser.email,
      subject: "Verify your email for our app CLOSER",
      html: `<p>Please check the link below to verify your email.</p>
            <a href=${verificationUrl}>${verificationUrl}</a>`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "YEAH the user is created succesfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during signUps" });
  }
});

// verify user endpoint
app.get("/api/auth/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ emailVerifyToken: token });
    if (!user) {
      return res.status(400).json({ message: "Invalid verification Token" });
    }
    user.isVerified = true;
    user.emailVerifyToken = null;
    await user.save();
    res.status(200).json({ message: "Email verified successfully!" });
  } catch (error) {
    console.error(error);
    res.status(200).json({ message: "Server error during verification" });
  }
});

app.post("/api/auth/login/", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({
      email: email,
    });
    if (!user) {
      return res
        .status(400)
        .json({ message: "The email or password is wrong" });
    } else {
      if (user.isVerified) {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (isPasswordValid) {
          const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: "30d",
          });
          res.json({ message: "Login is succesful", token: token });
        } else {
          res.status(200).json({ message: "The email or password is wrong" });
        }
      } else {
        res.status(200).json({
          message: "User is not verified",
        });
      }
    }
  } catch (error) {
    console.error(error);
    res
      .status(200)
      .json({ message: "Error occured on the server during login" });
  }
});

app.post("/api/invite/generate", auth.authMiddleware, async (req, res) => {
  try {
    user = await User.findOne({ _id: req.userId });
    if (!user) {
      res.status(400).json({ message: "user not found" });
    } else {
      if (!user.coupleId) {
        let inviteCode;
        let isCodeUnique = false;
        while (!isCodeUnique) {
          inviteCode = generateSixDigitCode();
          const existingUser = await User.findOne({ inviteCode: inviteCode });
          if (!existingUser) {
            isCodeUnique = true;
          }
        }
        user.inviteCode = inviteCode;
        await user.save();
        res.json({ inviteCode: inviteCode });
      } else {
        res.status(500).json({ message: "You are already in a room" });
      }
    }
  } catch (error) {
    res.status(500).json({ message: "Server error generating code" });
  }
});

app.post("/api/invite/use/", auth.authMiddleware, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const currentUserId = req.userId;

    const currentUser = await User.findById(currentUserId);

    const partnerUser = await User.findOne({ inviteCode: inviteCode });

    if (!partnerUser) {
      res.status(400).json({ message: "Invalid invite code" });
    }
    if (partnerUser._id.equals(currentUser._id)) {
      return res
        .status(400)
        .json({ message: "You cannot use your own invite code" });
    } else {
      currentUser.partnerId = partnerUser._id;
      partnerUser.partnerId = currentUser._id;
      partnerUser.inviteCode = null;
      currentUser.inviteCode = null;
      partnerUser.coupleId = partnerUser._id;
      currentUser.coupleId = partnerUser._id;
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        await currentUser.save({ session });
        await partnerUser.save({ session });

        await session.commitTransaction();
        session.endSession();
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
      }
      res.status(200).json({ message: "The room created succesfully" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "server error occured while creating room" });
  }
});

app.post("/api/mood/", auth.authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Sets time to 00:00:00:000 (start of day)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Sets to 00:00:00 of the next day
    const { color } = req.body;
    const userId = req.userId;
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      res.status(404).json({ message: "User not found" });
    } else {
      const updateMood = await Mood.findOneAndUpdate(
        {
          userId: userId,
          date: { $gte: today, $lt: tomorrow },
        },
        {
          $set: {
            color: color,
            coupleId: currentUser.coupleId,
          },
        },
        {
          upsert: true,
          new: true,
        }
      );
      res
        .status(200)
        .json({ message: "Mood updated successfully", mood: updateMood });
    }
  } catch (error) {
    res.status(200).json({ message: "Server error updating mood" });
  }
});

app.get("/api/question/today/", auth.authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const allQuestions = await Question.find({ isActive: true });
    if (allQuestions.length === 0) {
      return res.status(404).json({ message: "No active questions found" });
    }
    const dayOfYear = getDayOfYear();
    const questionIndex = dayOfYear % allQuestions.length;
    const todaysQuestion = allQuestions[questionIndex];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    res.status(200).json({
      question: {
        id: todaysQuestion._id,
        text: todaysQuestion.text,
        category: todaysQuestion.category,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error occurred while fetching today's question",
    });
  }
});

app.post("/api/question/answer/", auth.authMiddleware, async (req, res) => {
  try {
    const { answerText, questionId } = req.body;
    const userId = req.userId;
    if (!answerText || !questionId) {
      res.status(400).json({ message: "Missing answer text or questionId" });
    }

    const currentUser = await User.findById(userId);
    if (!currentUser || !currentUser.coupleId) {
      res.status(400), json({ message: "Must be in a couple to answer" });
    }
    const question = await Question.findById(questionId);
    if (!question || !question.isActive) {
      res.status(400).json({ message: "Invalid question" });
    }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const answer = await Answer.findOneAndUpdate(
      {
        userId: userId,
        questionId: questionId,
        date: { $gte: todayStart, $lt: tomorrowStart },
      },
      {
        $set: {
          answerText: answerText,
          coupleId: currentUser.coupleId,
        },
      },

      {
        upsert: true,
        new: true,
      }
    );
    res.status(200).json({ message: "answer saved", asnwer: answer });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Server error occurred while saving answer" });
  }
});

app.get("/api/mood/partner/", auth.authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      res.status(404).json({ message: "No partner found" });
    }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const partnerMood = await Mood.findOne({
      userId: currentUser.partnerId,
      date: { $gte: todayStart, $lt: tomorrowStart },
    });

    if (!partnerMood) {
      res.status(404).json({ message: "Partner hasn't set a mood today" });
    }
    res.json({ partnerMood: partnerMood });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching partner's mood" });
  }
});

app.get("/api/question/partner/", auth.authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const currentUser = User.findById(userId);
    if (!currentUser) {
      res.status(404).json({ message: "User not found" });
    }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const partnerAnswer = await Answer.findOne({
      userId: currentUser.partnerId,
      date: {
        $gte: todayStart,
        $lt: tomorrowStart,
      },
    });
    if (!partnerAnswer) {
      res
        .status(404)
        .json({ message: "The partner hasn't answered a question yet" });
    }
    res.json({ partnerAnswer: partnerAnswer });
  } catch (error) {
    res.status(500).json({ message: "The error occured getiing answer" });
  }
});

app.post("/api/memoryfeed/", auth.authMiddleware, async (req, res) => {
  try {
    const { text, photoUrl } = req.body;
    const userId = req.userId;
    const currentUser = await User.findById(userId);
    if (!currentUser || !currentUser.coupleId) {
      res.status(400).json({ message: "Must be in a couple to add memories" });
    }

    // Get user's current mood color
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const currentMood = await Mood.findOne({
      userId: userId,
      date: { $gte: todayStart, $lt: tomorrowStart },
    });
    const memoryColor = currentMood ? currentMood.color : "#FFFFFF";

    const newMemory = new Memory({
      userId: userId,
      coupleId: currentUser.coupleId,
      color: memoryColor,
      text: text,
      photoUrl: photoUrl || null,
    });

    await newMemory.save();

    res.status(201).json({
      message: "memory added to a jar",
      memory: newMemory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error occured posting memory" });
  }
});

app.get("/api/memoryfeed/", auth.authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const currentUser = await User.findById(userId);
    if (!currentUser || !currentUser.coupleId) {
      res.status(400).json({ message: "User is not in the couple." });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const memories = await Memory.find({ coupleId: currentUser.coupleId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId");

    const totalMemories = await Memory.countDocuments({
      coupleId: currentUser.coupleId,
    });

    const hasMore = skip + memories.length < totalMemories;

    res.json({
      memories: memories,
      pagination: {
        page: page,
        limit: limit,
        total: totalMemories,
        hasMore: hasMore,
      },
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Server error occured during fetching memories" });
  }
});

app.delete("/api/user/", auth.authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.userId;
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      await session.abortTransaction();
      res.status(404).json({ message: "user not found" });
    }
    if (currentUser.partnerId) {
      const partner = await User.findById(currentUser.partnerId).session(
        session
      );
      if (partner) {
        // Remove partnership (set both to single)
        partner.partnerId = null;
        partner.coupleId = null;
        await partner.save({ session });
      }
    }
    await Mood.deleteMany({ userId: userId }).session(session);
    await Answer.deleteMany({ userId: userId }).session(session);
    await Memory.deleteMany({ userId: userId }).session(session);

    // delete the user account
    await User.findByIdAndDelete(userId).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Account deletion error:", error);
    res.status(500).json({ message: "Error deleting account" });
  }
});

app.delete(
  "/api/memoryfeed/:memoryId",
  auth.authMiddleware,
  async (req, res) => {
    try {
      const { memoryId } = req.params;
      const userId = req.userId;

      //  Find the memory and verify ownership
      const memory = await Memory.findOne({
        _id: memoryId,
        userId: userId, // Crucial: user can only delete their own memories
      });

      if (!memory) {
        return res.status(404).json({
          message: "Memory not found or you don't have permission to delete it",
        });
      }

      //Delete the memory
      await Memory.findByIdAndDelete(memoryId);

      res.status(200).json({ message: "Memory deleted successfully" });
    } catch (error) {
      console.error("Memory deletion error:", error);
      res.status(500).json({ message: "Error deleting memory" });
    }
  }
);
// Server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});
connectDB();
