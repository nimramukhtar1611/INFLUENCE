// scripts/rotateSecrets.js - Updated with your responses
// Run: node scripts/rotateSecrets.js

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}`);
console.log(`${colors.bright}${colors.yellow}   SECRET ROTATION UTILITY v1.0   ${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}`);
console.log();

/**
 * Generate a secure random string
 */
function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a JWT secret (base64url encoded)
 */
function generateJWTSecret() {
  return crypto.randomBytes(48).toString('base64url');
}

/**
 * Generate an encryption key (32 bytes for AES-256)
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Generate API key (with prefix)
 */
function generateApiKey(prefix = 'INF') {
  const random = crypto.randomBytes(24).toString('base64url');
  return `${prefix}_${random}`;
}

/**
 * Read current .env file
 */
function readEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log(`${colors.red}❌ .env file not found at ${envPath}${colors.reset}`);
    return null;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  const env = {};

  lines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      if (key && value) {
        env[key.trim()] = value;
      }
    }
  });

  return { env, lines, envPath };
}

/**
 * Write updated .env file
 */
function writeEnvFile(envPath, lines, updates) {
  const newLines = lines.map(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key] = line.split('=');
      const trimmedKey = key.trim();
      if (updates[trimmedKey]) {
        return `${trimmedKey}=${updates[trimmedKey]}`;
      }
    }
    return line;
  });

  fs.writeFileSync(envPath, newLines.join('\n'));
}

/**
 * Create backup of current .env
 */
function createBackup(envPath) {
  const backupPath = `${envPath}.backup.${Date.now()}`;
  fs.copyFileSync(envPath, backupPath);
  return backupPath;
}

/**
 * Main rotation function
 */
async function rotateSecrets() {
  const envData = readEnvFile();
  if (!envData) {
    process.exit(1);
  }

  const { env, lines, envPath } = envData;

  console.log(`${colors.green}📁 Current .env file loaded${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Creating backup before making changes...${colors.reset}`);

  const backupPath = createBackup(envPath);
  console.log(`${colors.green}✅ Backup created at: ${backupPath}${colors.reset}`);
  console.log();

  const updates = {};
  const warnings = [];
  const manuallyUpdated = [];

  // Based on your responses
  const responses = {
    JWT_SECRET: 'y',
    JWT_REFRESH_SECRET: 'y',
    SESSION_SECRET: 'y',
    ENCRYPTION_KEY: 'y',
    STRIPE_SECRET_KEY: 'n',
    STRIPE_WEBHOOK_SECRET: 'n',
    TWILIO_ACCOUNT_SID: 'n'
  };

  const questions = [
    {
      key: 'JWT_SECRET',
      name: 'JWT Secret',
      generate: generateJWTSecret,
      response: responses.JWT_SECRET
    },
    {
      key: 'JWT_REFRESH_SECRET',
      name: 'JWT Refresh Secret',
      generate: generateJWTSecret,
      response: responses.JWT_REFRESH_SECRET
    },
    {
      key: 'SESSION_SECRET',
      name: 'Session Secret',
      generate: () => generateSecret(64),
      response: responses.SESSION_SECRET
    },
    {
      key: 'ENCRYPTION_KEY',
      name: 'Encryption Key',
      generate: generateEncryptionKey,
      response: responses.ENCRYPTION_KEY
    },
    {
      key: 'STRIPE_SECRET_KEY',
      name: 'Stripe Secret Key',
      generate: null,
      manual: true,
      response: responses.STRIPE_SECRET_KEY
    },
    {
      key: 'STRIPE_WEBHOOK_SECRET',
      name: 'Stripe Webhook Secret',
      generate: null,
      manual: true,
      response: responses.STRIPE_WEBHOOK_SECRET
    },
    {
      key: 'TWILIO_ACCOUNT_SID',
      name: 'Twilio Account SID',
      generate: null,
      manual: true,
      response: responses.TWILIO_ACCOUNT_SID
    }
  ];

  console.log(`${colors.cyan}Processing based on your selections...${colors.reset}`);
  console.log();

  for (const q of questions) {
    const current = env[q.key] || '(not set)';
    const maskedCurrent = current.length > 10 
      ? current.substring(0, 6) + '...' + current.slice(-4)
      : current;

    console.log(`${colors.bright}${q.name} (${q.key})${colors.reset}`);
    console.log(`  Current: ${colors.dim}${maskedCurrent}${colors.reset}`);

    if (q.generate && q.response === 'y') {
      const newSecret = q.generate();
      updates[q.key] = newSecret;
      console.log(`  ${colors.green}✅ New secret generated: ${newSecret.substring(0, 8)}...${newSecret.slice(-4)}${colors.reset}`);
    } else if (q.generate && q.response !== 'y') {
      console.log(`  ${colors.yellow}⏭️  Skipped (kept existing)${colors.reset}`);
    } else if (q.manual && q.response === 'y') {
      console.log(`  ${colors.magenta}⚠️  Marked for manual update${colors.reset}`);
      warnings.push(`${q.key} - needs manual update from ${q.key.split('_')[0]} dashboard`);
      manuallyUpdated.push(q.key);
    } else if (q.manual) {
      console.log(`  ${colors.yellow}⏭️  Skipped (using existing value)${colors.reset}`);
    }

    console.log();
  }

  // Generate new secrets that were requested
  const newSecrets = {
    JWT_SECRET: updates.JWT_SECRET || generateJWTSecret(),
    JWT_REFRESH_SECRET: updates.JWT_REFRESH_SECRET || generateJWTSecret(),
    SESSION_SECRET: updates.SESSION_SECRET || generateSecret(64),
    ENCRYPTION_KEY: updates.ENCRYPTION_KEY || generateEncryptionKey()
  };

  // Apply updates
  if (Object.keys(updates).length > 0) {
    console.log(`${colors.green}✅ Applying ${Object.keys(updates).length} secret updates...${colors.reset}`);
    writeEnvFile(envPath, lines, updates);
    console.log(`${colors.green}✅ .env file updated successfully${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  No automatic updates were applied${colors.reset}`);
  }

  // Show new secrets for reference
  console.log();
  console.log(`${colors.cyan}🔐 NEW SECRETS GENERATED:${colors.reset}`);
  console.log(`${colors.bright}========================================${colors.reset}`);
  Object.entries(newSecrets).forEach(([key, value]) => {
    console.log(`${colors.green}${key}=${value}${colors.reset}`);
  });
  console.log(`${colors.bright}========================================${colors.reset}`);
  console.log(`${colors.yellow}⚠️  SAVE THESE SECRETS SOMEWHERE SAFE!${colors.reset}`);
  console.log();

  // Show warnings for manual updates
  if (manuallyUpdated.length > 0) {
    console.log();
    console.log(`${colors.yellow}⚠️  MANUAL ACTIONS REQUIRED (You marked these for update):${colors.reset}`);
    manuallyUpdated.forEach(key => {
      console.log(`  ${colors.red}• ${key} - needs manual update from ${key.split('_')[0]} dashboard${colors.reset}`);
    });
  }

  // Stripe manual update instructions
  if (manuallyUpdated.includes('STRIPE_SECRET_KEY') || manuallyUpdated.includes('STRIPE_WEBHOOK_SECRET')) {
    console.log();
    console.log(`${colors.cyan}📋 Stripe Manual Update Instructions:${colors.reset}`);
    console.log(`  1. Go to https://dashboard.stripe.com/apikeys`);
    console.log(`  2. Generate new secret key`);
    console.log(`  3. Update STRIPE_SECRET_KEY in .env`);
    if (manuallyUpdated.includes('STRIPE_WEBHOOK_SECRET')) {
      console.log(`  4. Go to https://dashboard.stripe.com/webhooks`);
      console.log(`  5. Create new webhook endpoint or regenerate signing secret`);
      console.log(`  6. Update STRIPE_WEBHOOK_SECRET in .env`);
    }
  }

  // Twilio manual update instructions
  if (manuallyUpdated.includes('TWILIO_ACCOUNT_SID')) {
    console.log();
    console.log(`${colors.cyan}📋 Twilio Manual Update Instructions:${colors.reset}`);
    console.log(`  1. Go to https://console.twilio.com`);
    console.log(`  2. Navigate to Account > API keys & tokens`);
    console.log(`  3. Generate new auth token`);
    console.log(`  4. Update TWILIO_AUTH_TOKEN in .env`);
    console.log(`  5. Note: Account SID cannot be changed, only auth token`);
  }

  // Final summary
  console.log();
  console.log(`${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.green}✅ Secret rotation completed!${colors.reset}`);
  console.log(`${colors.cyan}========================================${colors.reset}`);
  console.log();
  console.log(`${colors.yellow}📋 NEXT STEPS:${colors.reset}`);
  console.log(`  1. ${colors.green}Update your deployed environment variables${colors.reset}`);
  console.log(`  2. ${colors.green}Restart your application${colors.reset}`);
  console.log(`  3. ${colors.green}Test authentication endpoints${colors.reset}`);
  console.log(`  4. ${colors.green}Update all team members with new secrets${colors.reset}`);
  console.log(`  5. ${colors.green}Monitor logs for any issues${colors.reset}`);
  console.log(`  6. ${colors.yellow}Delete old backup file after confirmation: ${backupPath}${colors.reset}`);
  console.log();

  // Ask if user wants to save secrets to a file
  const saveToFile = await askQuestion(`${colors.cyan}Save new secrets to a separate file? (y/n) [n]: ${colors.reset}`);
  
  if (saveToFile.toLowerCase() === 'y') {
    const secretsPath = path.join(__dirname, '..', `new-secrets-${Date.now()}.txt`);
    const secretsContent = Object.entries(newSecrets)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    fs.writeFileSync(secretsPath, secretsContent);
    console.log(`${colors.green}✅ Secrets saved to: ${secretsPath}${colors.reset}`);
    console.log(`${colors.red}⚠️  DELETE THIS FILE AFTER UPDATING YOUR ENVIRONMENT!${colors.reset}`);
  }

  rl.close();
}

/**
 * Helper to ask questions
 */
function askQuestion(query) {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer.trim());
    });
  });
}

// Run the script
rotateSecrets().catch(error => {
  console.error(`${colors.red}❌ Error:${colors.reset}`, error);
  process.exit(1);
});