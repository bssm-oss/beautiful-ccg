import type { Command } from "commander";
import { existsSync } from "fs";
import { join } from "path";
import { createOrchestrator, loadConfig } from "../bootstrap.js";

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Check bccg health: adapters, config, and MCP registration")
    .action(async () => {
      const cwd = process.cwd();
      let issues = 0;

      // 1. Config check
      console.log("📋 Config");
      const config = loadConfig(cwd);
      const configPath = join(cwd, ".ccg", "config.yaml");
      if (config) {
        console.log(`  ✅ ${configPath}`);
        console.log(`     strategy=${config.defaults.strategy} timeout=${config.defaults.timeout}ms`);
        const rules = config.routing?.rules?.length ?? 0;
        if (rules > 0) console.log(`     ${rules} routing rule(s)`);
      } else {
        console.log(`  ⚠️  No config found (run 'bccg init' to generate)`);
        issues++;
      }

      // 2. .mcp.json check
      console.log("\n📄 .mcp.json");
      const mcpJsonPath = join(cwd, ".mcp.json");
      if (existsSync(mcpJsonPath)) {
        console.log(`  ✅ ${mcpJsonPath}`);
      } else {
        console.log("  ⚠️  No .mcp.json (run 'bccg init' to generate)");
        issues++;
      }

      // 3. Adapter availability
      console.log("\n🔌 Adapters");
      const orchestrator = createOrchestrator(cwd);
      const status = await orchestrator.status();

      for (const [name, s] of Object.entries(status)) {
        const icon = s.installed && s.authenticated ? "✅" : s.installed ? "⚠️" : "❌";
        const version = s.version ?? "not installed";
        const multi = s.multiModel ? " [multi-model]" : "";
        console.log(`  ${icon} ${name} (${version})${multi}`);
        if (!s.installed) issues++;
      }

      const available = Object.values(status).filter(s => s.installed && s.authenticated).length;
      if (available === 0) {
        console.log("\n  ❌ No adapters available! Install at least one AI CLI.");
        issues++;
      }

      // 4. MCP registration check
      console.log("\n🔗 MCP Registration");
      const home = process.env.HOME ?? "~";
      const mcpPaths: Record<string, string> = {
        claude: join(home, ".claude.json"),
        gemini: join(home, ".gemini", "settings.json"),
        copilot: join(home, ".copilot", "mcp-config.json"),
      };

      for (const [cli, path] of Object.entries(mcpPaths)) {
        if (existsSync(path)) {
          try {
            const content = JSON.parse(
              (await import("fs")).readFileSync(path, "utf-8"),
            ) as Record<string, unknown>;
            const servers = content.mcpServers as Record<string, unknown> | undefined;
            if (servers?.bccg) {
              console.log(`  ✅ ${cli} → ${path}`);
            } else {
              console.log(`  ⚠️  ${cli} config exists but bccg not registered`);
              issues++;
            }
          } catch {
            console.log(`  ⚠️  ${cli} config exists but unreadable`);
            issues++;
          }
        } else {
          console.log(`  — ${cli} config not found (${path})`);
        }
      }

      // Summary
      console.log(
        issues === 0
          ? "\n✅ All checks passed!"
          : `\n⚠️  ${issues} issue(s) found. Run 'bccg init' to fix most of them.`,
      );
    });
}
