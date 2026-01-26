const { TwitterApi } = require('twitter-api-v2');

// App-level client (for reading public data)
const appClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);

// User authentication client (for OAuth flow)
const authClient = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
});

// Create client for a specific user (for posting as @9LVNetwork or @9LV_Nerm)
function createUserClient(accessToken, accessSecret) {
  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: accessToken,
    accessSecret: accessSecret,
  });
}

// Client for @9LVNetwork (main game account)
function getNineLivesClient() {
  return createUserClient(
    process.env.NINELIVES_ACCESS_TOKEN,
    process.env.NINELIVES_ACCESS_SECRET
  );
}

// Client for @9LV_Nerm (bot account)
function getNermClient() {
  return createUserClient(
    process.env.NERM_ACCESS_TOKEN,
    process.env.NERM_ACCESS_SECRET
  );
}

module.exports = {
  appClient,
  authClient,
  createUserClient,
  getNineLivesClient,
  getNermClient,
};