import { DocumentV3 } from '@mintlify/common';

export const emptyDoc: DocumentV3 = {
  openapi: '3.0.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
  },
  paths: {},
};

export const simpleDoc: DocumentV3 = {
  openapi: '3.0.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
  },
  paths: {
    '/users': {
      get: {
        operationId: 'getUsers',
        summary: 'Get Users',
        responses: {
          200: {
            description: 'Successful response',
          },
        },
      },
    },
  },
};

export const docWithTags: DocumentV3 = {
  openapi: '3.0.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
  },
  paths: {
    '/users': {
      get: {
        operationId: 'getUsers',
        summary: 'Get Users',
        tags: ['Users'],
        responses: {
          200: {
            description: 'Successful response',
          },
        },
      },
    },
  },
};

export const complexDoc: DocumentV3 = {
  openapi: '3.0.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
  },
  paths: {
    '/users': {
      get: {
        operationId: 'getUsers',
        summary: 'Get Users',
        tags: ['Users'],
        responses: {
          200: {
            description: 'Successful response',
          },
        },
      },
      post: {
        operationId: 'createUser',
        summary: 'Create User',
        tags: ['Users'],
        responses: {
          201: {
            description: 'User created',
          },
        },
      },
    },
    '/products': {
      get: {
        operationId: 'getProducts',
        summary: 'Get Products',
        tags: ['Products'],
        responses: {
          200: {
            description: 'Successful response',
          },
        },
      },
    },
  },
};

export const webhooksDoc: DocumentV3 = {
  openapi: '3.1.0',
  info: {
    title: 'Webhook Example',
    version: '1.0.0',
  },
  webhooks: {
    newPet: {
      description: 'A new pet has been added to the system',
      post: {
        requestBody: {
          description: 'Information about a new pet in the system',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Pet',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Return a 200 status to indicate that the data was received successfully',
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Pet: {
        required: ['id', 'name'],
        properties: {
          id: {
            type: 'integer',
            format: 'int64',
          },
          name: {
            type: 'string',
          },
          tag: {
            type: 'string',
          },
        },
      },
    },
  },
};

export const pathsAndWebhooksDoc: DocumentV3 = {
  openapi: '3.1.0',
  info: {
    title: 'OpenAPI Plant Store',
    description:
      'A sample API that uses a plant store as an example to demonstrate features in the OpenAPI specification',
    license: {
      name: 'MIT',
    },
    version: '1.0.0',
  },
  servers: [
    {
      url: 'http://sandbox.mintlify.com',
    },
  ],
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/plants': {
      get: {
        description: 'Returns all plants from the system that the user has access to',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'The maximum number of results to return',
            schema: {
              type: 'integer',
              format: 'int32',
            },
          },
        ],
        responses: {
          200: {
            description: 'Plant response',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Plant',
                  },
                },
              },
            },
          },
          400: {
            description: 'Unexpected error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
      post: {
        description: 'Creates a new plant in the store',
        requestBody: {
          description: 'Plant to add to the store',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/NewPlant',
              },
            },
          },
          required: true,
        },
        responses: {
          200: {
            description: 'plant response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Plant',
                },
              },
            },
          },
          400: {
            description: 'unexpected error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/plants/{id}': {
      delete: {
        description: 'Deletes a single plant based on the ID supplied',
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: 'ID of plant to delete',
            required: true,
            schema: {
              type: 'integer',
              format: 'int64',
            },
          },
        ],
        responses: {
          204: {
            description: 'Plant deleted',
            content: {},
          },
          400: {
            description: 'unexpected error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
  },
  webhooks: {
    newPlant: {
      post: {
        description: 'A new plant has been added to the store',
        requestBody: {
          description: 'Information about a new plant added to the store',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/NewPlant',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Return a 200 status to indicate that the data was received successfully',
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Plant: {
        required: ['name'],
        type: 'object',
        properties: {
          name: {
            description: 'The name of the plant',
            type: 'string',
          },
          tag: {
            description: 'Tag to specify the type',
            type: 'string',
          },
        },
      },
      NewPlant: {
        allOf: [
          {
            $ref: '#/components/schemas/Plant',
          },
          {
            required: ['id'],
            type: 'object',
            properties: {
              id: {
                description: 'Identification number of the plant',
                type: 'integer',
                format: 'int64',
              },
            },
          },
        ],
      },
      Error: {
        required: ['error', 'message'],
        type: 'object',
        properties: {
          error: {
            type: 'integer',
            format: 'int32',
          },
          message: {
            type: 'string',
          },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    },
  },
};

export const excludedPlantStore = {
  openapi: '3.1.0',
  info: {
    title: 'OpenAPI Plant Store',
    description:
      'A sample API that uses a plant store as an example to demonstrate features in the OpenAPI specification',
    license: {
      name: 'MIT',
    },
    version: '1.0.0',
  },
  servers: [
    {
      url: 'http://sandbox.mintlify.com',
    },
  ],
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/secretPlants': {
      get: {
        'x-excluded': true,
        description:
          'Returns all secret plants from the system that the user has access to, but you should never see this in the API reference',
        responses: {
          200: {
            description: 'Secret plant response',
          },
        },
      },
    },
    '/plants': {
      get: {
        description: 'Returns all plants from the system that the user has access to',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'The maximum number of results to return',
            schema: {
              type: 'integer',
              format: 'int32',
            },
          },
        ],
        responses: {
          200: {
            description: 'Plant response',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Plant',
                  },
                },
              },
            },
          },
          404: {
            description: 'Plant not found',
          },
          400: {
            description: 'Unexpected error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
      post: {
        description: 'Creates a new plant in the store',
        requestBody: {
          description: 'Plant to add to the store',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/NewPlant',
              },
            },
          },
          required: true,
        },
        responses: {
          200: {
            description: 'plant response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Plant',
                },
              },
            },
          },
          400: {
            description: 'unexpected error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
  },
  webhooks: {
    '/plant/secret-webhook': {
      post: {
        'x-excluded': true,
        description: 'Secret webhook for plant events',
        requestBody: {
          description: 'Plant added to the store',
          content: {
            'application/json': {
              schema: {},
            },
          },
        },
      },
    },
    '/plant/webhook': {
      post: {
        description: 'Information about a new plant added to the store',
        requestBody: {
          description: 'Plant added to the store',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/NewPlant',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Return a 200 status to indicate that the data was received successfully',
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Plant: {
        required: ['name'],
        type: 'object',
        properties: {
          name: {
            description: 'The name of the plant',
            type: 'string',
          },
          tag: {
            description: 'Tag to specify the type',
            type: 'string',
          },
        },
      },
      Error: {
        required: ['error', 'message'],
        type: 'object',
        properties: {
          error: {
            type: 'integer',
            format: 'int32',
          },
          message: {
            type: 'string',
          },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    },
  },
};

export const hiddenPlantStore = {
  openapi: '3.1.0',
  info: {
    title: 'OpenAPI Plant Store',
    description:
      'A sample API that uses a plant store as an example to demonstrate features in the OpenAPI specification',
    license: {
      name: 'MIT',
    },
    version: '1.0.0',
  },
  servers: [
    {
      url: 'http://sandbox.mintlify.com',
    },
  ],
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/secretPlants': {
      get: {
        'x-hidden': true,
        description:
          'Returns all secret plants from the system that the user has access to, but you should never see this in the API reference',
        responses: {
          200: {
            description: 'Secret plant response',
          },
        },
      },
    },
    '/plants': {
      get: {
        description: 'Returns all plants from the system that the user has access to',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'The maximum number of results to return',
            schema: {
              type: 'integer',
              format: 'int32',
            },
          },
        ],
        responses: {
          200: {
            description: 'Plant response',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Plant',
                  },
                },
              },
            },
          },
          404: {
            description: 'Plant not found',
          },
          400: {
            description: 'Unexpected error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
      post: {
        description: 'Creates a new plant in the store',
        requestBody: {
          description: 'Plant to add to the store',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/NewPlant',
              },
            },
          },
          required: true,
        },
        responses: {
          200: {
            description: 'plant response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Plant',
                },
              },
            },
          },
          400: {
            description: 'unexpected error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
  },
  webhooks: {
    '/plant/secret-webhook': {
      post: {
        'x-hidden': true,
        description: 'Secret webhook for plant events',
        requestBody: {
          description: 'Plant added to the store',
          content: {
            'application/json': {
              schema: {},
            },
          },
        },
      },
    },
    '/plant/webhook': {
      post: {
        description: 'Information about a new plant added to the store',
        requestBody: {
          description: 'Plant added to the store',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/NewPlant',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Return a 200 status to indicate that the data was received successfully',
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Plant: {
        required: ['name'],
        type: 'object',
        properties: {
          name: {
            description: 'The name of the plant',
            type: 'string',
          },
          tag: {
            description: 'Tag to specify the type',
            type: 'string',
          },
        },
      },
      Error: {
        required: ['error', 'message'],
        type: 'object',
        properties: {
          error: {
            type: 'integer',
            format: 'int32',
          },
          message: {
            type: 'string',
          },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    },
  },
};
