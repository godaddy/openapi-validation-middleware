module.exports = require('godaddy-test-tools')(require('gulp'), {
  lint: {
    files: [
      'package.json',
      'index.js',
      'gulpfile.js',
      'lib/**/*.js',
      'test/**/*.js',
      'lib/**/*.json',
      'test/**/*.json'
    ],
    eslint: {
      fix: true
    }
  }
});
