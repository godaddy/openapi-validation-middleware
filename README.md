# OpenAPI Validation Middleware

Express middleware for validating Swagger and OpenAPI specifications

## `* only Swagger 2.0 is currently supported`

## Install

```
npm install --save openapi-validation-middleware
```

## API
  - `create(Object schema)` Create a `Validator` instance for a specified schema. Used internally, but available to those that desire to create their own middleware.
    - `schema` = `Object` A fully qualified and valid OpenAPI/Swagger [schema](https://github.secureserver.net/opensource/openapi-validation-middleware/blob/03dc4c88fed0ad21fa621d4fb8ae5542806c62c3/test/fixtures/swagger.json)
  - `errorMiddleware(Error err, Request req, Response res, Function next)` Drop-in middleware for handling input errors created by the validation middleware
  - `middleware(Object options)`
    - `options`
      - `schema` = A fully qualified and valid OpenAPI/Swagger [schema](https://github.secureserver.net/opensource/openapi-validation-middleware/blob/03dc4c88fed0ad21fa621d4fb8ae5542806c62c3/test/fixtures/swagger.json)
      - `response` = `ResponseCallback|Boolean` If a `ResponseCallback` is
        passed, the function is called and returns a falsey result, the
        response is handled and any errors are returned with a status of
        500. If the function returns a truthy value, the function is
        expected to have handled the response as desired and no
        further action is taken. If a truthy `Boolean` is passed, the
        response is handled as if the `ResponseCallback` returned falsey.
      - `request` = `RequestErrorHandler` Optionally overrides normal error handling


### Data types
  - `function MiddlewareFunction(Request req, Response res, Function next)`
  - `function ResponseCallback(ValidationErrors error, Response res, Object options)`
  - `function RequestErrorHandler(ValidationErrors error, Response res, Function next)`
  - `class ValidationErrors`
    - `request` = `Object` references the request passed to the
      middleware
    - `path` = `String` the original OpenAPI/Swagger path name. ex:
      `/special/{path}`
    - `operation` = `Object` the Path object from the schema
    - `errors` = `Array` containing one or more `ValidationError`
      objects

  - `class ValidationError`
    - `code`/`name` = `String` the code used to create the error message
    - `value` = `Mixed` the value that failed validation
    - `info` = `Object` data about the validation
    - `message` = `String` the message created based on the `code`, `info`,
      and `value`

  - `class Validator`
    - public `MiddlewareFunction getRequestValidator(Request req, ResponseCallback|Boolean validateResponse)`

#### Example

```js
const express = require('express');
const { middleware, errorMiddleware } = require('openapi-validation-middleware');
const options = {
  schema: require('./test/fixtures/swagger.json'),
  response(error, res, { code, data, headers, body, encoding, operation }) {
    // if you only log errors in development, instead of failing the request
    // or on a particular route
    if (process.env.NODE_ENV === 'development' || operation.path === '/special/{path}') {
      if (error) console.error(error);
      res.headers(headers).status(code).json(data);
      return true;
    }
    if (error) {
      // special error logging
      return true;
    }
  },
  request(error, res, next) {
    if (error.path === '/special/{path}') {
      // special handling
      res.sendStatus(400);
      return;
    }
    next(error);
  }
};

const app = express();
app.use(bodyParser.json());
app.use(middleware(options));
app.use(handler);
app.use(errorMiddleware);
const server = app.listen(8194);
```

## License

MIT
