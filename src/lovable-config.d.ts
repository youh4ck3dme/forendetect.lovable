declare module "@lovable.dev/vite-tanstack-config" {
  import type { PluginOption, UserConfig } from "vite";

  interface LovableConfig {
    vite?: UserConfig;
    plugins?: PluginOption[];
    tanstackStart?: Record<string, unknown>;
  }

  export function defineConfig(config: LovableConfig): UserConfig;
}
