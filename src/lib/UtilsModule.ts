import crypto from "crypto";
import { FlattenedArray, Tree } from "../interfaces";

export const hash = (string = "") => {
  if (!string) return string;
  const sha1 = crypto.createHash("sha1").update(string).digest("hex");
  return sha1;
};

export const setIn = (obj: Tree, arr: (string | Tree)[]) => {
  if (arr.length === 2 && typeof arr[0] === "string") obj[arr[0]] = arr[1];
  else if (arr.length > 2 && typeof arr[0] === "string" && typeof obj[arr[0]]) {
    obj[arr[0]] = obj[arr[0]] || ({} as Tree);
    setIn(<Tree>obj[arr[0]], arr.slice(1));
  }
  return obj;
};

export const lines = (str: string) => str.split("\n").filter((l) => l !== "");

export const isString = (arr: any): arr is string =>
  typeof (<string>arr) === "string";

export const flatten = (arr: any[]): string[] =>
  arr.reduce((a, e) => a.concat(e instanceof Array ? flatten(e) : e), []);

export const unique = (arr: any[]) =>
  arr.reduce(
    (a: string | any[], p: any) => (a.indexOf(p) === -1 ? a.concat(p) : a),
    []
  );

export const intersection = (a: FlattenedArray, b: FlattenedArray) =>
  a.filter((e) => b.indexOf(e) !== -1);

export const onRemote = (remotePath: string) =>
  function (fn: Function) {
    const originalDir = process.cwd();
    process.chdir(remotePath);
    const result = fn.apply(null, Array.prototype.slice.call(arguments, 1));
    process.chdir(originalDir);
    return result;
  };
