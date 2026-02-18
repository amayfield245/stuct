'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import InsightsPanel from './InsightsPanel'

interface Territory {
  id: string
  name: string
  type: string
  status: string
  description?: string | null
  hint?: string | null
  risk?: string | null
  value?: string | null
  accessNeeded?: string | null
  entities?: string[]
  entityDetails?: Array<{
    id: string
    name: string
    type: string
  }>
}

interface TerritoriesData {
  known: Territory[]
  frontier: Territory[]
}

// Single blue accent — matching the PDF aesthetic
const BLUE = '#0033CC'
const BLUE_LIGHT = '#0033CC18'
const GRAY_BORDER = '#D0D0D0'
const GRAY_TEXT = '#999999'
const BLACK = '#000000'

interface HexMapViewProps {
  projectId: string
}

export default function HexMapView({ projectId }: HexMapViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<TerritoriesData | null>(null)
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTerritories()
  }, [projectId])

  useEffect(() => {
    if (data && svgRef.current && containerRef.current) {
      renderHexMap()
    }
  }, [data])

  const fetchTerritories = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/territories`)
      if (response.ok) {
        const territories = await response.json()
        setData(territories)
      }
    } catch (error) {
      console.error('Failed to fetch territories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Pointy-top hex points
  const hexPoints = (cx: number, cy: number, size: number): string => {
    const points = []
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30)
      points.push([
        cx + size * Math.cos(angle),
        cy + size * Math.sin(angle)
      ])
    }
    return points.map(p => p.join(',')).join(' ')
  }

  // Axial to pixel for pointy-top hexes
  const axialToPixel = (q: number, r: number, size: number): [number, number] => {
    const x = size * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r)
    const y = size * (3/2 * r)
    return [x, y]
  }

  const renderHexMap = () => {
    if (!data || !svgRef.current || !containerRef.current) return

    const container = containerRef.current
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = container.clientWidth
    const height = container.clientHeight
    const hexSize = 55

    svg.attr('width', width).attr('height', height)

    const g = svg.append('g')

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Auto-fit after rendering
    setTimeout(() => {
      const gNode = g.node()
      if (gNode) {
        const bbox = gNode.getBBox()
        const padding = 60
        const scaleX = (width - 300) / (bbox.width + padding * 2) // leave room for insights panel
        const scaleY = height / (bbox.height + padding * 2)
        const scale = Math.min(scaleX, scaleY, 0.85)
        const tx = (width - 300) / 2 - (bbox.x + bbox.width / 2) * scale
        const ty = height / 2 - (bbox.y + bbox.height / 2) * scale
        svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale))
      }
    }, 100)

    const centerX = width / 2
    const centerY = height / 2

    // Generate hex positions in concentric rings
    const generateRing = (radius: number): [number, number][] => {
      if (radius === 0) return [[0, 0]]
      const ring: [number, number][] = []
      const dirs: [number, number][] = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]
      let q = radius, r = -radius
      for (let d = 0; d < 6; d++) {
        for (let s = 0; s < radius; s++) {
          ring.push([q, r])
          q += dirs[d][0]
          r += dirs[d][1]
        }
      }
      return ring
    }

    const knownPositions: [number, number][] = [...generateRing(0), ...generateRing(1)]
    let knownRing = 2
    while (knownPositions.length < data.known.length) {
      knownPositions.push(...generateRing(knownRing))
      knownRing++
    }

    const frontierPositions: [number, number][] = []
    let frontierRing = knownRing
    while (frontierPositions.length < data.frontier.length) {
      frontierPositions.push(...generateRing(frontierRing))
      frontierRing++
    }

    // Draw frontier hexes — faint gray outlines (fog of war)
    data.frontier.forEach((territory, i) => {
      const pos = frontierPositions[i % frontierPositions.length]
      const [px, py] = axialToPixel(pos[0], pos[1], hexSize)
      const cx = centerX + px
      const cy = centerY + py

      const group = g.append('g')
        .attr('class', 'hex hex-frontier')
        .attr('cursor', 'pointer')

      group.append('polygon')
        .attr('points', hexPoints(cx, cy, hexSize - 1))
        .attr('fill', '#FAFAFA')
        .attr('stroke', GRAY_BORDER)
        .attr('stroke-width', 1)

      group.append('text')
        .attr('x', cx)
        .attr('y', cy - 4)
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .attr('font-size', '9px')
        .attr('fill', GRAY_TEXT)
        .attr('text-anchor', 'middle')
        .attr('pointer-events', 'none')
        .text(territory.name.length > 14 ? territory.name.slice(0, 12) + '…' : territory.name)

      group.append('text')
        .attr('x', cx)
        .attr('y', cy + 10)
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .attr('font-size', '9px')
        .attr('fill', '#CCCCCC')
        .attr('text-anchor', 'middle')
        .attr('pointer-events', 'none')
        .text('?')

      group.on('click', () => setSelectedTerritory(territory))

      group.on('mouseover', function() {
        d3.select(this).select('polygon')
          .attr('stroke', BLUE)
          .attr('stroke-width', 1.5)
      })
      group.on('mouseout', function() {
        d3.select(this).select('polygon')
          .attr('stroke', GRAY_BORDER)
          .attr('stroke-width', 1)
      })
    })

    // Draw known hexes — bold blue outlines (explored territory)
    data.known.forEach((territory, i) => {
      const pos = knownPositions[i % knownPositions.length]
      const [px, py] = axialToPixel(pos[0], pos[1], hexSize)
      const cx = centerX + px
      const cy = centerY + py

      const group = g.append('g')
        .attr('class', 'hex hex-known')
        .attr('cursor', 'pointer')

      // Single bold hex — no fill, just strong blue stroke
      group.append('polygon')
        .attr('points', hexPoints(cx, cy, hexSize - 1))
        .attr('fill', '#FFFFFF')
        .attr('stroke', BLUE)
        .attr('stroke-width', 2.5)

      // Territory name
      group.append('text')
        .attr('x', cx)
        .attr('y', cy - 6)
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', BLACK)
        .attr('text-anchor', 'middle')
        .attr('pointer-events', 'none')
        .text(territory.name.length > 14 ? territory.name.slice(0, 12) + '…' : territory.name)

      // Entity count
      group.append('text')
        .attr('x', cx)
        .attr('y', cy + 10)
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .attr('font-size', '9px')
        .attr('fill', '#666666')
        .attr('text-anchor', 'middle')
        .attr('pointer-events', 'none')
        .text(`${territory.entities?.length || 0} entities`)

      group.on('click', () => setSelectedTerritory(territory))

      group.on('mouseover', function() {
        d3.select(this).select('polygon')
          .attr('stroke-width', 3.5)
          .attr('fill', BLUE_LIGHT)
      })
      group.on('mouseout', function() {
        d3.select(this).select('polygon')
          .attr('stroke-width', 2.5)
          .attr('fill', '#FFFFFF')
      })
    })
  }

  const closeOverlay = () => {
    setSelectedTerritory(null)
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-[#0033CC] animate-pulse font-medium">Loading territories...</div>
      </div>
    )
  }

  if (!data || (data.known.length === 0 && data.frontier.length === 0)) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center text-gray-500">
          <div className="text-xl mb-3 text-[#0033CC] font-semibold">No territories found</div>
          <div className="text-sm">Extract documents to generate knowledge territories</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-white" style={{ height: 'calc(100vh - 200px)' }}>
      <div ref={containerRef} className="w-full h-full">
        <svg ref={svgRef} className="w-full h-full" />
      </div>

      <InsightsPanel projectId={projectId} />

      {selectedTerritory && (
        <div 
          className="fixed bottom-0 left-0 right-0 max-h-[45%] overflow-y-auto z-50 bg-white border-t border-gray-200 shadow-lg"
        >
          <button
            onClick={closeOverlay}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-lg"
          >
            ✕
          </button>
            
          <div className="p-8 pb-6">
            <h3 className="text-[#0033CC] text-lg font-semibold mb-2">
              {selectedTerritory.status === 'frontier' ? '🔍 ' : ''}{selectedTerritory.name}
            </h3>
            
            <div className="mb-4">
              <span 
                className={`inline-block px-3 py-1 rounded text-xs border ${
                  selectedTerritory.status === 'known' 
                    ? 'bg-blue-50 text-[#0033CC] border-[#0033CC]'
                    : 'bg-gray-50 text-gray-500 border-gray-300'
                }`}
              >
                {selectedTerritory.status === 'known' ? `${selectedTerritory.type.toUpperCase()} — Explored` : 'FRONTIER — Unexplored'}
              </span>
            </div>

            {selectedTerritory.description && (
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                {selectedTerritory.description}
              </p>
            )}

            {selectedTerritory.hint && (
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                {selectedTerritory.hint}
              </p>
            )}

            {selectedTerritory.entityDetails && selectedTerritory.entityDetails.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Entities</div>
                <div className="flex flex-wrap gap-2">
                  {selectedTerritory.entityDetails.map(entity => (
                    <span
                      key={entity.id}
                      className="bg-gray-50 px-3 py-1 rounded text-xs border border-gray-200 text-gray-700"
                    >
                      {entity.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedTerritory.status === 'frontier' && (
              <div className="flex gap-4 text-xs mb-4">
                {selectedTerritory.risk && (
                  <span className="bg-gray-50 px-3 py-1 rounded border border-gray-200">
                    Risk: <strong className={
                      selectedTerritory.risk === 'low' ? 'text-green-600' : 
                      selectedTerritory.risk === 'medium' ? 'text-amber-600' : 'text-red-600'
                    }>{selectedTerritory.risk}</strong>
                  </span>
                )}
                {selectedTerritory.value && (
                  <span className="bg-gray-50 px-3 py-1 rounded border border-gray-200">
                    Value: <strong className="text-[#0033CC]">{selectedTerritory.value}</strong>
                  </span>
                )}
              </div>
            )}

            {selectedTerritory.accessNeeded && (
              <p className="text-sm mb-4 text-gray-600">
                <strong className="text-gray-900">Access needed:</strong> {selectedTerritory.accessNeeded}
              </p>
            )}

            {selectedTerritory.status === 'frontier' && (
              <button
                className="bg-[#0033CC] text-white px-6 py-2 rounded font-semibold text-sm hover:bg-[#0022AA] transition-colors"
                onClick={() => {
                  alert('Exploration requires additional access or documents')
                }}
              >
                ▶ Explore
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
