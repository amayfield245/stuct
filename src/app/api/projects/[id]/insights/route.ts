import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const insights = await prisma.insight.findMany({
      where: { projectId: params.id },
      orderBy: [
        { severity: 'desc' }, // critical first
        { createdAt: 'desc' }
      ]
    })

    const formattedInsights = insights.map(insight => {
      let relatedEntityIds = []
      try {
        relatedEntityIds = JSON.parse(insight.relatedEntityIds)
      } catch (error) {
        // If JSON parsing fails, use empty array
      }

      return {
        id: insight.id,
        type: insight.type,
        severity: insight.severity,
        text: insight.text,
        relatedEntityIds,
        acknowledged: insight.acknowledged,
        createdAt: insight.createdAt.toISOString()
      }
    })

    // Group by severity for easier frontend handling
    const grouped = {
      critical: formattedInsights.filter(i => i.severity === 'critical'),
      warning: formattedInsights.filter(i => i.severity === 'warning'),
      info: formattedInsights.filter(i => i.severity === 'info')
    }

    return NextResponse.json({
      insights: formattedInsights,
      grouped,
      counts: {
        total: formattedInsights.length,
        critical: grouped.critical.length,
        warning: grouped.warning.length,
        info: grouped.info.length,
        unacknowledged: formattedInsights.filter(i => !i.acknowledged).length
      }
    })

  } catch (error) {
    console.error('Failed to fetch insights:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    )
  }
}