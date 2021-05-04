import {
  flattenNestedTree,
  write as writeFile,
  nodegitPath,
  read as readFile,
} from "./FilesModule";
import { lines, flatten, hash } from "./UtilsModule";
import { join } from "path";
import { existsSync, readdirSync } from "fs";
import { FlattenedArray, Tree } from "../interfaces";

export const isTree = (tree: string | Tree, key: string): tree is Tree =>
  (<Tree>tree)[key] === undefined;

export const writeTree = (tree: Tree): string => {
  const treeObject =
    Object.keys(tree)
      .map((key) =>
        !isTree(tree, key)
          ? `blob ${tree[key]} ${key}`
          : `tree ${writeTree(<Tree>tree[key])} ${key}`
      )
      .join("\n") + "\n";

  return write(treeObject);
};

export const fileTree = (treeHash = "", tree?: Tree): Tree => {
  if (!tree) return fileTree(treeHash, {});

  const objectStr = read(treeHash);
  if (objectStr)
    lines(objectStr).forEach((line) => {
      const lineTokens = line.split(/ /);
      tree[lineTokens[2]] =
        lineTokens[0] === "tree" ? fileTree(lineTokens[1], {}) : lineTokens[1];
    });

  return tree;
};
export const writeCommit = (
  treeHash: string,
  message: string,
  parentHashes: string[]
) =>
  write(
    `commit ${treeHash}\n` +
      parentHashes.map((h) => `parent ${h}\n`).join("") +
      `Date:  ${new Date().toString()}\n\n    ${message}\n`
  );

export const wr = (treeHash: string, message: string, parentHashes: string) =>
  write(
    `commit ${treeHash}\n` +
      parentHashes
        .split("")
        .map((h) => `parent ${h}\n`)
        .join("") +
      `Date:  ${new Date().toString()}\n\n    ${message}\n`
  );

export const write = (str = ""): string => {
  writeFile(join(<string>nodegitPath(), "objects", hash(str)), str);
  return hash(str);
};

export const isUpToDate = (
  receiverHash: string | undefined,
  giverHash: string
) =>
  !!receiverHash &&
  (receiverHash === giverHash || isAncestor(receiverHash, giverHash));

export const exists = (objectHash = "") =>
  existsSync(join(nodegitPath() || "", "objects", objectHash));

export const read = (objectHash = ""): string | undefined => {
  const objectPath = join(<string>nodegitPath(), "objects", objectHash);
  if (existsSync(objectPath)) return readFile(objectPath);
};

export const allObjects = () =>
  readdirSync(nodegitPath("objects") || "").map(read);

export const type = (str = "") =>
  ({ commit: "commit", tree: "tree", blob: "tree" }[str.split(" ")[0]] ||
  "blob");

export const isAncestor = (descendentHash: string, ancestorHash: string) =>
  ancestors(descendentHash).indexOf(ancestorHash) !== -1;

export const ancestors = (commitHash: string): FlattenedArray => {
  const parents = parentHashes(read(commitHash)) || [];
  return flatten(parents.concat(<Array<any>>parents.map(ancestors)));
};

export const parentHashes = (str = "") => {
  if (type(str) === "commit")
    return str
      .split("\n")
      .filter((line) => line.match(/^parent/))
      .map((line) => line.split(" ")[1]);
};

export const treeHash = (str = "") => {
  if (type(str) === "commit") return str.split(/\s/)[1];
};

export const commitToc = (hash = "") =>
  flattenNestedTree(fileTree(treeHash(read(hash))), {}, "");
