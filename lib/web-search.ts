import Anthropic from '@anthropic-ai/sdk'

export interface WebSearchResult {
  mentions: string[]
  totalFound: number
}

export async function searchWebMentions(
  restaurantName: string,
  city: string
): Promise<WebSearchResult> {
  try {
    const client = new Anthropic()

    const userContent = `Search for online reviews of "${restaurantName}" restaurant in ${city}, Netherlands. Find review snippets that specifically mention ha gao, siu mai, dumplings, or dim sum dish quality. Extract up to 8 verbatim review excerpts. Return ONLY valid JSON, no markdown:\n{"mentions": ["verbatim snippet 1", ...], "totalFound": <estimated number of search results>}`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webSearchTool = { type: 'web_search_20250305', name: 'web_search', max_uses: 2 } as any

    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userContent }]

    // Agentic loop: up to 4 turns to allow tool calls to complete
    for (let turn = 0; turn < 4; turn++) {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        tools: [webSearchTool],
        messages,
      })

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find((b) => b.type === 'text')
        if (textBlock?.type === 'text') {
          const cleaned = textBlock.text.replace(/```json\n?|\n?```/g, '').trim()
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            return {
              mentions: Array.isArray(parsed.mentions)
                ? parsed.mentions.filter(Boolean).slice(0, 8)
                : [],
              totalFound: Number(parsed.totalFound) || 0,
            }
          }
        }
        break
      }

      if (response.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: response.content })
        const toolResults: Anthropic.ToolResultBlockParam[] = response.content
          .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
          .map((b) => ({ type: 'tool_result' as const, tool_use_id: b.id, content: '' }))
        if (toolResults.length > 0) {
          messages.push({ role: 'user', content: toolResults })
        }
        continue
      }

      break
    }

    return { mentions: [], totalFound: 0 }
  } catch (err) {
    console.error('[WebSearch] Failed:', err)
    return { mentions: [], totalFound: 0 }
  }
}
