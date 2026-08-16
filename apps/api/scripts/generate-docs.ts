/**
 * Generates apps/api/openapi.json and apps/api/postman/pocketly-api.postman_collection.json
 * from the live Nest app. Boots against an in-memory MongoDB so it needs no
 * external services. Run with `pnpm --filter api docs:generate`.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Test } from '@nestjs/testing';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const convert = require('openapi-to-postmanv2').convert;
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AppModule } from '../src/app.module';
import { buildOpenApiDocument } from '../src/swagger';

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();

  const document = buildOpenApiDocument(app);

  const rootDir = join(__dirname, '..');
  writeFileSync(
    join(rootDir, 'openapi.json'),
    JSON.stringify(document, null, 2),
  );

  const postmanDir = join(rootDir, 'postman');
  mkdirSync(postmanDir, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    convert(
      { type: 'json', data: document },
      { folderStrategy: 'Tags' },
      (
        err: Error | null,
        result: {
          result: boolean;
          reason?: string;
          output: { data: unknown }[];
        },
      ) => {
        if (err) return reject(err);
        if (!result.result)
          return reject(
            new Error(result.reason ?? 'Postman conversion failed'),
          );
        writeFileSync(
          join(postmanDir, 'pocketly-api.postman_collection.json'),
          JSON.stringify(result.output[0].data, null, 2),
        );
        resolve();
      },
    );
  });

  await app.close();
  await mongod.stop();

  console.log(
    'Wrote openapi.json and postman/pocketly-api.postman_collection.json',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
