import glob from "glob";
import path from "path";
import fs from "fs";

const name = process.argv.slice(-1)[0];

fs.mkdirSync(path.resolve(process.cwd(), "packages", name));

for (const file of [
  ...glob.sync("packages/new/*", { ignore: ["packages/*/node_modules"] }),
  ...glob.sync("packages/new/.*", { ignore: ["packages/*/node_modules"] })
]) {
  const rel = path.relative("packages/new", file);
  const target = path.resolve("packages", name, rel);
  console.log("cp", file, target);
  fs.writeFileSync(
    path.resolve(process.cwd(), target),
    fs
      .readFileSync(path.resolve(process.cwd(), file), { encoding: "utf-8" })
      .replace(/packagename/g, name),
    {
      encoding: "utf-8"
    }
  );
}
