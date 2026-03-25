import { Command } from "commander";
import { registerRunCommand } from "./commands/run.js";
import { registerStatusCommand } from "./commands/status.js";
import { registerServeCommand } from "./commands/serve.js";
import { registerInitCommand } from "./commands/init.js";

const program = new Command();

program
  .name("bccg")
  .description("Run Claude, ChatGPT, and Gemini together — with whatever CLI you already have.")
  .version("0.1.0");

registerRunCommand(program);
registerStatusCommand(program);
registerServeCommand(program);
registerInitCommand(program);

program.parse();
