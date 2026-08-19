/** The slice of the dsh context this plugin uses. Avoids a runtime import of host packages. */
export interface LabContext {
  tools: {
    register(tool: {
      name: string
      description: string
      parameters: Record<string, unknown>
      output: {
        schema: Record<string, unknown>
        render: (args: unknown, value: unknown) => Array<{ type: 'text'; text: string }>
      }
      presentCall?: (args: Record<string, unknown>) => { card: 'generic'; title: string; kind?: string }
      execute: (args: Record<string, unknown>) => Promise<unknown>
    }): void
  }
  systemPrompt: {
    section(opts: { name: string; order: number; text: string }): void
  }
}
