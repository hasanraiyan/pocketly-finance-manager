import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AppModule } from './app.module';
import { buildOpenApiDocument } from './swagger';

describe('OpenAPI document generation', () => {
  let mongod: MongoMemoryServer;
  let app: INestApplication;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('generates a document covering every core finance route, driven by the Zod DTOs', () => {
    const document = buildOpenApiDocument(app);

    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining([
        '/accounts',
        '/accounts/{id}',
        '/categories',
        '/categories/{id}',
        '/transactions',
        '/transactions/{id}',
        '/budgets',
        '/budgets/{id}',
        '/analysis',
        '/analysis/cash-flow',
      ]),
    );

    // A Zod-DTO-backed body (CreateAccountDto) must produce a real, non-empty schema
    // (resolving through the $ref into components.schemas, as nestjs/swagger emits it).
    const requestBody = document.paths['/accounts'].post?.requestBody as
      | {
          content?: Record<
            string,
            { schema?: { $ref?: string; properties?: Record<string, unknown> } }
          >;
        }
      | undefined;
    const bodySchema = requestBody?.content?.['application/json']?.schema;
    expect(bodySchema).toBeDefined();

    const resolvedSchema = bodySchema?.$ref
      ? document.components?.schemas?.[
          bodySchema.$ref.replace('#/components/schemas/', '')
        ]
      : bodySchema;
    expect(
      Object.keys(
        (resolvedSchema as { properties?: Record<string, unknown> })
          ?.properties ?? {},
      ),
    ).toEqual(expect.arrayContaining(['name', 'type']));
  });
});
