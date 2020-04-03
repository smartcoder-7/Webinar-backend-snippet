'use strict';

const request = require('request');

module.exports.defaultHandler = async event => {
  // define api method
  let method;
  switch (event.requestContext.routeKey) {
    case '$connect':
      method = 'PUT';
      break;
    case '$disconnect':
      method = 'DELETE';
      break;
    case '$default':
    default:
      method = 'POST';
  }

  let options = {
    method,
    url: 'http://localhost:8080/v1/chat',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      connectionId: event.requestContext.connectionId,
      post: event.body ? JSON.parse(event.body) : {},
    }),
  };

  request(options, function(error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
  });

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'Go Serverless v1.0! Your function executed successfully!',
        input: event,
      },
      null,
      2
    ),
  };
};
