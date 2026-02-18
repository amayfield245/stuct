import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const TYPE_COLORS: Record<string, string> = {
  organisation: '#00f0ff',
  person: '#00bbdd', 
  client: '#ffcc00',
  service: '#ff00aa',
  strategy: '#ff8800',
  goal: '#ff8800',
  financial: '#00ff88',
  process: '#aa44ff',
  system: '#8866ff',
  location: '#8888aa',
  context: '#886644',
  culture: '#ff6688',
  team: '#44ffaa'
}

interface ExtractionResult {
  entities: Array<{
    name: string
    type: string
    subtype?: string
    description?: string
    metadata?: Record<string, any>
  }>
  relationships: Array<{
    source: string
    target: string
    label: string
    weight: number
  }>
  insights: Array<{
    type: string
    severity: string
    text: string
  }>
  frontier_hints: Array<{
    name: string
    hint: string
    risk: string
    value: string
    access_needed: string
  }>
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    // Get the document
    const document = await prisma.document.findUnique({
      where: { 
        id: params.docId,
        projectId: params.id
      }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
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
          ollamaModel: 'llama3.2',
          autoExtract: true,
          extractionDepth: 'deep'
        }
      })
    }

    // Check AI provider configuration
    if (settings.aiProvider === 'none') {
      return NextResponse.json(
        { error: 'AI extraction is not configured. Please enable an AI provider in settings.' },
        { status: 400 }
      )
    }

    if (settings.aiProvider === 'claude' && !settings.claudeApiKey && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Claude API key not configured. Please add your API key in project settings or set ANTHROPIC_API_KEY environment variable.' },
        { status: 500 }
      )
    }

    // Update document status
    await prisma.document.update({
      where: { id: document.id },
      data: { status: 'processing' }
    })

    const SYSTEM_PROMPT = `You are a knowledge extraction engine analysing organisational documents.
Extract ALL entities and relationships. Be thorough but precise.

Return valid JSON only:
{
  "entities": [{
    "name": "...",
    "type": "person|team|organisation|client|service|strategy|goal|financial|process|system|location|context|culture",
    "subtype": "optional specific type",
    "description": "brief description",
    "metadata": { "role": "...", "salary": "...", etc }
  }],
  "relationships": [{
    "source": "entity name (exact match)",
    "target": "entity name (exact match)",  
    "label": "verb phrase describing relationship",
    "weight": 1-5
  }],
  "insights": [{
    "type": "inconsistency|gap|risk|opportunity|observation|culture",
    "severity": "info|warning|critical",
    "text": "description of the finding"
  }],
  "frontier_hints": [{
    "name": "territory name",
    "hint": "what might be found here",
    "risk": "low|medium|high",
    "value": "low|medium|high|very_high",
    "access_needed": "what would be needed to explore this"
  }]
}`

    // Chunk large documents to stay under token limits (~4 chars per token, leave room for prompt)
    const MAX_CONTENT_CHARS = 100000 // ~25K tokens of content
    const content = document.content || ''
    const chunks: string[] = []
    
    if (content.length <= MAX_CONTENT_CHARS) {
      chunks.push(content)
    } else {
      // Split by double newlines (paragraphs/sections) and group into chunks
      const sections = content.split(/\n\n+/)
      let current = ''
      for (const section of sections) {
        if ((current + '\n\n' + section).length > MAX_CONTENT_CHARS && current.length > 0) {
          chunks.push(current)
          current = section
        } else {
          current = current ? current + '\n\n' + section : section
        }
      }
      if (current) chunks.push(current)
    }

    console.log(`Extracting from ${chunks.length} chunk(s) for document: ${document.filename}`)

    // Helper to call the AI provider
    const callAI = async (prompt: string): Promise<{ text: string; model: string }> => {
      if (settings!.aiProvider === 'claude') {
        const apiKey = settings!.claudeApiKey || process.env.ANTHROPIC_API_KEY
        const client = new Anthropic({ apiKey: apiKey })
        const model = "claude-sonnet-4-20250514"

        const message = await client.messages.create({
          model,
          max_tokens: 8000,
          messages: [
            { role: "user", content: prompt }
          ]
        })

        const text = message.content[0].type === 'text' ? message.content[0].text : ''
        return { text, model }

      } else if (settings!.aiProvider === 'ollama') {
        const response = await fetch(`${settings!.ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: settings!.ollamaModel,
            prompt,
            stream: false,
            format: 'json'
          })
        })

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        return { text: data.response || '', model: `ollama-${settings!.ollamaModel}` }
      }

      throw new Error('No AI provider configured')
    }

    // Extract from each chunk and merge results
    const allEntities: ExtractionResult['entities'] = []
    const allRelationships: ExtractionResult['relationships'] = []
    const allInsights: ExtractionResult['insights'] = []
    const allFrontierHints: ExtractionResult['frontier_hints'] = []
    let extractorName = 'unknown'

    for (let i = 0; i < chunks.length; i++) {
      const chunkLabel = chunks.length > 1 ? ` (Part ${i + 1} of ${chunks.length})` : ''
      const prompt = `${SYSTEM_PROMPT}\n\nDocument${chunkLabel}:\n${chunks[i]}`
      
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`)
      
      const result = await callAI(prompt)
      extractorName = result.model

      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed: ExtractionResult = JSON.parse(jsonMatch[0])
          if (parsed.entities) allEntities.push(...parsed.entities)
          if (parsed.relationships) allRelationships.push(...parsed.relationships)
          if (parsed.insights) allInsights.push(...parsed.insights)
          if (parsed.frontier_hints) allFrontierHints.push(...parsed.frontier_hints)
        }
      } catch (parseErr) {
        console.error(`Failed to parse chunk ${i + 1}:`, parseErr)
      }
    }

    // Build a merged responseText for the downstream code
    const mergedResult: ExtractionResult = {
      entities: allEntities,
      relationships: allRelationships,
      insights: allInsights,
      frontier_hints: allFrontierHints
    }
    const responseText = JSON.stringify(mergedResult)

    // Parse JSON response
    const extractionResult: ExtractionResult = mergedResult

    // Create entities
    const entityMap: Record<string, string> = {}
    const createdEntities = []

    for (const entityData of extractionResult.entities) {
      const entity = await prisma.entity.create({
        data: {
          projectId: params.id,
          documentId: document.id,
          name: entityData.name,
          type: entityData.type,
          subtype: entityData.subtype || null,
          description: entityData.description || null,
          metadata: JSON.stringify(entityData.metadata || {}),
          extractedBy: extractorName
        }
      })
      
      entityMap[entityData.name] = entity.id
      createdEntities.push(entity)
    }

    // Create relationships/edges
    const createdEdges = []
    for (const relData of extractionResult.relationships) {
      const sourceId = entityMap[relData.source]
      const targetId = entityMap[relData.target]
      
      if (sourceId && targetId) {
        const edge = await prisma.edge.create({
          data: {
            projectId: params.id,
            sourceId,
            targetId,
            label: relData.label,
            weight: relData.weight || 1,
            documentId: document.id
          }
        })
        createdEdges.push(edge)
      }
    }

    // Create insights
    const createdInsights = []
    for (const insightData of extractionResult.insights) {
      const insight = await prisma.insight.create({
        data: {
          projectId: params.id,
          type: insightData.type,
          severity: insightData.severity,
          text: insightData.text
        }
      })
      createdInsights.push(insight)
    }

    // Create territories (cluster entities by type)
    const territoriesMap: Record<string, string[]> = {}
    
    // Group entities by type
    for (const entity of createdEntities) {
      if (!territoriesMap[entity.type]) {
        territoriesMap[entity.type] = []
      }
      territoriesMap[entity.type].push(entity.id)
    }

    // Create known territories
    const createdTerritories = []
    for (const [type, entityIds] of Object.entries(territoriesMap)) {
      const territory = await prisma.territory.create({
        data: {
          projectId: params.id,
          name: type.charAt(0).toUpperCase() + type.slice(1),
          type: type,
          status: 'known',
          description: `Territory containing ${entityIds.length} ${type} entities`
        }
      })
      
      // Update entities with territory assignment
      await prisma.entity.updateMany({
        where: { id: { in: entityIds } },
        data: { territoryId: territory.id }
      })
      
      createdTerritories.push(territory)
    }

    // Create frontier territories from hints
    for (const hintData of extractionResult.frontier_hints) {
      const frontierTerritory = await prisma.territory.create({
        data: {
          projectId: params.id,
          name: hintData.name,
          type: 'frontier',
          status: 'frontier',
          hint: hintData.hint,
          risk: hintData.risk,
          value: hintData.value,
          accessNeeded: hintData.access_needed
        }
      })
      createdTerritories.push(frontierTerritory)
    }

    // Create agent hierarchy (simple: one coordinator, specialized agents by domain)
    const coordinator = await prisma.agent.create({
      data: {
        projectId: params.id,
        name: 'System Coordinator',
        role: 'coordinator',
        status: 'active',
        description: 'Primary agent overseeing knowledge extraction and analysis',
        entitiesManaged: createdEntities.length
      }
    })

    const createdAgents = [coordinator]

    // Create specialized agents for major entity types
    const majorTypes = Object.entries(territoriesMap)
      .filter(([_, entityIds]) => entityIds.length >= 3)
      .map(([type]) => type)

    for (const type of majorTypes) {
      const agent = await prisma.agent.create({
        data: {
          projectId: params.id,
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Explorer`,
          role: 'explorer',
          status: 'active',
          domain: type,
          description: `Specialized agent for analyzing ${type} entities`,
          entitiesManaged: territoriesMap[type].length,
          parentAgentId: coordinator.id
        }
      })
      createdAgents.push(agent)
    }

    // Update document status and counts
    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: 'extracted',
        entityCount: createdEntities.length,
        edgeCount: createdEdges.length
      }
    })

    return NextResponse.json({
      message: 'Extraction completed successfully',
      summary: {
        entities: createdEntities.length,
        relationships: createdEdges.length,
        insights: createdInsights.length,
        territories: createdTerritories.length,
        agents: createdAgents.length
      }
    })

  } catch (error) {
    console.error('Extraction error:', error)
    
    // Update document status to failed
    try {
      await prisma.document.update({
        where: { id: params.docId },
        data: { status: 'failed' }
      })
    } catch (updateError) {
      console.error('Failed to update document status:', updateError)
    }

    return NextResponse.json(
      { error: 'Extraction failed' },
      { status: 500 }
    )
  }
}