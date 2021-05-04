import { join, relative, sep } from "path";
import { setIn, isString } from "./UtilsModule";
import fs from "fs";
import { platform } from "os";
import { Tree } from "../interfaces";

export const inRepo = () => nodegitPath() !== undefined;

export const assertInRepo = () => {
  if (!inRepo()) throw new Error("not a nodegit repository");
};

export const pathFromRepoRoot = (path: string) =>
  relative(workingCopyPath(path), join(process.cwd(), path));

export const write = (path = "", content = "") => {
  const prefix = platform() === "win32" ? "." : "/";
  writeFilesFromTree(setIn({}, path.split(sep).concat(content)), prefix);
};

export const writeFilesFromTree = (tree: Tree, prefix: string) => {
  Object.keys(tree).forEach((name) => {
    const path = join(prefix, name);
    const isString = typeof tree[name] === "string";

    if (isString) fs.writeFileSync(path, <string>tree[name]);
    else if (!fs.existsSync(path)) fs.mkdirSync(path, "777");

    if (!isString) writeFilesFromTree(<Tree>tree[name], path);
  });
};

export const rmEmptyDirs = (path: string) => {
  if (fs.statSync(path).isDirectory()) {
    fs.readdirSync(path).forEach((c) => rmEmptyDirs(join(path, c)));
    if (fs.readdirSync(path).length === 0) fs.rmdirSync(path);
  }
};

export const read = (path = "") => {
  if (fs.existsSync(path)) return fs.readFileSync(path, "utf8");
  return "";
};

export const nodegitPath = (path?: string) => {
  const nodegitDir = (dir: string): string | undefined => {
    if (fs.existsSync(dir)) {
      const potentialConfigFile = join(dir, "config");
      const potentialnodegitPath = join(dir, ".nodegit");
      if (
        fs.existsSync(potentialConfigFile) &&
        fs.statSync(potentialConfigFile).isFile() &&
        read(potentialConfigFile)?.match(/\[core\]/)
      )
        return dir;
      else if (fs.existsSync(potentialnodegitPath)) return potentialnodegitPath;
      else if (dir !== "/") return nodegitDir(join(dir, ".."));
    }
  };

  const gDir = nodegitDir(process.cwd());

  if (gDir) return join(gDir, path || "");
};

export const workingCopyPath = (path = "") =>
  join(join(nodegitPath() || "", ".."), path);

export const lsRecursive = (path: string): any => {
  if (!fs.existsSync(path)) return [];
  else if (fs.statSync(path).isFile()) return [path];
  else if (fs.statSync(path).isDirectory())
    return fs
      .readdirSync(path)
      .reduce(
        (fileList: string | any[], dirChild: any) =>
          fileList.concat(lsRecursive(join(path, dirChild))),
        []
      );
};

export const nestFlatTree = (obj: Tree) =>
  Object.keys(obj).reduce(
    (tree, wholePath) =>
      setIn(tree, wholePath.split(sep).concat(<string>obj[wholePath])),
    {}
  );

export const flattenNestedTree = (
  tree: Tree | string,
  obj: Tree | string,
  prefix: string
): Tree => {
  if (!obj) return flattenNestedTree(tree, {}, "");

  Object.keys(tree).forEach((dir) => {
    const path = join(prefix, dir);
    if (typeof (<Tree>tree)[dir] === "string")
      (<Tree>obj)[path] = (<Tree>tree)[dir];
    else flattenNestedTree((<Tree>tree)[dir], obj, path);
  });

  return <Tree>obj;
};
