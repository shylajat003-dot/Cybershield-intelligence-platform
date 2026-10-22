import app from './app';
import { env } from './config/env';
import connectDB from './config/db';
import { runMigrations } from './config/migrate';
import { seedDatabase } from './config/seed';
import { User } from './models';

async function bootstrap() {
  try {
    const PORT = env.PORT;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    if (process.env.NODE_ENV !== 'test') {
      await connectDB();
      await runMigrations();

      // Ensure demo data exists
      try {
        const userCount = await User.countDocuments({});
        if (userCount === 0) {
          await seedDatabase();
        }
      } catch (err: any) {
        // Silently continue
      }
    }
  } catch (error) {
    process.exit(1);
  }
}

if (require.main === module || process.env.NODE_ENV !== 'test') {
  bootstrap();
}

export default app;
