# Closer - Couples Connection Backend API

A secure and robust backend API for a couples' connection app designed to help long-distance relationships maintain intimacy through shared daily experiences. Built with **Node.js, Express, and MongoDB**.

## 🌟 Features

- **🔐 Secure Authentication** - JWT tokens + email verification
- **💬 Daily Questions** - 96 pre-seeded questions with daily rotation
- **🎨 Mood Tracking** - Color-coded emotional check-ins
- **👥 Partner System** - Unique invite codes for couple connection
- **📸 Memory Feed** - Shared timeline with emotional context
- **🔄 Real-time Sync** - Partners see each other's daily updates
- **🗑️ Account Management** - GDPR-compliant deletion

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT, bcrypt password hashing
- **Email:** Nodemailer for verification
- **Security:** CORS, environment variables, input validation

## 📦 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration with email verification
- `POST /api/auth/login` - User login
- `GET /api/auth/verify/:token` - Email verification

### Couples Connection
- `POST /api/invite/generate` - Generate invite code
- `POST /api/invite/use` - Connect with partner using code

### Daily Features
- `GET /api/question/today` - Get today's question
- `POST /api/question/answer` - Submit answer
- `POST /api/mood` - Submit daily mood
- `GET /api/mood/partner` - Get partner's mood
- `GET /api/question/partner` - Get partner's answer

### Memory Feed
- `POST /api/memoryfeed` - Add memory with emotional context
- `GET /api/memoryfeed` - Paginated memory timeline
- `DELETE /api/memoryfeed/:id` - Delete memory

### Account Management
- `DELETE /api/user` - Delete account with partner cleanup

Copyright (c) 2025 Temuulen Norovpel. All rights reserved.

This code is for educational and demonstration purposes only. 
Unauthorized copying, modification, distribution, or use is prohibited.
