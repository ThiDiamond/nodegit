import {
  read as readFile,
  write as writeFile,
  nodegitPath,
  workingCopyPath,
  pathFromRepoRoot,
} from "./FilesModule";
import { lines, setIn, hash } from "./UtilsModule";
import { write as writeObject } from "./ObjectsModule";
import { existsSync } from "fs";
import { Tree } from "../interfaces";

export const hasFile = (path: string, stage: number) =>
  read()[key(path, stage)] !== undefined;

export const read = () => {
  const indexFilePath = nodegitPath("index") || "";
  return lines(
    existsSync(indexFilePath) ? readFile(indexFilePath) : "\n"
  ).reduce((idx: { [key: string]: string }, blobStr) => {
    const blobData = blobStr.split(/ /);

    idx[key(blobData[0], parseInt(blobData[1]))] = blobData[2];

    return idx;
  }, {});
};

export const keyPieces = (key: string) => {
  const pieces = key.split(/,/);
  return { path: pieces[0], stage: parseInt(pieces[1]) };
};

export const toc = (): { [key: string]: string } => {
  const idx = read();
  return Object.keys(idx).reduce(
    (obj, k) => setIn(obj, [k.split(",")[0], idx[k]]),
    {}
  );
};

export const key = (path: string, stage: number) => `${path},${stage}`;

export const isFileInConflict = (path: string) => hasFile(path, 2);

export const conflictedPaths = () =>
  Object.keys(read())
    .filter((k) => keyPieces(k).stage === 2)
    .map((k) => keyPieces(k).path);

export const writeNonConflict = (path: string, content = "") => {
  writeRm(path);
  _writeStageEntry(path, 0, content);
};

export const writeConflict = (
  path: string,
  receiverContent: string,
  giverContent: string,
  baseContent?: string
) => {
  if (baseContent !== undefined) _writeStageEntry(path, 1, baseContent);

  _writeStageEntry(path, 2, receiverContent);
  _writeStageEntry(path, 3, giverContent);
};

export const writeRm = (path: string) => {
  const idx = read();
  [0, 1, 2, 3].forEach((stage) => {
    delete idx[key(path, stage)];
  });
  write(idx);
};

export const _writeStageEntry = (
  path: string,
  stage: number,
  content: string
) => {
  const idx = read();
  idx[key(path, stage)] = writeObject(content);
  write(idx);
};

export const write = (index: { [x: string]: any }) => {
  const indexStr =
    Object.keys(index)
      .map((k) => `${k.split(",")[0]} ${k.split(",")[1]} ${index[k]}`)
      .join("\n") + "\n";
  writeFile(nodegitPath("index"), indexStr);
};

export const workingCopyToc = () => <Tree>Object.keys(read())
    .map((k) => k.split(",")[0])
    .filter((p) => existsSync(workingCopyPath(p)))
    .reduce((idx, p) => {
      (<Tree>idx)[p] = hash(readFile(workingCopyPath(p)));
      return idx;
    }, {});

export const tocToIndex = (toc: Tree) =>
  Object.keys(toc).reduce((idx, p) => setIn(idx, [key(p, 0), toc[p]]), {});

export const matchingFiles = (pathSpec: string) => {
  const searchPath = pathFromRepoRoot(pathSpec);
  return Object.keys(toc()).filter((p) =>
    p.match("^" + searchPath.replace(/\\/g, "\\\\"))
  );
};
