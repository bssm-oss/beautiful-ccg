import type { Command } from "commander";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";
import { stringify } from "yaml";
import type { BccgConfig, AdapterConfig } from "@bccg/adapter-base";

interface CliInfo {
  name: string;
  binary: string;
  installed: boolean;
  version: string | null;
  headless: string[];
  costTier: "free" | "low" | "medium" | "high";
  capabilities: string[];
  multiModel?: boolean;
  models?: string[];
}

const CLI_DEFS: Omit<CliInfo, "installed" | "version">[] = [
  { name: "copilot", binary: "copilot", headless: ["-p", "-s", "--output-format", "json", "--allow-all-tools"], costTier: "medium", capabilities: ["coding", "reasoning", "analysis"], multiModel: true, models: ["claude-opus-4.6", "gpt-5.3-codex", "gemini-3-pro", "claude-haiku-4.5"] },
  { name: "claude", binary: "claude", headless: ["-p", "--output-format", "json"], costTier: "high", capabilities: ["reasoning", "coding", "analysis"] },
  { name: "codex", binary: "codex", headless: ["exec", "--json", "--full-auto"], costTier: "medium", capabilities: ["coding", "testing", "refactoring"] },
  { name: "gemini", binary: "gemini", headless: ["-p", "--output-format", "json"], costTier: "free", capabilities: ["summarize", "generate", "quick-analysis"] },
];

export function detectCli(def: Omit<CliInfo, "installed" | "version">): CliInfo {
  try {
    const output = execFileSync(def.binary, ["--version"], { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    // Extract version number
    const match = output.match(/\d+\.\d+\.\d+/);
    return { ...def, installed: true, version: match?.[0] ?? output.split("\n")[0] };
  } catch {
    return { ...def, installed: false, version: null };
  }
}

// MCP config paths for each CLI
const MCP_PATHS: Record<string, string> = {
  claude: join(process.env.HOME ?? "~", ".claude", "mcp-servers.json"),
  gemini: join(process.env.HOME ?? "~", ".gemini", "settings.json"),
  copilot: join(process.env.HOME ?? "~", ".copilot", "mcp-config.json"),
};

function registerMcpServer(cliName: string): boolean {
  const configPath = MCP_PATHS[cliName];
  if (!configPath) return false;

  try {
    let config: Record<string, unknown> = {};
    if (existsSync(configPath)) {
      config = JSON.parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
    }

    const mcpKey = "mcpServers";
    if (!config[mcpKey]) config[mcpKey] = {};

    const mcpServers = config[mcpKey] as Record<string, unknown>;
    if (mcpServers.bccg) return false; // already registered

    mcpServers.bccg = {
      command: "bccg",
      args: ["serve"],
    };

    mkdirSync(join(configPath, ".."), { recursive: true });
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
    return true;
  } catch {
    return false;
  }
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Auto-detect CLIs and configure bccg")
    .action(async () => {
      console.log("🔍 Scanning local CLI tools...\n");

      const detected = CLI_DEFS.map(detectCli);

      for (const cli of detected) {
        const icon = cli.installed ? "✅" : "❌";
        const ver = cli.version ? ` (v${cli.version})` : "";
        const multi = cli.multiModel ? " — multi-model" : "";
        console.log(`  ${icon} ${cli.name}${ver}${multi}`);
      }

      const installed = detected.filter(c => c.installed);
      if (installed.length === 0) {
        console.log("\n❌ No AI CLIs found. Install at least one of: copilot, claude, codex, gemini");
        process.exit(1);
      }

      // Generate .ccg/config.yaml
      console.log("\n📦 Generating .ccg/config.yaml...");
      const configDir = join(process.cwd(), ".ccg");
      const configPath = join(configDir, "config.yaml");

      if (existsSync(configPath)) {
        console.log("  ⏭ .ccg/config.yaml already exists, skipping");
      } else {
        mkdirSync(configDir, { recursive: true });

        const adapters: Record<string, AdapterConfig> = {};
        for (const cli of detected) {
          adapters[cli.name] = {
            enabled: cli.installed,
            binary: cli.binary,
            headless: cli.headless,
            costTier: cli.costTier,
            capabilities: cli.capabilities,
            ...(cli.multiModel ? { multiModel: true, models: cli.models } : {}),
          };
        }

        const config: BccgConfig = {
          version: 1,
          defaults: { strategy: "balanced", timeout: 60000 },
          adapters,
        };

        writeFileSync(configPath, stringify(config));
        console.log("  ✅ Created .ccg/config.yaml");
      }

      // Register MCP server in detected CLIs
      console.log("\n🔌 Registering bccg MCP server...");
      for (const cli of installed) {
        if (MCP_PATHS[cli.name]) {
          const registered = registerMcpServer(cli.name);
          if (registered) {
            console.log(`  ✅ ${cli.name} → ${MCP_PATHS[cli.name]}`);
          } else {
            console.log(`  ⏭ ${cli.name} — already registered or unsupported`);
          }
        }
      }

      console.log("\n✅ Done! Use @bccg in any of your CLIs, or run: ccg run \"your prompt\"");
    });
}
