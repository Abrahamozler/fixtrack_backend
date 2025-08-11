# FixTrack Pro — Backend (Render + MongoDB Atlas)

## Setup
1. Create MongoDB Atlas cluster and get connection string (MONGO_URI).
2. Create a GitHub repo and push this backend folder.
3. On Render: New -> Web Service -> Connect repo.
   - Build Command: npm install
   - Start Command: npm start
4. In Render dashboard set environment variables:
   - MONGO_URI = your_mongodb_connection_string
   - JWT_SECRET = a_random_secret_string (optional)
5. Deploy. The app will be available at the Render URL.

## Notes
- API endpoints require Authorization header: `Bearer <token>`.
- Use the frontend (config.js) to point to Render URL.
