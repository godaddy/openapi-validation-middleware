const axios = require('axios');
const express = require('express');
const assume = require('assume');
const bodyParser = require('body-parser');
const { stub } = require('sinon');

const schema = require('../fixtures/swagger.json');
const pet = require('../fixtures/pet.json');
const order = require('../fixtures/order.json');

const { middleware, errorMiddleware } = require('../../');

assume.use(require('assume-sinon'));

describe('Validates requests', () => {
  let app, options, response, server, request;

  before(done => {
    request = axios.create({
      baseURL: 'http://localhost:8194',
      json: true
    });
    response = stub();
    options = {
      schema,
      response
    };
    app = express();
    app.use(bodyParser.json());
    app.use(middleware(options));
    app.use(handler);
    app.use(errorMiddleware);
    server = app.listen(8194, done);
  });

  it('validates the input successfully', () => {
    return request.post('/pet', pet)
      .then(r => {
        assume(r.status).equals(200);
        assume(r.data.body).eqls(pet);
      });
  });

  it('returns an error when there are inproper input', () => {
    const invalidPet = JSON.parse(JSON.stringify(pet));
    invalidPet.status = 'xxx';
    return request.post('/pet', invalidPet)
      .then(r => assume(r.status).equals(400), r => {
        assume(r.response).exists();
        assume(r.response.status).equals(400);
        assume(r.response.data).eqls({
          operationId: 'addPet',
          path: '/pet',
          url: '/pet',
          errors: [
            {
              code: 'ENUM',
              message: 'The value in "Pet.status" must be one of the following: "available, pending, sold"'
            }
          ]
        });
      });
  });

  it('does not return an error for a number that can be converted', () => {
    const invalidPet = JSON.parse(JSON.stringify(pet));
    invalidPet.category.id = '123';
    return request.post('/pet', invalidPet)
      .then(r => {
        assume(r.status).equals(200);
        assume(r.data.body).eqls(Object.assign(invalidPet, { category: { id: 123, name: 'Birds', popularity: 4 } }));
      });
  });

  it('should return an array of errors for an invalid pet', () => {
    const invalidPet = JSON.parse(JSON.stringify(pet));
    invalidPet.category.id = 1;
    invalidPet.category.name = 'yo';
    invalidPet.category.popularity = '1.5';
    invalidPet.name = 'George The King Of All Things';
    invalidPet.photoUrls.push('invalid-url');
    invalidPet.status = 'unknown';
    invalidPet.tags.push({
      id: 9876544999,
      name: 'Parrot2'
    }, {
      id: 9876544,
      name: 'Parrot2'
    });
    return request.post('/pet', invalidPet)
      .then(r => assume(r.status).equals(400), r => {
        assume(r.response).exists();
        assume(r.response.status).equals(400);
        assume(r.response.data).eqls({
          operationId: 'addPet',
          path: '/pet',
          url: '/pet',
          errors: [
            { code: 'BELOW_EXCLUSIVE_MINIMUM', message: 'The value in "Category.id" must be greater than "2" >= "1"' },
            { code: 'MINLENGTH', message: 'The value in "Category.name" must be at least "4" characters long' },
            { code: 'NOT_MULTIPLE', message: 'The value in "Category.popularity" must be a multiple of "2". 1.5 % 2 == 1.5' },
            { code: 'MAXLENGTH', message: 'The value in "Pet.name" must be less than "10" characters long' },
            { code: 'PATTERN', message: '"Pet.name" does not match the pattern "^\\w+$"' },
            { code: 'INVALID_FORMAT', message: 'The value in "Pet.photoUrls[1]" must be in the format "uri"' },
            { code: 'ENUM', message: 'The value in "Pet.status" must be one of the following: "available, pending, sold"' },
            { code: 'MAXIMUM_ITEMS', message: 'The value in "Pet.tags" must contain no more than "2"' }
          ]
        });
      });
  });

  it('should not return an array of errors', () => {
    const invalidOrder = JSON.parse(JSON.stringify(order));
    return request.post('/store/order', invalidOrder)
      .then(r => assume(r.status).equals(200));
  });

  it('should return an array of errors for an invalid order', () => {
    const invalidOrder = JSON.parse(JSON.stringify(order));
    invalidOrder.id = '12349' + Array.from({ length: 256 }, () => 'a').join('');
    invalidOrder.petId = '1235314121';
    invalidOrder.referrer = 'test-' + Array.from({ length: 256 }, () => 'a').join('');
    invalidOrder.ip = '123';
    invalidOrder.quantity = 5.4;
    return request.post('/store/order?identifier=', invalidOrder)
      .then(r => assume(r.status).equals(400), r => {
        assume(r.response).exists();
        assume(r.response.status).equals(400);
        assume(r.response.data).eqls({
          operationId: 'placeOrder',
          path: '/store/order',
          url: '/store/order?identifier=',
          errors: [
            { code: 'INVALID_FORMAT', message: 'The value in "Order.ip" must be in the format "ipv6"' },
            { code: 'INVALID_FORMAT', message: 'The value in "Order.referrer" must be in the format "hostname"' },
            { code: 'MAXIMUM_STRING_NUMBER', message: 'The value in "Order.id" exceeds the maximum string length for number validation (255) "261"' },
            { code: 'EXPECT_INTEGER', message: 'The value in "Order.quantity" must be an integer, "number" given' },
            { code: 'EXCEEDS_EXCLUSIVE_MAXIMUM', message: 'The value in "Order.quantity" must be less than "5" <= 5.4' },
            { code: 'MISSING_VALUE', message: 'The value of "identifier" is not specified' }
          ]
        });
      });
  });

  function handler(req, res) {
    res.json({
      body: req.body,
      query: req.query,
      params: req.params
    });
  }

  after(() => server && server.close());
});
