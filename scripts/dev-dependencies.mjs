import { createRequire } from "node:module";
import path from "node:path";

export function devRequire(name) {
  const require = createRequire(import.meta.url);
  try { return require(name); }
  catch (error) {
    if (!process.env.TABDOCK_NODE_MODULES) throw error;
    return createRequire(path.join(process.env.TABDOCK_NODE_MODULES, "package.json"))(name);
  }
}
