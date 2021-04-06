import { generateClient } from "./generateClient";

const fs = require('fs');

const args = process.argv.slice(2);

if (args.length < 2 || args.length > 3) {
  console.log('usage : ts-node src/index.ts path/to/crd/file.yaml path/to/generated/js/file.js [typePrefix]');
  process.exit(-1);
}
const crdFile = args[0];
const destinationFile = args[1];
const typePrefix = args[2];

fs.writeFileSync(destinationFile, generateClient(crdFile, destinationFile, typePrefix));
