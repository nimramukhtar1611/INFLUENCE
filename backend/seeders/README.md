# Production Seed Data for MERN Influence Platform

This directory contains comprehensive seed data scripts for creating realistic Brand and Creator users with complete platform simulation data.

## Overview

The production seed data creates:
- **1 Brand User** (TechCorp Solutions)
- **1 Creator User** (Alex Rivera)
- **3 Campaigns** (active, paused, draft)
- **3 Deals** (in-progress, completed, negotiating)
- **Multiple Payments** (escrow, completed, fees)
- **Complete Platform Data** (notifications, analytics, conversations, etc.)

## Quick Start

### 1. Install Dependencies
```bash
npm install commander
```

### 2. Environment Setup
Ensure your `.env` file has the MongoDB connection string:
```
MONGODB_URI=mongodb://localhost:27017/influence
```

### 3. Run Production Seed
```bash
# Seed all data (preserves existing data)
npm run seed:production

# Seed all data and clear existing data
npm run seed:production:clear

# Or use the CLI directly
node seeders/run-seed.js all --clear
```

## Login Credentials

After seeding, you can log in with these credentials:

### Brand User
- **Email:** `sarah.chen@techcorp.io`
- **Password:** `SecureBrand2024!`
- **Company:** TechCorp Solutions
- **Industry:** Technology

### Creator User
- **Email:** `alex.rivera@creator.com`
- **Password:** `CreativePass2024!`
- **Handle:** `@alexrivera`
- **Primary Platform:** Instagram

## Available Commands

### CLI Commands
```bash
# Seed all production data
node seeders/run-seed.js all [--clear] [--verbose]

# Seed only users
node seeders/run-seed.js users [--clear]

# Seed campaigns only (requires existing brand user)
node seeders/run-seed.js campaigns [--brand <email>]

# Test database connection
node seeders/run-seed.js test-connection

# Clear all database data
node seeders/run-seed.js clear [--force]

# Verify seeded data integrity
node seeders/run-seed.js verify
```

### NPM Scripts
```bash
npm run seed:production          # Seed all data
npm run seed:production:clear    # Seed all data + clear existing
npm run seed:users              # Seed only users
npm run seed:campaigns          # Seed only campaigns
npm run seed:clear              # Clear all data
npm run seed:verify             # Verify data integrity
```

## Data Created

### Brand User (TechCorp Solutions)
- **Profile:** Complete company information, address, social media
- **Campaigns:** 3 campaigns in different states
- **Deals:** 3 deals with various statuses
- **Payments:** Escrow payments and completed transactions
- **Team:** Permissions and settings
- **Analytics:** Performance metrics and ROI data

### Creator User (Alex Rivera)
- **Profile:** Complete creator profile with bio and niches
- **Social Media:** Instagram (125K followers), YouTube (45K), TikTok (89K)
- **Portfolio:** 2 sample portfolio items with performance metrics
- **Rate Card:** Pricing for different platforms and content types
- **Audience:** Detailed demographics and engagement data
- **Earnings:** Complete payment history and stats
- **Verification:** Verified social accounts and platform status

### Platform Data
- **Campaigns:** Various states (active, paused, draft, completed)
- **Deals:** Complete deal lifecycle (pending, active, completed, negotiating)
- **Payments:** Escrow, completed, refunds, platform fees
- **Notifications:** In-app, email, and push notifications
- **Activity Logs:** User actions and system events
- **Analytics:** Platform-wide statistics and metrics
- **Conversations:** Message threads between brand and creator
- **Social Accounts:** Connected social media platforms with metrics

## Data Quality Features

### Realistic Data
- No placeholder values (no "test", "abc", "123")
- Real email addresses and passwords
- Authentic social media metrics
- Proper business information
- Realistic timestamps and progression

### Schema Compliance
- All required fields populated
- Proper enum values
- Valid ObjectId references
- Correct data types and formats
- No broken relationships

### Business Logic
- Logical status transitions
- Proper payment flows
- Realistic campaign timelines
- Accurate engagement metrics
- Proper commission calculations

## File Structure

```
seeders/
|-- production-seed-data.js    # Main seed data generation
|-- run-seed.js               # CLI interface and commands
|-- README.md                  # This documentation
|-- adminSeeder.js            # Existing admin seeder
|-- qaSeeder.js               # Existing QA seeder
```

## Usage Examples

### Development Environment
```bash
# Clear and reseed for development
npm run seed:production:clear

# Verify data integrity
npm run seed:verify
```

### Production Deployment
```bash
# Test connection first
node seeders/run-seed.js test-connection

# Seed production data (without clearing)
npm run seed:production

# Verify the data
npm run seed:verify
```

### Partial Seeding
```bash
# Only seed users for testing
npm run seed:users

# Add campaigns to existing brand
npm run seed:campaigns
```

## Data Relationships

The seed data maintains proper relationships:

- **Users** (Brand/Creator) reference base User documents
- **Campaigns** belong to Brand users
- **Deals** connect Campaigns, Brands, and Creators
- **Payments** reference Deals and Users
- **Notifications** target specific Users
- **Conversations** connect Users for specific Deals
- **Social Accounts** belong to Creators

## Security Notes

- Passwords are properly hashed using bcrypt
- No sensitive data in logs
- Environment variables used for configuration
- Proper validation and sanitization

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check MONGODB_URI in .env
   - Ensure MongoDB is running
   - Verify network connectivity

2. **Permission Denied**
   - Check database user permissions
   - Verify connection string authentication

3. **Data Validation Errors**
   - Schema changes may require seed updates
   - Check enum values and required fields

### Debug Mode
```bash
# Run with verbose output
node seeders/run-seed.js all --verbose

# Test connection
node seeders/run-seed.js test-connection
```

## Customization

### Modifying User Data
Edit the `brandData` and `creatorData` objects in `production-seed-data.js`:

```javascript
const brandData = {
  email: 'your.brand@company.com',
  password: 'YourSecurePassword123!',
  // ... other fields
};
```

### Adding More Data
The script is modular - you can easily add more campaigns, deals, or users by extending the respective functions.

### Environment-Specific Data
Use environment variables to customize data per environment:

```javascript
const brandEmail = process.env.BRAND_EMAIL || 'sarah.chen@techcorp.io';
```

## Support

For issues or questions about the seed data:
1. Check the troubleshooting section
2. Verify your MongoDB connection
3. Run the verify command to check data integrity
4. Check the console output for specific error messages
