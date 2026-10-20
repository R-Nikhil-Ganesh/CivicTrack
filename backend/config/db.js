import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civictrack';
    const isAtlas = uri.includes('mongodb+srv') || uri.includes('.mongodb.net');
    console.log(`[MongoDB Initializing]: Connecting to ${isAtlas ? 'MongoDB Atlas Cloud' : 'Local MongoDB'}...`);
    const conn = await mongoose.connect(uri);
    console.log(`✅ [MongoDB Connected]: Cluster: ${conn.connection.host} | Database: '${conn.connection.name}'`);
  } catch (error) {
    console.error(`❌ [MongoDB Connection Error]: ${error.message}`);
    if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.log('TIP: Check your Atlas username and password in backend/.env');
    } else if (error.message.includes('whitelist') || error.message.includes('ETIMEDOUT') || error.message.includes('querySrv')) {
      console.log('TIP: Ensure your current IP address is whitelisted in MongoDB Atlas (Network Access -> Add IP -> Allow from Anywhere 0.0.0.0/0)');
    } else {
      console.log('TIP: Ensure MongoDB is running locally on port 27017, or verify your Atlas MONGO_URI in backend/.env');
    }
  }
};
