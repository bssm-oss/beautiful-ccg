import { Command } from "commander";
import { registerRunCommand } from "./commands/run.js";
import { registerStatusCommand } from "./commands/status.js";
import { registerServeCommand } from "./commands/serve.js";
import { registerInitCommand } from "./commands/init.js";
import { registerPipelineCommand } from "./commands/pipeline.js";
import { registerDoctorCommand } from "./commands/doctor.js";

const program = new Command();

program
  .name("bccg")
  .description("Run Claude, ChatGPT, and Gemini together — with whatever CLI you already have.")
  .version("0.3.0");

registerRunCommand(program);
registerPipelineCommand(program);
registerStatusCommand(program);
registerInitCommand(program);
registerServeCommand(program);
registerDoctorCommand(program);

program.parse();
