import { execSync } from 'child_process';
import admin from 'firebase-admin';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

// 1. Initialize Firebase
let app;
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (serviceAccountKey) {
  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'studio-1273073612-71183.firebasestorage.app'
    });
  } catch (e) {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY from environment.');
    process.exit(1);
  }
} else {
  // Try default credentials (ADC)
  app = admin.initializeApp({
    storageBucket: 'studio-1273073612-71183.firebasestorage.app'
  });
}

const bucket = admin.storage().bucket();
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const archiveName = `source-backup-${timestamp}.tar.gz`;
const remotePath = `backups/code/${archiveName}`;

async function runBackup() {
  console.log(`📦 Creating archive: ${archiveName}...`);
  
  // Exclude common large/unnecessary directories
  const excludes = [
    'node_modules',
    '.next',
    '.git',
    'dist',
    '.agent',
    '.cursor',
    '*.tar.gz'
  ];
  
  const excludeFlags = excludes.map(dir => `--exclude="${dir}"`).join(' ');
  
  try {
    // Create tarball
    execSync(`tar ${excludeFlags} -czf ${archiveName} .`);
    console.log('✅ Archive created successfully.');
    
    console.log(`🚀 Uploading to Firebase Storage: ${remotePath}...`);
    
    await bucket.upload(archiveName, {
      destination: remotePath,
      metadata: {
        contentType: 'application/gzip',
        metadata: {
          backupType: 'source-code',
          createdAt: new Date().toISOString(),
        }
      }
    });
    
    console.log('✨ Upload complete!');
    
    // Clean up
    console.log('⛑️ Cleaning up local archive...');
    unlinkSync(archiveName);
    console.log('Done!');
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

runBackup();
