const versions = require('./lib/versions/');
const { ValidationErrors } = require('./lib/errors/');

function create(schema) {
  const [major] = (schema.swagger || schema.version || '').split('.');
  return versions[major] && new versions[major](schema);
}

function requestValidatorMiddleware(validator, options = {}) {
  return function (req, res, next) {
    const handler = validator.getRequestValidator(req, options.response);
    if (!handler) return void next();
    handler(req, res, err => {
      if (err && err instanceof ValidationErrors) {
        if (typeof options.request === 'function') {
          return void options.request(err, res, next);
        }
      }

      if (err) return void next(err);
      next();
    });
  };
}

function errorMiddleware(err, req, res, next) {
  if (err && err instanceof ValidationErrors)
    return void res.status(400).json(err);
  return void next(err);
}

function middleware(options) {
  return requestValidatorMiddleware(create(options.schema), options);
}

module.exports = {
  versions,
  create,
  middleware,
  errorMiddleware
};
