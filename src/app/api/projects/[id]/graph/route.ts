import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get all entities for the project
    const entities = await prisma.entity.findMany({
      where: { projectId: params.id },
      select: {
        id: true,
        name: true,
        type: true,
        subtype: true,
        description: true,
        metadata: true,
        confidence: true,
        reviewStatus: true,
        territoryId: true,
      }
    })

    // Get all edges for the project
    const edges = await prisma.edge.findMany({
      where: { projectId: params.id },
      select: {
        id: true,
        sourceId: true,
        targetId: true,
        label: true,
        weight: true,
      }
    })

    // Transform entities for D3
    const nodes = entities.map(entity => {
      let metadata = {}
      try {
        metadata = JSON.parse(entity.metadata)
      } catch (error) {
        // If JSON parsing fails, use empty object
      }

      return {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        subtype: entity.subtype,
        description: entity.description,
        confidence: entity.confidence,
        reviewStatus: entity.reviewStatus,
        territoryId: entity.territoryId,
        size: Math.max(2, Math.floor(entity.confidence * 5)),
        ...metadata // Spread the metadata properties
      }
    })

    // Transform edges for D3
    const links = edges.map(edge => ({
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      label: edge.label,
      weight: edge.weight
    }))

    return NextResponse.json({
      nodes,
      edges: links
    })

  } catch (error) {
    console.error('Failed to fetch graph data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch graph data' },
      { status: 500 }
    )
  }
}