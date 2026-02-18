import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: params.id }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Get existing settings or create defaults
    let settings = await prisma.settings.findUnique({
      where: { projectId: params.id }
    })

    if (!settings) {
      // Create default settings
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

    return NextResponse.json(settings)

  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      aiProvider,
      claudeApiKey,
      ollamaUrl,
      ollamaModel,
      autoExtract,
      extractionDepth
    } = body

    // Validate required fields
    if (!aiProvider || !['claude', 'ollama', 'none'].includes(aiProvider)) {
      return NextResponse.json(
        { error: 'Invalid aiProvider' },
        { status: 400 }
      )
    }

    if (!extractionDepth || !['quick', 'deep'].includes(extractionDepth)) {
      return NextResponse.json(
        { error: 'Invalid extractionDepth' },
        { status: 400 }
      )
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: params.id }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Update or create settings
    const settings = await prisma.settings.upsert({
      where: { projectId: params.id },
      update: {
        aiProvider,
        claudeApiKey,
        ollamaUrl: ollamaUrl || 'http://localhost:11434',
        ollamaModel: ollamaModel || 'llama3',
        autoExtract: autoExtract !== undefined ? autoExtract : true,
        extractionDepth
      },
      create: {
        projectId: params.id,
        aiProvider,
        claudeApiKey,
        ollamaUrl: ollamaUrl || 'http://localhost:11434',
        ollamaModel: ollamaModel || 'llama3',
        autoExtract: autoExtract !== undefined ? autoExtract : true,
        extractionDepth
      }
    })

    return NextResponse.json(settings)

  } catch (error) {
    console.error('Failed to update settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}