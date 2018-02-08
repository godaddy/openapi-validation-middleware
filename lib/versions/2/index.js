const pathToRegExp = require('path-to-regexp');

const { ValidationError, ValidationErrors } = require('../../errors/');
const primitives = require('../../primitives/');

const collectFormats = {
  csv(value) {
    return value.split(',');
  },

  tsv(value) {
    return value.split('\t');
  },

  ssv(value) {
    return value.split(' ');
  },

  pipes(value) {
    return value.split('|');
  },

  multi(value) {
    // ie: x=1&x=2&x=3 should equal [1,2,3], but if x=1 only, then make it an array
    return Array.isArray(value) ? value : [value];
  }
};

class Validator {
  constructor(schema) {
    this.schema = schema;
    this.requestValidators = {};
  }

  getRouteValidator(path, operation, validateResponse) {
    return this._createOperationValidator(path, operation, validateResponse);
  }

  getRequestValidator(req, validateResponse) {
    const method = req.method && req.method.toLowerCase();
    const path = this._paths.find(p => p.regex.test(req.path) && p.methods.includes(method));

    if (!path)
      return;

    const operationId = path.operations[method].operationId || (method + path.path);

    if (this.requestValidators[operationId])
      return this.requestValidators[operationId];

    this.requestValidators[operationId] = this._createOperationValidator(path.path, path.operations[method], validateResponse);
    return this.requestValidators[operationId];
  }

  // protected
  get _paths() {
    if (!this.__paths)
      this.__paths = Object.keys(this.schema.paths).map(path => ({
        path,
        methods: Object.keys(this.schema.paths[path]),
        regex: pathToRegExp(path.replace(/\{/g, ':').replace(/\}/g, '')),
        operations: this.schema.paths[path]
      }));
    return this.__paths;
  }

  _wrapResponse(res, operation, validate) {
    const { json, end, status } = res;
    const set = res.set, headers = {};
    let data, code;
    res.set = (name, value) => {
      if (typeof name === 'object') {
        Object.keys(name).forEach(field => res.set(field, name[field]));
        return res;
      }
      headers[name] = value;
      return res;
    };
    res.status = c => { code = c; return res; };
    res.json = d => { data = d; res.end(); };
    res.end = (body, encoding) => {
      const errors = this._validateResponseOperation(operation, { code, data, headers });
      res.status = status;
      res.json = json;
      res.end = end;
      res.set = set;
      const error = errors && errors.length && new ValidationErrors(errors);
      const options = { code, data, headers, body, encoding, operation };
      if (typeof validate !== 'function' || !validate(error, res, options)) {
        res.set(headers);
        if (error) return res.status(500).json(error);
        if (code) res.status(code);
        if (data) return res.json(data);
        res.end(body, encoding);
      }
    };
  }

  _createOperationValidator(path, operation, responseCallback) {
    return (req, res, next) => {
      if (operation['x-no-validation']) return void next();
      if (responseCallback && !operation['x-no-response-validation'])
        this._wrapResponse(res, operation, responseCallback);

      if (operation['x-no-request-validation']) return void next();

      const errors = this._validateRequestOperation(operation, req);

      if (errors.length) return void next(new ValidationErrors(req, path, operation, errors));

      next();
    };
  }

  _validateResponseOperation(operation, { code, data, headers }, errors = []) {
    let response = operation.responses && (operation.responses[code] || operation.responses.default);
    if (!response) return;
    if (response.$ref) response = this._resolveRef(response.$ref);
    if (response.headers)
      Object.keys(response.headers).forEach(header => {
        this._validateDataType(headers[header], response.headers[header], errors);
      });

    if (response.schema)
      this._validateSchema(data, response.schema, errors);

    return errors;
  }

  _validateRequestOperation(operation, req, errors = []) {
    const { deprecated, schemes, consumes, operationId, parameters = [] } = operation;
    const contentType = req.headers['content-type'] && req.headers['content-type'].toLowerCase();

    if (deprecated) errors.push(new ValidationError('DEPRECATED', { name: operationId || req.route.path }));

    if (schemes && !schemes.includes(req.protocol))
      errors.push(new ValidationError('SCHEME_NOT_SUPPORTED', req));

    if (contentType && consumes && !consumes.some(c => contentType.includes(c)))
      errors.push(new ValidationError('CONTENT_TYPE_NOT_SUPPORTED', Object.assign({ contentType }, operation)));

    if (contentType && !consumes && this.schema.consumes && !this.schema.consumes.some(c => contentType.includes(c)))
      errors.push(new ValidationError('CONTENT_TYPE_NOT_SUPPORTED', Object.assign({ contentType }, operation)));

    parameters.forEach(parameter => {
      if (!parameter['x-no-validation'])
        this._validateParameter(parameter, req, errors);
    });

    return errors;
  }

  _resolveRef(path, errors) {
    let ref;

    if (path.startsWith('#/')) {
      const [, field, name] = path.split('/');
      ref = this.schema[field][name] && Object.assign({ name }, this.schema[field][name]);
    }

    if (!ref) {
      errors.push(new ValidationError('BAD_REFERENCE', path));
    }

    return ref;
  }

  _validateParameter(parameter = {}, req, errors = []) {
    if (parameter.$ref) parameter = this._resolveRef(parameter.$ref, errors);
    if (!parameter) return;

    const { name, required, allowEmptyValue } = parameter;
    let conversion;

    switch (parameter.in) {
    case 'path':
      // path parameters are always required
      if (!req.params[name])
        return errors.push(new ValidationError('REQUIRED_PARAMETER', name));

      conversion = this._validateParameterType(req.params[name], parameter, errors);

      if (parameter['x-coerce'])
        req.params[name] = conversion;

      break;
    case 'query':
      if (required && !req.query.hasOwnProperty(name))
        return errors.push(new ValidationError('REQUIRED_PARAMETER', name));

      if (!req.query.hasOwnProperty(name))
        break;

      if (!req.query[name] && !allowEmptyValue)
        return errors.push(new ValidationError('MISSING_VALUE', name));

      conversion = this._validateParameterType(req.query[name], parameter, errors);

      if (parameter['x-coerce'])
        req.query[name] = conversion;

      break;
    case 'header':
      if (required && !req.headers.hasOwnProperty(name.toLowerCase()))
        return errors.push(new ValidationError('REQUIRED_PARAMETER', name));

      conversion = this._validateParameterType(req.headers[name.toLowerCase()], parameter, errors);

      if (parameter['x-coerce'])
        req.headers[name.toLowerCase()] = conversion;

      break;
    case 'formData':
      // TODO: create form handling
      break;
    case 'body':
      if (!req.body)
        return errors.push(new ValidationError('MISSING_BODY', req));

      this._validateSchema(req.body, parameter.schema, errors);
      break;
    default:
      errors.push(new ValidationError('PARAMETER_UNKNOWN', req));
      break;
    }
  }

  _validateParameterType(value, parameter, errors) {
    if (parameter.schema) return this._validateSchema(value, parameter.schema, errors);
    return this._validateDataType(value, parameter, errors);
  }

  _validateSchema(value, schema = {}, errors = []) {
    if (schema.$ref) schema = this._resolveRef(schema.$ref, errors);
    if (!schema) {
      errors.push(new ValidationError('UNSPECIFIED_SCHEMA'));
      return;
    }

    if (schema['x-no-validation']) return;

    if (schema.type === 'array') return this._validateArray(value, schema, errors);
    if (primitives[schema.type]) return this._validateDataType(value, schema, errors);

    if (typeof value !== 'object' || value === null) {
      errors.push(new ValidationError('UNDEFINED_VALUE', schema));
      return;
    }

    if (schema.properties)
      Object.keys(schema.properties).forEach(name => {
        if (!value.hasOwnProperty(name) && (!schema.required || !schema.required.includes(name))) return;
        const prop = Object.assign({ name: `${schema.name}.${name}` }, schema.properties[name]);
        const conversion = this._validateSchema(value[name], prop, errors);
        if (prop && prop['x-coerce'])
          value[name] = conversion;
      });

    if (schema.additionalProperties)
      Object.keys(value).filter(k => !schema.properties || !schema.properties.hasOwnProperty(k)).forEach(name => {
        const prop = Object.assign({ name: `${schema.name}.${name}` }, schema.additionalProperties);
        this._validateSchema(value[name], prop, errors);
      });
  }

  _validateDataType(value, options = {}, errors = []) {
    if (options.$ref) options = this._resolveRef(options.$ref, errors);

    if (!options) {
      errors.push(new ValidationError('UNSPECIFIED_DATA_TYPE'));
      return value;
    }

    if (options.type === 'array')
      return this._validateArray(value, options, errors);

    if (!primitives[options.type]) {
      errors.push(new ValidationError('UNKNOWN_TYPE', options));
      return value;
    }

    return primitives[options.type](value, options, errors);
  }

  _validateArray(value, options, errors) {
    const { name, maxItems, minItems, uniqueItems, collectionFormat = 'csv', items } = options;

    if (!Array.isArray(value) && typeof value === 'string') {
      if (!collectFormats[collectionFormat]) {
        errors.push(new ValidationError('UNKNOWN_COLLECTION_FORMAT', options));
        return value;
      }

      value = collectFormats[collectionFormat](value);
    }

    if (!value) {
      errors.push(new ValidationError('EXPECT_ARRAY', { name, value }));
      return value;
    }

    if (maxItems && value.length > maxItems)
      errors.push(new ValidationError('MAXIMUM_ITEMS', options, value));

    if (minItems && value.length < minItems)
      errors.push(new ValidationError('MINIMUM_ITEMS', options, value));

    if (uniqueItems && containsDuplicates(value))
      errors.push(new ValidationError('UNIQUE_ITEMS', options, value));

    if (items)
      value.forEach((v, i) => this._validateSchema(v, Object.assign({ name: `${name}[${i}]` }, items), errors));

    return value;
  }
}

function containsDuplicates(array) {
  if (!array.length) return false;
  const clone = array.slice();
  let duplicates = false;
  let base = clone.shift();
  while (!duplicates && clone.length) {
    duplicates = isIdentical(base, clone[0]);
    base = clone.shift();
  }
  return duplicates;
}

function isIdentical(a, b) {
  if (typeof a !== typeof b) return false;
  switch (Object.prototype.toString.call(a)) {
  case '[object Array]':
    return a.every((v, i) => isIdentical(v, b[i]));
  case '[object Object]':
    return Object.keys(a).every(k => isIdentical(a[k], b[k]));
  default:
    return a === b;
  }
}

module.exports = Validator;
