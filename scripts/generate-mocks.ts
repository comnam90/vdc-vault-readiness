import { HealthcheckMockBuilder } from "../src/lib/mocks/generator";
import * as fs from "fs";
import * as path from "path";

const MOCK_DIR = path.join(process.cwd(), "mocks");

if (!fs.existsSync(MOCK_DIR)) {
  fs.mkdirSync(MOCK_DIR);
}

const scenarios = {
  "perfect-v12.json": HealthcheckMockBuilder.createPassingV12(),
  "legacy-v11.json": HealthcheckMockBuilder.createLegacyV11(),
  "blocker-aws.json": HealthcheckMockBuilder.createBlockingAWS(),
  "warning-unencrypted.json": HealthcheckMockBuilder.createWarningUnencrypted(),
  "community-edition.json": HealthcheckMockBuilder.createCommunityEdition(),
  "low-retention.json": HealthcheckMockBuilder.createLowRetention(),
  "advanced-cloud.json": HealthcheckMockBuilder.createAdvancedCloud(),
};

console.log("Generating synthetic healthcheck files...");

Object.entries(scenarios).forEach(([filename, data]) => {
  const filePath = path.join(MOCK_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`  - ${filename}`);
});

console.log("\nDone! Files are available in the /mocks directory.");
