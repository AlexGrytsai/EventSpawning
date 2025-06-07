const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Event Spawning API',
    version: '1.0.0',
    description: 'API documentation for Event Spawning service',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local server',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/modules/**/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec; 