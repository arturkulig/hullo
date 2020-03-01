import glob from "glob";
import path from "path";
import fs from "fs";

const tss = glob
  .sync("packages/**/*.ts", { ignore: ["packages/*/node_modules"] })
  .map(f => path.join(path.dirname(f), path.basename(f, ".ts")))
  .filter(f => !f.includes("node_modules"));

const jss = glob
  .sync("packages/**/*.js", { ignore: ["packages/*/node_modules"] })
  .map(f => path.join(path.dirname(f), path.basename(f, ".js")))
  .filter(f => !f.includes("node_modules"));

const dts = glob
  .sync("packages/**/*.d.ts", { ignore: ["packages/*/node_modules"] })
  .map(f => path.join(path.dirname(f), path.basename(f, ".d.ts")))
  .filter(f => !f.includes("node_modules"));

process.stdout.write("\nRemoving JS files");
jss
  .filter(file => tss.indexOf(file) >= 0)
  .map(l => `${l}.js`)
  .forEach(file => {
    process.stdout.write(".");
    // console.log("removing", path.resolve(__dirname, file));
    fs.unlinkSync(path.resolve(__dirname, file));
  });

process.stdout.write("\nRemoving .d.ts files");
dts
  .filter(file => tss.indexOf(file) >= 0)
  .map(l => `${l}.d.ts`)
  .forEach(file => {
    process.stdout.write(".");
    // console.log("removing", path.resolve(__dirname, file));
    fs.unlinkSync(path.resolve(__dirname, file));
  });
process.stdout.write("\n");
