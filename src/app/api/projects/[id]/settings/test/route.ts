import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { aiProvider, claudeApiKey, ollamaUrl, ollamaModel } = body

    if (aiProvider === 'claude') {
      if (!claudeApiKey) {
        return NextResponse.json(
          { error: 'Claude API key is required' },
          { status: 400 }
        )
      }

      try {
        // Test Claude API connection
        const anthropic = new Anthropic({
          apiKey: claudeApiKey,
        })

        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 50,
          messages: [
            {
              role: "user",
              content: "Hello! Just testing the connection. Please respond with 'Connection successful'."
            }
          ]
        })

        const responseText = message.content[0].type === 'text' 
          ? message.content[0].text 
          : ''

        return NextResponse.json({
          success: true,
          message: `Claude API connection successful. Response: "${responseText.trim()}"`
        })

      } catch (error: any) {
        console.error('Claude API test failed:', error)
        return NextResponse.json(
          { 
            error: error.message?.includes('authentication') 
              ? 'Invalid API key'
              : 'Failed to connect to Claude API'
          },
          { status: 400 }
        )
      }

    } else if (aiProvider === 'ollama') {
      if (!ollamaUrl) {
        return NextResponse.json(
          { error: 'Ollama URL is required' },
          { status: 400 }
        )
      }

      try {
        // Test Ollama connection by fetching available models
        const response = await fetch(`${ollamaUrl}/api/tags`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        const models = data.models || []
        const modelNames = models.map((m: any) => m.name)

        // Check if the specified model exists
        const modelExists = modelNames.some((name: string) => 
          name.includes(ollamaModel) || ollamaModel.includes(name.split(':')[0])
        )

        if (modelExists) {
          return NextResponse.json({
            success: true,
            message: `Ollama connection successful. Found ${models.length} models including '${ollamaModel}'.`,
            availableModels: modelNames.slice(0, 5) // Show first 5 models
          })
        } else {
          return NextResponse.json({
            success: true,
            message: `Ollama connection successful, but model '${ollamaModel}' was not found. Available models: ${modelNames.join(', ')}`,
            availableModels: modelNames
          })
        }

      } catch (error: any) {
        console.error('Ollama API test failed:', error)
        return NextResponse.json(
          { 
            error: error.message.includes('fetch') 
              ? 'Could not connect to Ollama server. Is it running?'
              : `Ollama connection failed: ${error.message}`
          },
          { status: 400 }
        )
      }

    } else {
      return NextResponse.json(
        { error: 'Invalid AI provider' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Test connection error:', error)
    return NextResponse.json(
      { error: 'Failed to test connection' },
      { status: 500 }
    )
  }
}