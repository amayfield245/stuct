'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import EntityDetail from './EntityDetail'

interface Node {
  id: string
  name: string
  type: string
  subtype?: string | null
  description?: string | null
  confidence: number
  size: number
  reviewStatus: string
  territoryId?: string | null
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
  pinned?: boolean
  [key: string]: any
}

interface Edge {
  id: string
  source: string
  target: string
  label: string
  weight: number
}

interface GraphData {
  nodes: Node[]
  edges: Edge[]
}

// Node type configurations with shapes and colors
const NODE_CONFIG: Record<string, { color: string, shape: string, size: number }> = {
  organisation: { color: '#0033CC', shape: 'rounded-rect', size: 40 },
  person: { color: '#1a5490', shape: 'circle', size: 30 },
  client: { color: '#2d6bb3', shape: 'circle', size: 32 },
  service: { color: '#4080d6', shape: 'diamond', size: 35 },
  strategy: { color: '#5394f9', shape: 'hexagon', size: 38 },
  goal: { color: '#66a8ff', shape: 'hexagon', size: 36 },
  financial: { color: '#1f4d7a', shape: 'hexagon', size: 34 },
  process: { color: '#2a5f94', shape: 'rounded-rect', size: 32 },
  system: { color: '#3570ae', shape: 'diamond', size: 36 },
  location: { color: '#4081c8', shape: 'circle', size: 28 },
  context: { color: '#4b92e2', shape: 'circle', size: 26 },
  culture: { color: '#56a3fc', shape: 'circle', size: 28 },
  team: { color: '#2d6bb3', shape: 'rounded-rect', size: 34 }
}

// Fallback for unknown types
const DEFAULT_NODE_CONFIG = { color: '#666666', shape: 'circle', size: 30 }

interface GraphViewProps {
  projectId: string
}

export default function GraphView({ projectId }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<GraphData | null>(null)
  const [selectedEntity, setSelectedEntity] = useState<Node | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set())
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Get unique node types from data
  const nodeTypes = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.nodes.map(n => n.type))).sort()
  }, [data])

  // Filter nodes and edges based on search and type filters
  const filteredData = useMemo(() => {
    if (!data) return null

    const visibleNodes = data.nodes.filter(node => {
      const matchesSearch = searchTerm === '' || 
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (node.description && node.description.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesType = visibleTypes.size === 0 || visibleTypes.has(node.type)
      return matchesSearch && matchesType
    })

    const visibleNodeIds = new Set(visibleNodes.map(n => n.id))
    const visibleEdges = data.edges.filter(edge =>
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    )

    return {
      nodes: visibleNodes,
      edges: visibleEdges
    }
  }, [data, searchTerm, visibleTypes])

  useEffect(() => {
    fetchGraphData()
  }, [projectId])

  useEffect(() => {
    if (data && nodeTypes.length > 0) {
      // Initialize all types as visible
      setVisibleTypes(new Set(nodeTypes))
    }
  }, [nodeTypes])

  useEffect(() => {
    if (filteredData && svgRef.current && containerRef.current) {
      renderGraph()
    }
  }, [filteredData, hoveredNode])

  const fetchGraphData = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/graph`)
      if (response.ok) {
        const graphData = await response.json()
        setData(graphData)
      }
    } catch (error) {
      console.error('Failed to fetch graph data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleType = (type: string) => {
    const newVisibleTypes = new Set(visibleTypes)
    if (newVisibleTypes.has(type)) {
      newVisibleTypes.delete(type)
    } else {
      newVisibleTypes.add(type)
    }
    setVisibleTypes(newVisibleTypes)
  }

  const getNodeConfig = (type: string) => {
    return NODE_CONFIG[type] || DEFAULT_NODE_CONFIG
  }

  const renderNodeShape = (selection: d3.Selection<SVGGElement, Node, SVGGElement, unknown>) => {
    selection.each(function(d) {
      const group = d3.select(this)
      const config = getNodeConfig(d.type)
      const size = config.size
      
      // Clear previous shapes
      group.selectAll('.node-shape').remove()
      
      switch (config.shape) {
        case 'circle':
          group.append('circle')
            .attr('class', 'node-shape')
            .attr('r', size / 2)
            .attr('fill', 'white')
            .attr('stroke', config.color)
            .attr('stroke-width', 2)
          break
            
        case 'rounded-rect':
          const rectSize = size * 0.8
          group.append('rect')
            .attr('class', 'node-shape')
            .attr('x', -rectSize / 2)
            .attr('y', -rectSize / 2)
            .attr('width', rectSize)
            .attr('height', rectSize)
            .attr('rx', rectSize * 0.2)
            .attr('ry', rectSize * 0.2)
            .attr('fill', 'white')
            .attr('stroke', config.color)
            .attr('stroke-width', 2)
          break
            
        case 'diamond':
          const diamondSize = size * 0.7
          group.append('path')
            .attr('class', 'node-shape')
            .attr('d', `M 0,-${diamondSize/2} L ${diamondSize/2},0 L 0,${diamondSize/2} L -${diamondSize/2},0 Z`)
            .attr('fill', 'white')
            .attr('stroke', config.color)
            .attr('stroke-width', 2)
          break
            
        case 'hexagon':
          const hexSize = size * 0.6
          const hexPoints = []
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3
            hexPoints.push([
              hexSize * Math.cos(angle),
              hexSize * Math.sin(angle)
            ])
          }
          group.append('path')
            .attr('class', 'node-shape')
            .attr('d', `M ${hexPoints.map(p => p.join(',')).join(' L ')} Z`)
            .attr('fill', 'white')
            .attr('stroke', config.color)
            .attr('stroke-width', 2)
          break
      }
    })
  }

  const showTooltip = (event: MouseEvent, content: string) => {
    if (!tooltipRef.current) return
    
    const tooltip = tooltipRef.current
    tooltip.innerHTML = content
    tooltip.style.visibility = 'visible'
    tooltip.style.left = `${event.pageX + 10}px`
    tooltip.style.top = `${event.pageY - 10}px`
  }

  const hideTooltip = () => {
    if (tooltipRef.current) {
      tooltipRef.current.style.visibility = 'hidden'
    }
  }

  const renderGraph = () => {
    if (!filteredData || !svgRef.current || !containerRef.current) return

    const container = containerRef.current
    const svg = d3.select(svgRef.current)
    
    // Clear previous content
    svg.selectAll('*').remove()

    const width = container.clientWidth
    const height = container.clientHeight

    svg.attr('width', width).attr('height', height)

    // Add arrowhead marker
    const defs = svg.append('defs')
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#666')

    const g = svg.append('g')

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Prepare data for D3
    const nodes: Node[] = filteredData.nodes.map(n => ({ ...n }))
    const links = filteredData.edges.map(e => {
      const sourceNode = nodes.find(n => n.id === e.source)!
      const targetNode = nodes.find(n => n.id === e.target)!
      return {
        ...e,
        source: sourceNode,
        target: targetNode
      }
    }).filter(e => e.source && e.target)

    // Group nodes by type for better clustering
    const typeGroups = d3.group(nodes, d => d.type)
    const typePositions = new Map()
    let typeIndex = 0
    typeGroups.forEach((typeNodes, type) => {
      const angle = (typeIndex * 2 * Math.PI) / typeGroups.size
      const radius = Math.min(width, height) * 0.3
      typePositions.set(type, {
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle)
      })
      typeIndex++
    })

    // Enhanced simulation with type clustering
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links)
        .distance(d => 100 + (120 / (d.weight || 1)))
        .strength(d => (d.weight || 1) * 0.1))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => {
        const config = getNodeConfig(d.type)
        return config.size / 2 + 15
      }))
      // Type-based positioning
      .force('type', d3.forceX((d: any) => {
        const pos = typePositions.get(d.type)
        return pos ? pos.x : width / 2
      }).strength(0.1))
      .force('typeY', d3.forceY((d: any) => {
        const pos = typePositions.get(d.type)
        return pos ? pos.y : height / 2
      }).strength(0.1))

    // Create links with better visibility and arrows
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'edge-line')
      .attr('stroke', '#666')
      .attr('stroke-width', d => Math.max(1.5, Math.min(4, (d.weight || 1) * 1.5)))
      .attr('stroke-opacity', 0.7)
      .attr('marker-end', 'url(#arrowhead)')

    // Create nodes with enhanced interactions
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          if (!d.pinned) {
            d.fx = null
            d.fy = null
          }
        }))

    // Render node shapes
    renderNodeShape(node)

    // Highlight matching search terms
    if (searchTerm) {
      node.each(function(d: Node) {
        const matches = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase()))
        
        d3.select(this).select('.node-shape')
          .attr('stroke-width', matches ? 4 : 2)
          .attr('stroke-dasharray', matches ? '5,5' : 'none')
      })
    }

    // Node labels - clean black text
    node.append('text')
      .attr('class', 'node-label')
      .attr('dy', d => {
        const config = getNodeConfig(d.type)
        return config.size / 2 + 16
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#000')
      .attr('pointer-events', 'none')
      .attr('font-weight', '500')
      .text(d => d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name)

    // Enhanced hover effects
    node.on('mouseover', function(event, d) {
      setHoveredNode(d.id)
      
      // Highlight node
      const nodeElement = d3.select(this).select('.node-shape')
      const config = getNodeConfig(d.type)
      nodeElement
        .transition()
        .duration(200)
        .attr('stroke-width', 4)
        .attr('fill', d3.color(config.color)!.brighter(2).toString())

      // Show connected edges and nodes
      const connectedNodeIds = new Set([d.id])
      links.forEach(link => {
        if (link.source.id === d.id) connectedNodeIds.add(link.target.id)
        if (link.target.id === d.id) connectedNodeIds.add(link.source.id)
      })

      // Fade non-connected nodes
      node
        .transition()
        .duration(200)
        .style('opacity', (n: Node) => connectedNodeIds.has(n.id) ? 1 : 0.3)

      // Highlight connected edges
      link
        .transition()
        .duration(200)
        .attr('opacity', l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.2)
        .attr('stroke', l => (l.source.id === d.id || l.target.id === d.id) ? '#0033CC' : '#666')
    })

    node.on('mouseout', function(event, d) {
      setHoveredNode(null)
      
      // Reset node appearance
      d3.select(this).select('.node-shape')
        .transition()
        .duration(200)
        .attr('stroke-width', 2)
        .attr('fill', 'white')

      // Reset all nodes and edges
      node
        .transition()
        .duration(200)
        .style('opacity', 1)

      link
        .transition()
        .duration(200)
        .attr('opacity', 0.7)
        .attr('stroke', '#666')
    })

    // Edge hover for tooltips
    link.on('mouseover', function(event, d: any) {
      showTooltip(event, d.label)
      d3.select(this)
        .transition()
        .duration(200)
        .attr('stroke', '#0033CC')
        .attr('stroke-width', Math.max(2, Math.min(5, (d.weight || 1) * 2)))
    })

    link.on('mouseout', function(event, d: any) {
      hideTooltip()
      if (hoveredNode === null) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke', '#666')
          .attr('stroke-width', Math.max(1.5, Math.min(4, (d.weight || 1) * 1.5)))
      }
    })

    // Node click handler
    node.on('click', (event, d) => {
      setSelectedEntity(d)
    })

    // Double-click to pin/unpin
    node.on('dblclick', (event, d) => {
      event.stopPropagation()
      d.pinned = !d.pinned
      if (d.pinned) {
        d.fx = d.x
        d.fy = d.y
        // Visual indication of pinned state
        d3.select(event.currentTarget).select('.node-shape')
          .attr('stroke-dasharray', '3,3')
      } else {
        d.fx = null
        d.fy = null
        d3.select(event.currentTarget).select('.node-shape')
          .attr('stroke-dasharray', 'none')
      }
    })

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x!)
        .attr('y1', d => d.source.y!)
        .attr('x2', (d: any) => {
          // Adjust end point for arrow
          const dx = d.target.x! - d.source.x!
          const dy = d.target.y! - d.source.y!
          const length = Math.sqrt(dx * dx + dy * dy)
          const config = getNodeConfig((d.target as Node).type)
          const nodeRadius = config.size / 2
          return d.target.x! - (dx * nodeRadius) / length
        })
        .attr('y2', (d: any) => {
          const dx = d.target.x! - d.source.x!
          const dy = d.target.y! - d.source.y!
          const length = Math.sqrt(dx * dx + dy * dy)
          const config = getNodeConfig((d.target as Node).type)
          const nodeRadius = config.size / 2
          return d.target.y! - (dy * nodeRadius) / length
        })

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-[#0033CC] font-medium">Loading graph...</div>
      </div>
    )
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center text-[#666666]">
          <div className="text-xl mb-3 text-black font-semibold tracking-wide">NO ENTITIES FOUND</div>
          <div className="text-sm">Upload documents to populate the knowledge graph</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-white" style={{ height: 'calc(100vh - 200px)' }}>
      {/* Filter Panel */}
      <div className="absolute top-4 left-4 bg-white border border-[#CCCCCC] rounded-lg p-4 z-10 max-h-80 overflow-y-auto shadow-sm w-64">
        <div className="text-xs font-semibold text-[#666666] mb-3 tracking-wide">FILTERS & SEARCH</div>
        
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#CCCCCC] rounded focus:outline-none focus:border-[#0033CC]"
          />
        </div>

        {/* Node count */}
        <div className="mb-4 text-xs text-[#666666]">
          Showing {filteredData?.nodes.length || 0} of {data.nodes.length} nodes
          {filteredData && (
            <div className="mt-1">
              {filteredData.edges.length} edges
            </div>
          )}
        </div>

        {/* Type filters */}
        <div className="text-xs font-semibold text-[#666666] mb-2 tracking-wide">ENTITY TYPES</div>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {nodeTypes.map(type => {
            const config = getNodeConfig(type)
            const count = data.nodes.filter(n => n.type === type).length
            const isVisible = visibleTypes.has(type)
            
            return (
              <label key={type} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => toggleType(type)}
                  className="text-[#0033CC] focus:ring-[#0033CC]"
                />
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center justify-center w-4 h-4">
                    {config.shape === 'circle' && (
                      <div
                        className="w-3 h-3 rounded-full border-2"
                        style={{ 
                          backgroundColor: 'white',
                          borderColor: config.color
                        }}
                      />
                    )}
                    {config.shape === 'rounded-rect' && (
                      <div
                        className="w-3 h-3 border-2 rounded-sm"
                        style={{ 
                          backgroundColor: 'white',
                          borderColor: config.color
                        }}
                      />
                    )}
                    {config.shape === 'diamond' && (
                      <div
                        className="w-3 h-3 border-2 transform rotate-45"
                        style={{ 
                          backgroundColor: 'white',
                          borderColor: config.color
                        }}
                      />
                    )}
                    {config.shape === 'hexagon' && (
                      <div
                        className="w-3 h-3 border-2"
                        style={{ 
                          backgroundColor: 'white',
                          borderColor: config.color,
                          clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)'
                        }}
                      />
                    )}
                  </div>
                  <span className="text-xs text-black capitalize font-medium">{type}</span>
                  <span className="text-xs text-[#666666] ml-auto">({count})</span>
                </div>
              </label>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-[#CCCCCC]">
          <div className="text-xs text-[#666666]">
            <div>💡 Double-click nodes to pin/unpin</div>
            <div>🎯 Hover nodes to highlight connections</div>
            <div>↗️ Hover edges to see full labels</div>
          </div>
        </div>
      </div>

      {/* Graph Container */}
      <div ref={containerRef} className="w-full h-full">
        <svg ref={svgRef} className="w-full h-full" />
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute z-20 bg-black text-white px-2 py-1 rounded text-xs pointer-events-none"
        style={{ visibility: 'hidden' }}
      />

      {/* Entity Detail Panel */}
      {selectedEntity && (
        <EntityDetail
          entity={selectedEntity}
          projectId={projectId}
          onClose={() => setSelectedEntity(null)}
        />
      )}
    </div>
  )
}