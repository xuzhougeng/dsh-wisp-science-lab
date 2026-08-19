import type { Context } from '@deepseek-ai/cordis'
import { Config } from './config.ts'
import { PI_PROMPT } from './prompt.ts'
import { registerTools } from './tools.ts'

export const name = 'wisp-science-lab'
export const inject = ['tools', 'systemPrompt']
export { Config }
export type { Config as WispLabConfig } from './config.ts'

export function apply(ctx: Context, config: Config) {
  console.log('[wisp-science-lab] plugin loaded')
  ctx.systemPrompt.section({
    name: 'wisp-lab:persona',
    order: 80,
    text: PI_PROMPT,
  })
  registerTools(ctx, config)
}
