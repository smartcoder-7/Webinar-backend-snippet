import fs from 'fs';
import { createSchema } from './createSchema';
import { printSchema } from 'graphql';

// generate.ts
(async () => {
  const schema = await createSchema(null);
  const sdl = printSchema(schema);
  const filename = __dirname + '/../../dist/schema.graphql';
  console.log('Writing ', filename);
  await fs.writeFile(filename, sdl, () => {
    return;
  });
})();
