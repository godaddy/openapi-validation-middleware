const assume = require('assume');

const { ValidationError, ValidationErrors } = require('../../../../lib/errors/');

describe('errors', () => {
  describe('ValidationErrors', () => {
    it('returns an object with an array of errors', () => {
      const error = new ValidationErrors({}, '/specail/{path}', { operationId: 'test' }, []);
      assume(error.message).eqls('{"operationId":"test","path":"/specail/{path}","errors":[]}');
    });
  });

  describe('ValidationError', () => {
    it('produces an unknown error for unknown codes', () => {
      assume(new ValidationError('GORDO', {}).message).eqls('Unknown error code: "GORDO"');
    });
  });

  describe('CODES', () => {
    it('should produces validation error messages', () => {
      const messages = Object.keys(ValidationError.CODES).map(code => {
        return ValidationError.CODES[code]({});
      });

      assume(messages).eqls([
        'Unable to resolve the ReferenceObject "[object Object]"',
        'The value in "undefined" must be greater than "undefined" >= "undefined"',
        'The value in "undefined" must be greater than or equal to "undefined" > "undefined"',
        'The Content-Type "undefined" is not supported by this operation undefined',
        'The operation "undefined" is deprecated',
        'The value in "undefined" must be one of the following: "undefined"',
        'The value in "undefined" must be less than "undefined" <= undefined',
        'The value in "undefined" must be less than or equal to "undefined" < undefined',
        'The value in "undefined" must be an array',
        'The value in "undefined" must be an float|double',
        'The value in "undefined" must be an integer, "undefined" given',
        'The value in "undefined" must be a number',
        'The value in "undefined" must be either true or false',
        'The value in "undefined" must be in the format "undefined"',
        'The value in "undefined" must contain no more than "undefined"',
        'The value in "undefined" exceeds the maximum string length for number validation (255) "0"',
        'The value in "undefined" must be less than "undefined" characters long',
        'The value in "undefined" must contain no less than "undefined"',
        'The value in "undefined" must be at least "undefined" characters long',
        'Missing body for "undefined" "undefined"',
        '"items" must be defined for an array "undefined"',
        'The value of "[object Object]" is not specified',
        'The value in "undefined" must be a multiple of "undefined". undefined % undefined == NaN',
        'The value in "undefined" must be a string',
        'There is no operation schema for "undefined" "undefined"',
        'Unknown location of parameter "undefined" in "undefined"',
        '"undefined" does not match the pattern "undefined"',
        'Missing required parameter: "[object Object]"',
        'The scheme "undefined" is not supported by this operation',
        'The value in "undefined" is too long for string format validation. (undefined)',
        'Undefined value for "undefined" "undefined"',
        'All of the items in "undefined" should be unique',
        'Unknown collection format: "undefined" for "undefined"',
        'Unknown string format "undefined" for "undefined"',
        'Unknown type: "undefined" in "undefined"',
        'Unspecified data type options',
        'Unspecified schema'
      ]);
    });
  });
});
