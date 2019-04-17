import glob from "glob";
import path from "path";
import fs from "fs";

for (const index of glob.sync("packages/**/index.ts", {
  ignore: "node_modules"
})) {
  const files = glob
    .sync("*.ts", { cwd: path.dirname(index) })
    .map(file => path.join(path.dirname(file), path.basename(file, ".ts")))
    .concat(
      glob.sync("*/", { cwd: path.dirname(index) }).map(l => l.slice(0, -1))
    )
    .filter(
      (f: string) =>
        !f.startsWith("index") &&
        !f.includes("node_modules") &&
        !f.includes(".spec") &&
        !f.includes(".d")
    );

  fs.writeFileSync(
    path.resolve(__dirname, index),
    files.map((e: string) => `export * from './${e}'`).join("\r\n")
  );
}
