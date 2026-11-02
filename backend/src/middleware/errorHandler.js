export function errorHandler(error, _req, res, _next) {
  const status = error.status || 500
  const message =
    status === 500 ? 'Unexpected server error. Please try again.' : error.message

  res.status(status).json({ message })
}
