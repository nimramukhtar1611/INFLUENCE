// middleware/apiKeyAuth.js
const validateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  const keyData = await ApiKey.findOne({ key: apiKey, active: true });
  if (!keyData) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  keyData.lastUsed = new Date();
  await keyData.save();
  next();
};