class ValidationErrors extends Error {
  constructor(request, path, operation, errors) {
    super();
    this.path = path;
    this.request = request;
    this.operation = operation;
    this.errors = errors;
  }

  get message() {
    return this.toString();
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  toJSON() {
    return {
      operationId: this.operation.operationId,
      url: this.request.originalUrl,
      path: this.path,
      errors: this.errors.map(e => ({
        code: e.code,
        message: e.message
      }))
    };
  }
}

class ValidationError extends Error {
  constructor(code, info, value) {
    super();
    this.name = this.code = code;
    const func = ValidationError.CODES[code];
    this.message = func ? func(info || {}) : `Unknown error code: "${code}"`;
    this.info = info;
    this.value = value;
  }
}

ValidationError.CODES = {
  DEPRECATED: info => `The operation "${info.name}" is deprecated`,
  SCHEME_NOT_SUPPORTED: info => `The scheme "${info.protocol}" is not supported by this operation`,
  CONTENT_TYPE_NOT_SUPPORTED: info =>
    `The Content-Type "${info.contentType}" is not supported by this operation ${info.operationId}`,
  BAD_REFERENCE: info => `Unable to resolve the ReferenceObject "${info}"`,
  REQUIRED_PARAMETER: info => `Missing required parameter: "${info}"`,
  MISSING_BODY: req => `Missing body for "${req.route && req.route.path}" "${req.originalUrl}"`,
  PARAMETER_UNKNOWN: parameter => `Unknown location of parameter "${parameter.name}" in "${parameter.in}"`,
  UNSPECIFIED_SCHEMA: () => 'Unspecified schema',
  UNSPECIFIED_DATA_TYPE: () => 'Unspecified data type options',
  UNKNOWN_TYPE: info => `Unknown type: "${info.type}" in "${info.name}"`,
  UNIQUE_ITEMS: info => `All of the items in "${info.name}" should be unique`,
  MINIMUM_ITEMS: info => `The value in "${info.name}" must contain no less than "${info.minItems}"`,
  MAXIMUM_ITEMS: info => `The value in "${info.name}" must contain no more than "${info.maxItems}"`,
  MISSING_ITEMS_SPEC: info => `"items" must be defined for an array "${info.name}"`,
  UNKNOWN_COLLECTION_FORMAT: info => `Unknown collection format: "${info.collectionFormat}" for "${info.name}"`,
  NO_PATH_OPERATION: req => `There is no operation schema for "${req.method}" "${req.route && req.route.path}"`,
  NOT_STRING: info => `The value in "${info.name}" must be a string`,
  MINLENGTH: info => `The value in "${info.name}" must be at least "${info.minLength}" characters long`,
  MAXLENGTH: info => `The value in "${info.name}" must be less than "${info.maxLength}" characters long`,
  PATTERN: info => `"${info.name}" does not match the pattern "${info.pattern}"`,
  ENUM: info => `The value in "${info.name}" must be one of the following: "${info.enum && info.enum.join(', ')}"`,
  STRING_TOO_LONG: info => `The value in "${info.name}" is too long for string format validation. (${info.length})`,
  UNKNOWN_FORMAT: info => `Unknown string format "${info.format}" for "${info.name}"`,
  INVALID_FORMAT: info => `The value in "${info.name}" must be in the format "${info.format}"`,
  INVALID_BOOLEAN: info => `The value in "${info.name}" must be either true or false`,
  UNDEFINED_VALUE: info => `Undefined value for "${info.name}" "${info.type}"`,
  EXPECT_ARRAY: info => `The value in "${info.name}" must be an array`,
  EXPECT_NUMBER: info => `The value in "${info.name}" must be a number`,
  MAXIMUM_STRING_NUMBER: ({ name, value = '' }) =>
    `The value in "${name}" exceeds the maximum string length for number validation (255) "${value.length}"`,
  EXPECT_FLOAT: info => `The value in "${info.name}" must be an float|double`,
  BELOW_EXCLUSIVE_MINIMUM: info => `The value in "${info.name}" must be greater than "${info.minimum}" >= "${info.value}"`,
  BELOW_MINIMUM: info => `The value in "${info.name}" must be greater than or equal to "${info.minimum}" > "${info.value}"`,
  EXCEEDS_EXCLUSIVE_MAXIMUM: info => `The value in "${info.name}" must be less than "${info.maximum}" <= ${info.value}`,
  EXCEEDS_MAXIMUM: info => `The value in "${info.name}" must be less than or equal to "${info.maximum}" < ${info.value}`,
  NOT_MULTIPLE: info =>
    `The value in "${info.name}" must be a multiple of "${info.multipleOf}". ${info.value} % ${info.multipleOf} == ${info.value % info.multipleOf}`,
  EXPECT_INTEGER: info => `The value in "${info.name}" must be an integer, "${typeof info.value}" given`
};

module.exports = { ValidationErrors, ValidationError };
