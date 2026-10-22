import connectDB from './db';
import { User, ThreatSource, Asset, Threat, Incident, Vulnerability, Alert, AuditLog } from '../models';

export async function runMigrations() {
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
}


if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}
