/**
 * One-time script to get OAuth tokens for @9LV_Nerm
 *
 * Run this script, then:
 * 1. Open the URL it prints
 * 2. Log in as @9LV_Nerm
 * 3. Authorize the app
 * 4. Copy the PIN shown
 * 5. Enter the PIN when prompted
 * 6. Copy the access tokens to Replit Secrets
 */

const { TwitterApi } = require('twitter-api-v2');
const readline = require('readline');
require('dotenv').config();

async function getNermTokens() {
  // Create client with app credentials
  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
  });

  try {
    // Generate auth link (PIN-based for simplicity)
    const authLink = await client.generateAuthLink('oob', {
      linkMode: 'authorize',
    });

    console.log('\n========================================');
    console.log('STEP 1: Open this URL in your browser:');
    console.log('========================================\n');
    console.log(authLink.url);
    console.log('\n========================================');
    console.log('STEP 2: Log in as @9LV_Nerm');
    console.log('STEP 3: Click "Authorize app"');
    console.log('STEP 4: Copy the PIN shown');
    console.log('========================================\n');

    // Wait for PIN input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Enter the PIN: ', async (pin) => {
      try {
        // Exchange PIN for access tokens
        const {
          client: loggedClient,
          accessToken,
          accessSecret,
        } = await client.login(pin.trim());

        // Verify it worked
        const { data: user } = await loggedClient.v2.me();

        console.log('\n========================================');
        console.log('SUCCESS! Authenticated as:', user.username);
        console.log('========================================\n');
        console.log('Add these to Replit Secrets:\n');
        console.log(`NERM_ACCESS_TOKEN=${accessToken}`);
        console.log(`NERM_ACCESS_SECRET=${accessSecret}`);
        console.log('\n========================================\n');
      } catch (error) {
        console.error('Error:', error.message);
      }

      rl.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error generating auth link:', error.message);
    process.exit(1);
  }
}

getNermTokens();
