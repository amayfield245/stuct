import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const territories = await prisma.territory.findMany({
      where: { projectId: params.id },
      include: {
        entities: {
          select: {
            id: true,
            name: true,
            type: true,
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // known first, then frontier
        { name: 'asc' }
      ]
    })

    // Deduplicate territories by name+type+status, merging entities
    const dedup = <T extends { name: string; type: string; status: string }>(
      items: typeof territories,
      mapper: (t: typeof territories[0], merged: typeof territories) => T
    ): T[] => {
      const groups = new Map<string, typeof territories>()
      for (const t of items) {
        const key = `${t.name}|${t.type}|${t.status}`
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(t)
      }
      return Array.from(groups.values()).map(group => mapper(group[0], group))
    }

    const known = dedup(
      territories.filter(t => t.status === 'known'),
      (first, group) => {
        // Merge entities from all duplicates, dedup by id
        const entityMap = new Map<string, { id: string; name: string; type: string }>()
        for (const t of group) {
          for (const e of t.entities) {
            entityMap.set(e.id, e)
          }
        }
        const allEntities = Array.from(entityMap.values())
        return {
          id: first.id,
          name: first.name,
          type: first.type,
          status: first.status,
          description: first.description,
          entities: allEntities.map(e => e.id),
          entityDetails: allEntities
        }
      }
    )

    const frontier = dedup(
      territories.filter(t => t.status === 'frontier'),
      (first) => ({
        id: first.id,
        name: first.name,
        type: first.type,
        status: first.status,
        hint: first.hint,
        risk: first.risk,
        value: first.value,
        accessNeeded: first.accessNeeded
      })
    )

    return NextResponse.json({
      known,
      frontier
    })

  } catch (error) {
    console.error('Failed to fetch territories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch territories' },
      { status: 500 }
    )
  }
}