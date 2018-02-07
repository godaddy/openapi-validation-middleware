const Net = require('net');
const isemail = require('isemail');
const isuri = require('isuri');
// const base64Regex = require('base64-regex')({ exact: true });

const { ValidationError } = require('../errors/');

const isoDate = /^(?:[-+]\d{2})?(?:\d{4}(?!\d{2}\b))(?:(-?)(?:(?:0[1-9]|1[0-2])(?:\1(?:[12]\d|0[1-9]|3[01]))?|W(?:[0-4]\d|5[0-2])(?:-?[1-7])?|(?:00[1-9]|0[1-9]\d|[12]\d{2}|3(?:[0-5]\d|6[1-6])))(?![T]$|[T][\d]+Z$)(?:[T\s](?:(?:(?:[01]\d|2[0-3])(?:(:?)[0-5]\d)?|24:?00)(?:[.,]\d+(?!:))?)(?:\2[0-5]\d(?:[.,]\d+)?)?(?:[Z]|(?:[+-])(?:[01]\d|2[0-3])(?::?[0-5]\d)?)?)?)?$/;
const isHostname = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/;
const stringFormats = {
  // TODO find a way to validate long strings of binary and byte data
  byte() {
    return true;
  },

  binary() {
    return true;
  },

  date(value) {
    return isoDate.test(value);
  },

  dateTime(value) {
    return stringFormats.date(value);
  },

  password() {
    return true;
  },

  'date-time': function (value) {
    return stringFormats.dateTime(value);
  },

  email(value, options) {
    return isemail.validate(value, options['x-isemail'] || {});
  },

  hostname(value) {
    return value.length < 256 && (isHostname.test(value) || Net.isIPv6(value));
  },

  ipv4(value) {
    return value.length < 256 && Net.isIPv4(value);
  },

  ipv6(value) {
    return value.length < 256 && Net.isIPv6(value);
  },

  uri(value) {
    return value.length < 256 && isuri.isValid(value);
  }
};

function string(value, options, errors) {
  const { name, format, pattern, minLength, maxLength } = options;

  if (!value && options.default && !options.required) value = options.default + '';

  if (typeof value !== 'string') {
    errors.push(new ValidationError('NOT_STRING', options, value));
    return value;
  }

  if (value.length < minLength)
    errors.push(new ValidationError('MINLENGTH', options, value));

  if (value.length > maxLength)
    errors.push(new ValidationError('MAXLENGTH', options, value));

  if (pattern)
    if (!RegExp(pattern).test(value))
      errors.push(new ValidationError('PATTERN', options, value));

  if (format) checkFormat(name, value, format, errors);

  if (options.enum && !options.enum.includes(value))
    errors.push(new ValidationError('ENUM', options, value));

  return value;
}

function checkFormat(name, value, format, errors) {
  if (value.length > 255) {
    errors.push(new ValidationError('STRING_TOO_LONG', { name, length: value.length }, value));
    return value;
  }
  if (!stringFormats[format]) {
    errors.push(new ValidationError('UNKNOWN_FORMAT', { name, format }, value));
    return value;
  }
  if (!stringFormats[format](value)) {
    errors.push(new ValidationError('INVALID_FORMAT', { name, format }, value));
  }
}

function boolean(value, options, errors) {
  if (typeof value === 'string' && options['x-coerce']) {
    if (value !== 'true' && value !== 'false')
      errors.push(new ValidationError('INVALID_BOOLEAN', options, value));
    return value === 'true';
  }
  if (typeof value !== 'boolean')
    errors.push(new ValidationError('INVALID_BOOLEAN', options, value));
  return value;
}

function number(value, options, errors) {
  const { name, minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf } = options;

  if (typeof value === 'string') {
    if (!options['x-coerce']) {
      errors.push(new ValidationError('EXPECT_NUMBER', { name, value }));
      return value;
    }

    if (value.length > 255) {
      errors.push(new ValidationError('MAXIMUM_STRING_NUMBER', { name, value }));
      return value;
    }

    if (!/(\+|-)?\d+(\.|,)?\d*/g.test(value))
      errors.push(new ValidationError('EXPECT_FLOAT', { name, value }));

    value = parseFloat(value);
  }

  if (isNaN(value)) {
    errors.push(new ValidationError('EXPECT_NUMBER', { name, value }));
    return value;
  }

  if (minimum) {
    if (exclusiveMinimum && value <= minimum)
      errors.push(new ValidationError('BELOW_EXCLUSIVE_MINIMUM', { name, value, minimum }));
    if (!exclusiveMinimum && value < minimum)
      errors.push(new ValidationError('BELOW_MINIMUM', { name, value, minimum }));
  }

  if (maximum) {
    if (exclusiveMaximum && value >= maximum)
      errors.push(new ValidationError('EXCEEDS_EXCLUSIVE_MAXIMUM', { name, value, maximum }));
    if (!exclusiveMaximum && value > maximum)
      errors.push(new ValidationError('EXCEEDS_MAXIMUM', { name, value, maximum }));
  }

  if (multipleOf && (value % multipleOf) !== 0)
    errors.push(new ValidationError('NOT_MULTIPLE', { name, value, multipleOf }));

  return value;
}

function integer(value, options, errors) {
  const { name, format } = options;

  if (typeof value === 'string') {
    if (value.length > 255) {
      errors.push(new ValidationError('MAXIMUM_STRING_NUMBER', { name, value }));
      return value;
    }

    if (!/(\+|-)?\d+/g.test(value))
      errors.push(new ValidationError('EXPECT_INTEGER', { name, value }));

    if (options['x-coerce'] === false) {
      errors.push(new ValidationError('EXPECT_INTEGER', { name, value }));
      return value;
    }

    value = parseInt(value, 10);
  }

  if (isNaN(value)) {
    errors.push(new ValidationError('EXPECT_INTEGER', { name, value }));
    return value;
  }

  if (!Number.isSafeInteger(value) && format !== 'int64')
    errors.push(new ValidationError('EXPECT_INTEGER', { name, value }));

  number(value, options, errors);

  return value;
}

const validators = { string, number, integer, boolean };

module.exports = validators;
