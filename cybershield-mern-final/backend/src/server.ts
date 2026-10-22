import app from './app';
import { env } from './config/env';
import connectDB from './config/db';
import { runMigrations } from './config/migrate';
import { seedDatabase } from './config/seed';
import { User } from './models';

async function bootstrap() {
  try {
    if (process.env.NODE_ENV !== 'test') {
      await connectDB();
      await runMigrations();

      // Ensure demo data exists
      try {
        const userCount = await User.countDocuments({});
        if (userCount === 0) {
          console.log('🌱 No users found in MongoDB, auto-seeding demo dataset...');
          await seedDatabase();
        }
      } catch (err: any) {
        console.warn('⚠️ Seeding check notice:', err.message);
      }
    }

    const PORT = env.PORT;
    app.listen(PORT, () => {
      console.log(`🚀 CyberShield MERN API server running on port ${PORT}`);
      console.log(`🔒 Environment: ${env.NODE_ENV}`);
      console.log(`🍃 Database: MongoDB + Mongoose`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module || process.env.NODE_ENV !== 'test') {
  bootstrap();
}

export default app;
