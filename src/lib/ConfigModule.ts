import { Object as ConfigObj, Tree } from "../interfaces";
import {
  read as readFile,
  write as writeFile,
  nodegitPath,
} from "./FilesModule";
import { setIn } from "./UtilsModule";

export const isBare = () => (<Tree>(<Tree>read()["core"]))["bare"] === "true";

export const assertNotBare = () => {
  if (isBare()) throw new Error("this operation must be run in a work tree");
};

export const read = () => strToObj(readFile(nodegitPath("config")));

export const write = (configObj: Tree) =>
  writeFile(nodegitPath("config"), objToStr(configObj));

export const strToObj = (str: string) =>
  str
    .split("[")
    .map((item) => item.trim())
    .filter((item) => item !== "")
    .reduce<Tree>(
      (c, item) => {
        const lines = item.split("\n");
        const entry: Array<string | Tree> = [];
        //section eg “core”
        const firstLine = lines[0];
        const matcherArray = firstLine.match(/([^ \]]+)( |\])/);
        if (matcherArray) {
          const matcher = matcherArray[1];
          entry.push(matcher);
        }

        const subsectionMatch = lines[0].match(/\"(.+)\"/);
        const subsection = subsectionMatch === null ? "" : subsectionMatch[1];
        entry.push(subsection);
        const options = lines.slice(1).reduce<Tree>((s, l) => {
          s[l.split("=")[0].trim()] = l.split("=")[1].trim();
          return s;
        }, {});
        entry.push(options);

        return setIn(c, entry);
      },
      { remote: {} }
    );

export const objToStr = (configObj: Tree): string =>
  Object.keys(configObj)
    .reduce<Array<Tree>>(
      (arr, section) =>
        arr.concat(
          Object.keys(configObj[section]).map((subsection) => ({
            section,
            subsection,
          }))
        ),
      []
    )
    .map((entry) => {
      const subsection =
        entry.subsection === "" ? "" : `  "${entry.subsection}"`;
      const settings = (<Tree>configObj[<string>entry.section])[
        <string>entry.subsection
      ];
      return `[${entry.section}${subsection}]\n${Object.keys(settings)
        .map((k) => `  ${k} = ${(<Tree>settings)[k]}`)
        .join("\n")}\n`;
    })
    .join("");
