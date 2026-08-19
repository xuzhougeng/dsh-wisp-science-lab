import { Config, resolveConfig, type Config as WispLabConfig } from './config.ts'
import type { LabContext } from './ctx.ts'
import { PI_PROMPT } from './prompt.ts'
import { registerTools } from './tools.ts'

export const name = 'wisp-science-lab'
export const inject = ['tools', 'systemPrompt']
export { Config }
export type { WispLabConfig }

export function apply(ctx: LabContext, raw: unknown) {
  const config = resolveConfig(raw)
  console.log('[wisp-science-lab] plugin loaded')
  ctx.systemPrompt.section({
    name: 'wisp-lab:persona',
    order: 80,
    text: PI_PROMPT,
  })
  registerTools(ctx, config)
}
