import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? walk(path.join(dir, e.name))
        : e.name.endsWith(".md")
          ? [path.join(dir, e.name)]
          : [],
    );
const files = [
  ...fs
    .readdirSync(root)
    .filter((n) => n.endsWith(".md"))
    .map((n) => path.join(root, n)),
  ...walk(path.join(root, "docs")),
  path.join(root, "cinema/README.md"),
];
const errors = [];
let checked = 0;
for (const file of files) {
  for (const m of fs
    .readFileSync(file, "utf8")
    .matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const target = m[1].replace(/^<|>$/g, "");
    if (
      target.startsWith("#") ||
      target.startsWith("/") ||
      /^\w+:/.test(target)
    )
      continue;
    const local = decodeURI(target.split("#")[0]);
    if (!local) continue;
    checked++;
    if (!fs.existsSync(path.resolve(path.dirname(file), local)))
      errors.push(`${path.relative(root, file)} → ${target}`);
  }
}
if (errors.length) {
  console.error("Broken local document paths:\n" + errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `PASS documentation: ${checked} local link paths in ${files.length} Markdown files (anchors not checked)`,
  );
