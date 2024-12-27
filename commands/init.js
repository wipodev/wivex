import fs from "fs";
import path from "path";
import { copy } from "./utils.js";

const packageJsonPath = path.resolve(process.cwd(), "package.json");

export function init(options) {
  console.log("Initializing the project...");
  const root = options.root || ".";

  try {
    copy("node_modules/wivex/template", root);
    console.log("Template copied successfully.");

    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      pkg.scripts = pkg.scripts || {};
      pkg.scripts = {
        ...pkg.scripts,
        dev: pkg.scripts.dev || `wivex dev ${options.root ? `-r ${options.root}` : ""}`,
        build: pkg.scripts.build || `wivex build ${options.root ? `-r ${options.root}` : ""}`,
        preview: pkg.scripts.preview || `wivex preview ${options.root ? `-r ${options.root}` : ""}`,
        deploy: pkg.scripts.deploy || `wivex deploy ${options.root ? `-r ${options.root}` : ""}`,
      };
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2), "utf8");
      console.log("package.json updated with new scripts.");
    } else {
      console.error("Error: package.json not found.");
    }
  } catch (err) {
    console.error("Error initializing the project:", err);
  }
}
