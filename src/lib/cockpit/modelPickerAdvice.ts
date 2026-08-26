import type { CopilotModelId } from '@/lib/cockpit/modelCatalog'

/** One-line Chinese guidance for non-AI users (shown beside model picker). */
export const COPILOT_MODEL_PICKER_HINT =
  '日常中文与持仓：DeepSeek Chat · 复杂推演：Reasoner · OpenAI 省钱：4o Mini · 英文深度：4o / 5.6 Sol'

const MODEL_ADVICE: Partial<Record<CopilotModelId, string>> = {
  'deepseek-chat':
    '默认首选：中文对话、盘前盘后简报、查持仓与跑 MCP 工具，速度快、费用低。',
  'deepseek-reasoner':
    '多步逻辑与策略推演时用；会先「思考」再回答，更慢，简单问答请用 Chat。',
  'gpt-4o-mini':
    'OpenAI 最省钱之一；适合短问答与英文摘要，复杂 tool 循环仍可用。',
  'gpt-4o':
    'OpenAI 成熟旗舰；英文与复杂分析较好，比 Mini 贵，日常可优先 DeepSeek。',
  'gpt-4.1-mini':
    '比 4o-mini 更听话；coding 与 tool 调用稳定，成本仍较低。',
  'gpt-4.1':
    '长上下文与 coding；复杂策略推演可选，费用高于 Mini 档。',
  'gpt-5-mini': 'GPT-5 经济型；平衡成本与能力，多轮对话比旗舰省。',
  'gpt-5': 'GPT-5 旗舰；适合复杂英文报告，日常对话不建议默认选。',
  'claude-4.5-sonnet': 'Claude 旗舰；长上下文与 tool 稳定，费用最高，需单独配置 Key。',
  'ollama:llama3.2': '本地免费；不支持 Copilot 工具调用，仅适合离线试聊。',
}

/** Prefix fallbacks for API models not in the static catalog. */
const PREFIX_ADVICE: Array<{ prefix: string; text: string }> = [
  { prefix: 'gpt-5.6-luna', text: 'OpenAI 最新便宜档；高吞吐日常问答，推荐作 OpenAI 默认。' },
  { prefix: 'gpt-5.6-terra', text: 'OpenAI 平衡档；比 Luna 聪明也更贵，中等复杂任务。' },
  { prefix: 'gpt-5.6-sol', text: 'OpenAI 5.6 旗舰；复杂推理与 coding，费用高，少用于闲聊。' },
  { prefix: 'gpt-5.4-nano', text: '5.4 最便宜；分类、摘要、简单问答，与 5.6 Luna 同档。' },
  { prefix: 'gpt-5.4-mini', text: '5.4 强 mini；coding 与 sub-agent，比 nano 贵但更强。' },
  { prefix: 'gpt-5.5', text: '5.5 旗舰；很贵，仅复杂专业分析，日常勿选。' },
]

export function getModelPracticalAdvice(
  modelId: string,
  apiNote?: string | null,
): string {
  const staticAdvice = MODEL_ADVICE[modelId as CopilotModelId]
  if (staticAdvice) return staticAdvice

  for (const { prefix, text } of PREFIX_ADVICE) {
    if (modelId === prefix || modelId.startsWith(prefix)) return text
  }

  if (apiNote?.trim()) return apiNote.trim()

  if (modelId.startsWith('deepseek')) {
    return modelId.includes('reasoner')
      ? MODEL_ADVICE['deepseek-reasoner']!
      : MODEL_ADVICE['deepseek-chat']!
  }
  if (modelId.includes('mini') || modelId.includes('luna') || modelId.includes('nano')) {
    return '轻量模型：省钱、响应快，适合日常问答与短总结。'
  }
  return '旗舰模型：能力强、费用高，适合复杂分析而非日常闲聊。'
}
