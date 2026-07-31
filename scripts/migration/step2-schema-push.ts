import { execSync } from "child_process";

function run() {
  console.log("Running Step 2: Drizzle Kit Push...");
  
  try {
    execSync("npx drizzle-kit push", { stdio: "inherit" });
    console.log("✅ Schema pushed successfully.");
  } catch (err) {
    console.error("❌ Failed to push schema.");
    process.exit(1);
  }
}

run();
