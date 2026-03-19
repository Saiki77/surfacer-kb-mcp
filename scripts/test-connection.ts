import { loadConfig } from "../src/config.js";
import * as s3 from "../src/aws/s3-client.js";

async function test() {
  console.log("=== Knowledge Base Connection Test ===\n");

  // Step 1: Load config
  console.log("1. Loading configuration...");
  const config = loadConfig();
  console.log(`   Bucket:  ${config.s3Bucket}`);
  console.log(`   Region:  ${config.awsRegion}`);
  console.log(`   Profile: ${config.awsProfile}`);
  console.log(`   Prefix:  ${config.s3Prefix}`);
  console.log(`   KB ID:   ${config.bedrockKbId || "(not set)"}`);
  console.log("");

  // Step 2: List documents
  console.log("2. Listing documents in S3...");
  try {
    const items = await s3.listObjects(config, "", 20);
    if (items.length === 0) {
      console.log("   Bucket is accessible but empty (just folder placeholders).");
    } else {
      for (const item of items) {
        console.log(`   - ${item.key} (${item.size} bytes)`);
      }
    }
    console.log("   ✓ S3 LIST works\n");
  } catch (err: any) {
    console.error(`   ✗ S3 LIST failed: ${err.message}\n`);
    process.exit(1);
  }

  // Step 3: Write a test document
  const testPath = "context/test-connection.md";
  const testContent = `---
title: Connection Test
author: setup-script
created: ${new Date().toISOString()}
modified: ${new Date().toISOString()}
tags: [test]
category: context
---

# Connection Test

This document was created by the test script to verify S3 connectivity.
You can safely delete it.
`;

  console.log(`3. Writing test document to '${testPath}'...`);
  try {
    await s3.putObject(config, testPath, testContent, {
      author: "setup-script",
      created: new Date().toISOString(),
      tags: "test",
      category: "context",
    });
    console.log("   ✓ S3 PUT works\n");
  } catch (err: any) {
    console.error(`   ✗ S3 PUT failed: ${err.message}\n`);
    process.exit(1);
  }

  // Step 4: Read it back
  console.log(`4. Reading back '${testPath}'...`);
  try {
    const { body, metadata } = await s3.getObject(config, testPath);
    console.log(`   Content length: ${body.length} chars`);
    console.log(`   Metadata: ${JSON.stringify(metadata)}`);
    console.log("   ✓ S3 GET works\n");
  } catch (err: any) {
    console.error(`   ✗ S3 GET failed: ${err.message}\n`);
    process.exit(1);
  }

  // Step 5: Head (check existence)
  console.log(`5. Checking document exists via HEAD...`);
  try {
    const { exists } = await s3.headObject(config, testPath);
    console.log(`   Exists: ${exists}`);
    console.log("   ✓ S3 HEAD works\n");
  } catch (err: any) {
    console.error(`   ✗ S3 HEAD failed: ${err.message}\n`);
    process.exit(1);
  }

  // Step 6: Delete test document
  console.log(`6. Deleting test document...`);
  try {
    await s3.deleteObject(config, testPath);
    const { exists } = await s3.headObject(config, testPath);
    console.log(`   Exists after delete: ${exists}`);
    console.log("   ✓ S3 DELETE works\n");
  } catch (err: any) {
    console.error(`   ✗ S3 DELETE failed: ${err.message}\n`);
    process.exit(1);
  }

  console.log("=== All tests passed! S3 connection is working. ===");
  console.log("You can now install the plugin: claude plugin add /path/to/claude_plugin");
}

test().catch((err) => {
  console.error(`\nFatal error: ${err.message}`);
  process.exit(1);
});
