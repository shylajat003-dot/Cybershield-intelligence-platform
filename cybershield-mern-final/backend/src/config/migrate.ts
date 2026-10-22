import connectDB from './db';
import { User, ThreatSource, Asset, Threat, Incident, Vulnerability, Alert, AuditLog } from '../models';

export async function runMigrations() {
  console.log('🚀 Ensuring MongoDB schemas and indexes are synchronized...');
  await connectDB();

  await Promise.all([
    User.syncIndexes(),
    ThreatSource.syncIndexes(),
    Asset.syncIndexes(),
    Threat.syncIndexes(),
    Incident.syncIndexes(),
    Vulnerability.syncIndexes(),
    Alert.syncIndexes(),
    AuditLog.syncIndexes()
  ]);

  console.log('✅ MongoDB schemas & indexes synchronized successfully.');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}
