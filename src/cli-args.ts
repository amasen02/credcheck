import { parseArgs } from "node:util";

export interface CliOptions {
  readonly paths: readonly string[];
  readonly staged: boolean;
  readonly configPath: string | undefined;
  readonly excludePatterns: readonly string[];
  readonly disabledRuleIds: readonly string[];
  readonly json: boolean;
  readonly help: boolean;
  readonly version: boolean;
}

export class CliArgError extends Error {}

export function parseCliArgs(argv: readonly string[]): CliOptions {
  let parsed;
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      options: {
        staged: { type: "boolean", default: false },
        config: { type: "string" },
        exclude: { type: "string", multiple: true, default: [] },
        "disable-rule": { type: "string", multiple: true, default: [] },
        json: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
        version: { type: "boolean", short: "v", default: false },
      },
    });
  } catch (error) {
    throw new CliArgError(error instanceof Error ? error.message : String(error));
  }

  const { values, positionals } = parsed;

  return {
    paths: positionals,
    staged: values.staged,
    configPath: values.config,
    excludePatterns: values.exclude,
    disabledRuleIds: values["disable-rule"],
    json: values.json,
    help: values.help,
    version: values.version,
  };
}
