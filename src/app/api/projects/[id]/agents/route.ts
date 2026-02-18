import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agents = await prisma.agent.findMany({
      where: { projectId: params.id },
      include: {
        childAgents: {
          select: {
            id: true,
            name: true,
            role: true,
            status: true,
            domain: true,
            entitiesManaged: true,
          }
        }
      },
      orderBy: [
        { role: 'asc' }, // coordinator first
        { name: 'asc' }
      ]
    })

    const formattedAgents = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      status: agent.status,
      domain: agent.domain,
      description: agent.description,
      entitiesManaged: agent.entitiesManaged,
      parentAgentId: agent.parentAgentId,
      childAgents: agent.childAgents,
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString()
    }))

    // Build hierarchy structure
    const coordinator = formattedAgents.find(a => a.role === 'coordinator')
    const hierarchy = coordinator ? {
      ...coordinator,
      children: formattedAgents.filter(a => a.parentAgentId === coordinator.id)
    } : null

    return NextResponse.json({
      agents: formattedAgents,
      hierarchy
    })

  } catch (error) {
    console.error('Failed to fetch agents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
}