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
  BAD_REFERENCE: info => `Unable to resolve the ReferenceObject "${info}"`,
  BELOW_EXCLUSIVE_MINIMUM: info => `The value in "${info.name}" must be greater than "${info.minimum}" >= "${info.value}"`,
  BELOW_MINIMUM: info => `The value in "${info.name}" must be greater than or equal to "${info.minimum}" > "${info.value}"`,
  CONTENT_TYPE_NOT_SUPPORTED: info =>
    `The Content-Type "${info.contentType}" is not supported by this operation ${info.operationId}`,
  DEPRECATED: info => `The operation "${info.name}" is deprecated`,
  ENUM: info => `The value in "${info.name}" must be one of the following: "${info.enum && info.enum.join(', ')}"`,
  EXCEEDS_EXCLUSIVE_MAXIMUM: info => `The value in "${info.name}" must be less than "${info.maximum}" <= ${info.value}`,
  EXCEEDS_MAXIMUM: info => `The value in "${info.name}" must be less than or equal to "${info.maximum}" < ${info.value}`,
  EXPECT_ARRAY: info => `The value in "${info.name}" must be an array`,
  EXPECT_FLOAT: info => `The value in "${info.name}" must be an float|double`,
  EXPECT_INTEGER: info => `The value in "${info.name}" must be an integer, "${typeof info.value}" given`,
  EXPECT_NUMBER: info => `The value in "${info.name}" must be a number`,
  INVALID_BOOLEAN: info => `The value in "${info.name}" must be either true or false`,
  INVALID_FORMAT: info => `The value in "${info.name}" must be in the format "${info.format}"`,
  MAXIMUM_ITEMS: info => `The value in "${info.name}" must contain no more than "${info.maxItems}"`,
  MAXIMUM_STRING_NUMBER: ({ name, value = '' }) =>
    `The value in "${name}" exceeds the maximum string length for number validation (255) "${value.length}"`,
  MAXLENGTH: info => `The value in "${info.name}" must be less than "${info.maxLength}" characters long`,
  MINIMUM_ITEMS: info => `The value in "${info.name}" must contain no less than "${info.minItems}"`,
  MINLENGTH: info => `The value in "${info.name}" must be at least "${info.minLength}" characters long`,
  MISSING_BODY: req => `Missing body for "${req.route && req.route.path}" "${req.originalUrl}"`,
  MISSING_ITEMS_SPEC: info => `"items" must be defined for an array "${info.name}"`,
  MISSING_VALUE: info => `The value of "${info}" is not specified`,
  NOT_MULTIPLE: info =>
    `The value in "${info.name}" must be a multiple of "${info.multipleOf}". ` +
    `${info.value} % ${info.multipleOf} == ${info.value % info.multipleOf}`,
  NOT_STRING: info => `The value in "${info.name}" must be a string`,
  NO_PATH_OPERATION: req => `There is no operation schema for "${req.method}" "${req.route && req.route.path}"`,
  PARAMETER_UNKNOWN: parameter => `Unknown location of parameter "${parameter.name}" in "${parameter.in}"`,
  PATTERN: info => `"${info.name}" does not match the pattern "${info.pattern}"`,
  REQUIRED_PARAMETER: info => `Missing required parameter: "${info}"`,
  SCHEME_NOT_SUPPORTED: info => `The scheme "${info.protocol}" is not supported by this operation`,
  STRING_TOO_LONG: info => `The value in "${info.name}" is too long for string format validation. (${info.length})`,
  UNDEFINED_VALUE: info => `Undefined value for "${info.name}" "${info.type}"`,
  UNIQUE_ITEMS: info => `All of the items in "${info.name}" should be unique`,
  UNKNOWN_COLLECTION_FORMAT: info => `Unknown collection format: "${info.collectionFormat}" for "${info.name}"`,
  UNKNOWN_FORMAT: info => `Unknown string format "${info.format}" for "${info.name}"`,
  UNKNOWN_TYPE: info => `Unknown type: "${info.type}" in "${info.name}"`,
  UNSPECIFIED_DATA_TYPE: () => 'Unspecified data type options',
  UNSPECIFIED_SCHEMA: () => 'Unspecified schema'
};

module.exports = { ValidationErrors, ValidationError };
