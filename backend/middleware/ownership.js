
const checkOwnership = (model, ownerField = 'brandId') => async (req, res, next) => {
  try {
    const resource = await model.findById(req.params.id);
    if (!resource) return res.status(404).json({ success: false, error: 'Resource not found' });
    if (resource[ownerField] && resource[ownerField].toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    req.resource = resource;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { checkOwnership };