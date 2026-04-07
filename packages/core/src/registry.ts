import type { ModelAdapter, AdapterRegistry as IAdapterRegistry } from "@beautiful-ccg/adapter-base";
import { BCCG_HOST_CLI_ENV } from "@beautiful-ccg/adapter-base";

export class Registry implements IAdapterRegistry {
  private adapters = new Map<string, ModelAdapter>();

  register(adapter: ModelAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  get(name: string): ModelAdapter | undefined {
    return this.adapters.get(name);
  }

  getAll(): ModelAdapter[] {
    return Array.from(this.adapters.values());
  }

  async getAvailable(): Promise<ModelAdapter[]> {
    const hostCli = process.env[BCCG_HOST_CLI_ENV];
    const results: ModelAdapter[] = [];

    for (const adapter of this.adapters.values()) {
      // Skip host CLI to prevent recursive invocation
      if (hostCli && adapter.name === hostCli) continue;

      const status = await adapter.checkAvailability();
      if (status.installed && status.authenticated) {
        results.push(adapter);
      }
    }
    return results;
  }
}
