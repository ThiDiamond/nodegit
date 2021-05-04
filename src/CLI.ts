const Nodegit = require("./lib/GitModule");

const parseOptions = (argv: any[]) => {
  let name: string | undefined;
  return argv.reduce(
    (opts, arg: string) => {
      if (arg.match(/^-/)) {
        name = arg.replace(/^-+/, "");
        opts[name] = true;
      } else if (!!name) {
        opts[name] = arg;
        name = undefined;
      } else {
        opts._.push(arg);
      }

      return opts;
    },
    { _: [] }
  );
};

export const runCli = (module.exports.runCli = (argv: any[]) => {
  const opts = parseOptions(argv);
  const commandName: string = opts._[2];

  if (!commandName)
    throw new Error("you must specify a Nodegit command to run");
  else {
    const commandFnName = commandName.replace(/-/g, "_");

    const fn = { ...Nodegit }[commandFnName];

    if (!fn) throw new Error(`"${commandFnName}" is not a Nodegit command`);
    else {
      const commandArgs = opts._.slice(3);
      while (commandArgs.length < fn.length - 1) {
        commandArgs.push(undefined);
      }
      //@ts-ignore
      return fn.apply({ ...Nodegit }, commandArgs.concat(opts));
    }
  }
});

try {
  const result = runCli(process.argv);
  if (!!result) console.log(result);
} catch (e) {
  console.error(e.toString());
}
