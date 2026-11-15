import { MOCK_SCENARIOS } from "../src/lib/mocks/generator";
import * as fs from "fs";
import * as path from "path";

const MOCK_DIR = path.join(process.cwd(), "mocks");

if (!fs.existsSync(MOCK_DIR)) {
  fs.mkdirSync(MOCK_DIR);
}

console.log("Generating synthetic healthcheck files...");

Object.entries(MOCK_SCENARIOS).forEach(([name, create]) => {
  const filename = `${name}.json`;
  fs.writeFileSync(
    path.join(MOCK_DIR, filename),
    JSON.stringify(create(), null, 2),
  );
  console.log(`  - ${filename}`);
});

console.log("\nDone! Files are available in the /mocks directory.");
