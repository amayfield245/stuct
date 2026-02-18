import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { projectId: params.id },
      orderBy: { createdAt: 'asc' },
      take: 100 // Limit to last 100 messages
    })

    const formattedMessages = messages.map(message => {
      let referencedEntityIds = []
      try {
        referencedEntityIds = JSON.parse(message.referencedEntityIds)
      } catch (error) {
        // If JSON parsing fails, use empty array
      }

      return {
        id: message.id,
        role: message.role,
        content: message.content,
        referencedEntityIds,
        createdAt: message.createdAt.toISOString()
      }
    })

    return NextResponse.json({ messages: formattedMessages })

  } catch (error) {
    console.error('Failed to fetch chat messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat messages' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get project settings
    let settings = await prisma.settings.findUnique({
      where: { projectId: params.id }
    })

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          projectId: params.id,
          aiProvider: 'claude',
          ollamaUrl: 'http://localhost:11434',
          ollamaModel: 'llama3',
          autoExtract: true,
          extractionDepth: 'deep'
        }
      })
    }

    // Check AI provider configuration
    if (settings.aiProvider === 'none') {
      return NextResponse.json(
        { error: 'AI chat is not configured. Please enable an AI provider in settings.' },
        { status: 400 }
      )
    }

    if (settings.aiProvider === 'claude' && !settings.claudeApiKey && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Claude API key not configured. Please add your API key in project settings or set ANTHROPIC_API_KEY environment variable.' },
        { status: 500 }
      )
    }

    // Load entities and edges for context
    const [entities, edges] = await Promise.all([
      prisma.entity.findMany({
        where: { projectId: params.id },
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          metadata: true,
        },
        take: 200 // Limit to avoid token limits
      }),
      prisma.edge.findMany({
        where: { projectId: params.id },
        select: {
          id: true,
          label: true,
          source: { select: { name: true } },
          target: { select: { name: true } },
        },
        take: 200
      })
    ])

    // Build context
    const entityContext = entities.map(e => {
      let metadata = {}
      try {
        metadata = JSON.parse(e.metadata)
      } catch {}
      
      return `${e.name} (${e.type}): ${e.description || ''} ${Object.entries(metadata).map(([k,v]) => `${k}:${v}`).join(' ')}`
    }).join('\n')

    const relationshipContext = edges.map(e => 
      `${e.source.name} → ${e.label} → ${e.target.name}`
    ).join('\n')

    const contextPrompt = `You are an AI assistant analyzing a knowledge graph. Answer questions based on the following data:

ENTITIES:
${entityContext}

RELATIONSHIPS:
${relationshipContext}

User question: ${message}

Please provide a helpful, concise answer based on the knowledge graph data. If the question cannot be answered from the available data, say so clearly.`

    // Save user message
    await prisma.chatMessage.create({
      data: {
        projectId: params.id,
        role: 'user',
        content: message
      }
    })

    // Get AI response based on provider
    let responseText = 'Sorry, I could not generate a response.'

    if (settings.aiProvider === 'claude') {
      const apiKey = settings.claudeApiKey || process.env.ANTHROPIC_API_KEY
      const anthropic = new Anthropic({
        apiKey: apiKey,
      })

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: contextPrompt
          }
        ]
      })

      responseText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : 'Sorry, I could not generate a response.'

    } else if (settings.aiProvider === 'ollama') {
      const response = await fetch(`${settings.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.ollamaModel,
          messages: [
            {
              role: "system",
              content: `You are an AI assistant analyzing a knowledge graph. Answer questions based on the following data:

ENTITIES:
${entityContext}

RELATIONSHIPS:
${relationshipContext}

Please provide a helpful, concise answer based on the knowledge graph data. If the question cannot be answered from the available data, say so clearly.`
            },
            {
              role: "user",
              content: message
            }
          ],
          stream: false
        })
      })

      if (response.ok) {
        const data = await response.json()
        responseText = data.message?.content || 'Sorry, I could not generate a response.'
      } else {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }
    }

    // Save assistant message
    await prisma.chatMessage.create({
      data: {
        projectId: params.id,
        role: 'assistant',
        content: responseText
      }
    })

    return NextResponse.json({
      message: responseText
    })

  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}