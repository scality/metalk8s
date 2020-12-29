import { generateClient } from "./generateCLient";

const fs = require('fs');

const args = process.argv.slice(2);

if (args.length !== 2) {
  console.log('usage : ts-node src/index.ts path/to/crd/file.yaml path/to/generated/js/file.js');
  process.exit(-1);
}
const crdFile = args[0];
const destinationFile = args[1];

fs.writeFileSync(destinationFile, generateClient(crdFile, destinationFile));