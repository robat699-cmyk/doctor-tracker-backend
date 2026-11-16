import mongoose from 'mongoose';

export async function connectDB(): Promise<string> {
  const uri = process.env.MONGODB_URI;

  try {
    if (uri && !uri.includes('localhost') && !uri.includes('127.0.0.1')) {
      // Remote URI (MongoDB Atlas or remote cluster)
      await mongoose.connect(uri);
      console.log('Connected to Remote MongoDB Atlas successfully');
      return uri;
    }

    // Try standard local MongoDB connection first
    if (uri) {
      try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
        console.log(`Connected to Local MongoDB: ${uri}`);
        return uri;
      } catch {
        console.warn('Local mongod not reachable on port 27017. Spinning up embedded Mongo engine for seamless local development...');
      }
    }

    // Embedded in-memory MongoDB fallback (zero external setup required for local evaluation)
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const memoryUri = mongod.getUri();
    await mongoose.connect(memoryUri);
    console.log(`Connected to Embedded MongoDB Engine at: ${memoryUri}`);
    return memoryUri;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}
