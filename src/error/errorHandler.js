export function errorHandler(err, req, res, next) {
  const { status, message, errors } = err;
  let validationErrors;
  if (errors) {
    validationErrors = {};
    errors.forEach(
      (error) => (validationErrors[error.path] = req.t(error.msg))
    );
  }
  return res.status(status).json({
    message: req.t(message),
    timestamps: new Date().getTime(),
    path: req.originalUrl,
    validationErrors,
  });
}
export function notFoundHandler(req, res) {
  res.status(404).json({
    message: 'Not Found',
    timestamps: new Date().getTime(),
    path: req.originalUrl,
  });
}
