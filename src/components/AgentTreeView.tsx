'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

interface Agent {
  id: string
  name: string
  role: string
  status: string
  domain?: string | null
  description?: string | null
  entitiesManaged: number
  parentAgentId?: string | null
  childAgents?: Agent[]
  createdAt: string
  updatedAt: string
}

interface AgentsData {
  agents: Agent[]
  hierarchy: Agent | null
}

interface AgentTreeViewProps {
  projectId: string
}

interface TreeNode {
  id: string
  name: string
  role: string
  status: string
  domain: string
  entitiesManaged: number
  description?: string | null
  createdAt: string
  children?: TreeNode[]
  x?: number
  y?: number
}

export default function AgentTreeView({ projectId }: AgentTreeViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<AgentsData | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAgents()
  }, [projectId])

  useEffect(() => {
    if (data && svgRef.current && containerRef.current) {
      renderAgentTree()
    }
  }, [data])

  const fetchAgents = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/agents`)
      if (response.ok) {
        const agents = await response.json()
        setData(agents)
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#0033CC' // Blue for active
      case 'complete': return '#000000' // Black for complete
      case 'pending': 
      default: return '#CCCCCC' // Gray for pending
    }
  }

  // Deduplicate and merge agents with same name and role
  const deduplicateAgents = (agents: Agent[]): Agent[] => {
    const merged = new Map<string, Agent>()

    agents.forEach(agent => {
      const key = `${agent.name}_${agent.role}`
      
      if (merged.has(key)) {
        const existing = merged.get(key)!
        // Merge entity counts and prefer active status
        existing.entitiesManaged += agent.entitiesManaged
        if (agent.status === 'active' && existing.status !== 'active') {
          existing.status = agent.status
        }
        // Keep the most recent creation date
        if (new Date(agent.createdAt) > new Date(existing.createdAt)) {
          existing.createdAt = agent.createdAt
          existing.updatedAt = agent.updatedAt
        }
        // Merge descriptions if available
        if (agent.description && !existing.description) {
          existing.description = agent.description
        }
        // Prefer non-null domain
        if (agent.domain && !existing.domain) {
          existing.domain = agent.domain
        }
      } else {
        merged.set(key, { ...agent })
      }
    })

    return Array.from(merged.values())
  }

  // Build tree hierarchy with deduplicated agents
  const buildTreeHierarchy = (agents: Agent[]): TreeNode | null => {
    const deduped = deduplicateAgents(agents)
    
    const coordinator = deduped.find(a => a.role === 'coordinator')
    const explorers = deduped.filter(a => a.role !== 'coordinator')

    if (!coordinator) return null

    const root: TreeNode = {
      id: coordinator.id,
      name: coordinator.name,
      role: coordinator.role,
      status: coordinator.status,
      domain: coordinator.domain || 'system',
      entitiesManaged: coordinator.entitiesManaged,
      description: coordinator.description,
      createdAt: coordinator.createdAt,
      children: explorers.map(explorer => ({
        id: explorer.id,
        name: explorer.name,
        role: explorer.role,
        status: explorer.status,
        domain: explorer.domain || explorer.name.toLowerCase().replace(' explorer', ''),
        entitiesManaged: explorer.entitiesManaged,
        description: explorer.description,
        createdAt: explorer.createdAt
      }))
    }

    return root
  }

  const renderAgentTree = () => {
    if (!data || !data.agents.length || !svgRef.current || !containerRef.current) return

    const container = containerRef.current
    const svg = d3.select(svgRef.current)
    
    // Clear previous content
    svg.selectAll('*').remove()

    const width = container.clientWidth
    const height = container.clientHeight

    svg.attr('width', width).attr('height', height)

    // Create zoom/pan group
    const g = svg.append('g').attr('class', 'zoom-group')

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 2])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Build tree hierarchy
    const hierarchyData = buildTreeHierarchy(data.agents)
    if (!hierarchyData) return

    // Create d3 hierarchy
    const root = d3.hierarchy(hierarchyData)

    // Calculate tree layout
    const treeLayout = d3.tree<TreeNode>()
      .size([width - 200, height - 200])
      .separation((a, b) => {
        // More space between nodes to prevent overlap
        return a.parent === b.parent ? 2 : 2.5
      })

    const treeData = treeLayout(root)

    // Center the tree
    const nodes = treeData.descendants()
    const links = treeData.links()

    // Adjust positioning to center properly
    const centerX = width / 2
    const centerY = 80

    // Draw links first (so they appear behind nodes)
    const linkGroup = g.append('g').attr('class', 'links')

    const linkPath = linkGroup.selectAll('.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', (d: any) => {
        const source = { x: d.source.x + centerX - (width-200)/2, y: d.source.y + centerY }
        const target = { x: d.target.x + centerX - (width-200)/2, y: d.target.y + centerY }
        
        // Create clean orthogonal connector
        return `M ${source.x} ${source.y}
                L ${source.x} ${source.y + 30}
                L ${target.x} ${source.y + 30}
                L ${target.x} ${target.y - 30}`
      })
      .attr('stroke', '#0033CC')
      .attr('stroke-width', 2)
      .attr('fill', 'none')
      .attr('opacity', 0.6)

    // Draw nodes
    const nodeGroup = g.append('g').attr('class', 'nodes')

    const node = nodeGroup.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => {
        const x = d.x + centerX - (width-200)/2
        const y = d.y + centerY
        return `translate(${x}, ${y})`
      })
      .style('cursor', 'pointer')

    // Node circles with different sizes
    const nodeCircle = node.append('circle')
      .attr('r', (d: any) => d.data.role === 'coordinator' ? 50 : 35)
      .attr('fill', (d: any) => {
        const status = d.data.status
        return status === 'active' ? '#E6F0FF' : 
               status === 'complete' ? getStatusColor(status) : 'white'
      })
      .attr('stroke', (d: any) => getStatusColor(d.data.status))
      .attr('stroke-width', (d: any) => d.data.role === 'coordinator' ? 3 : 2)
      .style('transition', 'all 0.3s ease')

    // Entity count inside the node
    node.append('text')
      .attr('class', 'node-count')
      .attr('y', 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', (d: any) => d.data.role === 'coordinator' ? '16px' : '13px')
      .attr('font-weight', '700')
      .attr('fill', '#0033CC')
      .text((d: any) => d.data.entitiesManaged)

    // Agent name below the node
    node.append('text')
      .attr('class', 'node-name')
      .attr('y', (d: any) => (d.data.role === 'coordinator' ? 50 : 35) + 16)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('fill', '#000000')
      .text((d: any) => d.data.name)

    // Domain below the name
    node.append('text')
      .attr('class', 'node-domain')
      .attr('y', (d: any) => (d.data.role === 'coordinator' ? 50 : 35) + 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('fill', '#666666')
      .text((d: any) => d.data.domain)

    // Interaction handlers
    node.on('click', (event: any, d: any) => {
      // Convert TreeNode back to Agent for compatibility
      const agentData: Agent = {
        id: d.data.id,
        name: d.data.name,
        role: d.data.role,
        status: d.data.status,
        domain: d.data.domain,
        description: d.data.description,
        entitiesManaged: d.data.entitiesManaged,
        createdAt: d.data.createdAt,
        updatedAt: d.data.createdAt, // fallback
        childAgents: d.data.children?.map((child: TreeNode) => ({
          id: child.id,
          name: child.name,
          role: child.role,
          status: child.status,
          domain: child.domain,
          description: child.description,
          entitiesManaged: child.entitiesManaged,
          createdAt: child.createdAt,
          updatedAt: child.createdAt
        })) || []
      }
      setSelectedAgent(agentData)
    })

    // Hover effects
    node.on('mouseover', function(event: any, d: any) {
      d3.select(this).select('circle')
        .transition().duration(200)
        .attr('stroke-width', (d: any) => d.data.role === 'coordinator' ? 4 : 3)
        .attr('r', (d: any) => d.data.role === 'coordinator' ? 52 : 37)
    })

    node.on('mouseout', function(event: any, d: any) {
      d3.select(this).select('circle')
        .transition().duration(200)
        .attr('stroke-width', (d: any) => d.data.role === 'coordinator' ? 3 : 2)
        .attr('r', (d: any) => d.data.role === 'coordinator' ? 50 : 35)
    })

    // Initial zoom to fit content
    const bounds = g.node()?.getBBox()
    if (bounds) {
      const fullWidth = bounds.width
      const fullHeight = bounds.height
      const scale = Math.min(width / fullWidth, height / fullHeight) * 0.8
      const translate = [
        width / 2 - (bounds.x + fullWidth / 2) * scale,
        height / 2 - (bounds.y + fullHeight / 2) * scale
      ]
      
      svg.call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale))
    }
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-[#0033CC] font-medium">Loading agents...</div>
      </div>
    )
  }

  if (!data || !data.agents.length) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center text-[#666666]">
          <div className="text-xl mb-3 text-black font-semibold tracking-wide">NO AGENTS FOUND</div>
          <div className="text-sm">Extract documents to generate agent hierarchy</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-white" style={{ height: 'calc(100vh - 200px)' }}>
      {/* Agent Tree Container */}
      <div ref={containerRef} className="w-full h-full">
        <svg ref={svgRef} className="w-full h-full" />
      </div>

      {/* Agent Detail Panel - clean design */}
      {selectedAgent && (
        <div className="fixed top-0 right-0 w-80 h-full bg-white border-l border-[#CCCCCC] p-6 overflow-y-auto z-50 shadow-lg">
          <button
            onClick={() => setSelectedAgent(null)}
            className="absolute top-3 right-3 text-[#666666] hover:text-black text-lg"
          >
            ✕
          </button>

          <h3 className="text-black text-lg font-semibold mb-1">
            {selectedAgent.name}
          </h3>
          
          <div className="text-[#666666] text-sm mb-4 capitalize font-medium">
            {selectedAgent.role} · {selectedAgent.status}
          </div>

          {selectedAgent.description && (
            <p className="text-[#333333] text-sm leading-relaxed mb-6">
              {selectedAgent.description}
            </p>
          )}

          {selectedAgent.domain && (
            <div className="flex justify-between py-3 border-b border-[#CCCCCC] text-sm">
              <span className="text-[#666666] font-medium">Domain</span>
              <span className="text-[#0033CC] capitalize font-semibold">{selectedAgent.domain}</span>
            </div>
          )}

          <div className="flex justify-between py-3 border-b border-[#CCCCCC] text-sm">
            <span className="text-[#666666] font-medium">Entities managed</span>
            <span className="text-black font-semibold">{selectedAgent.entitiesManaged}</span>
          </div>

          <div className="flex justify-between py-3 border-b border-[#CCCCCC] text-sm">
            <span className="text-[#666666] font-medium">Status</span>
            <span className={`font-semibold capitalize ${
              selectedAgent.status === 'complete' ? 'text-black' :
              selectedAgent.status === 'active' ? 'text-[#0033CC]' :
              'text-[#CCCCCC]'
            }`}>
              {selectedAgent.status}
            </span>
          </div>

          <div className="flex justify-between py-3 border-b border-[#CCCCCC] text-sm">
            <span className="text-[#666666] font-medium">Created</span>
            <span className="text-black">
              {new Date(selectedAgent.createdAt).toLocaleDateString()}
            </span>
          </div>

          {selectedAgent.childAgents && selectedAgent.childAgents.length > 0 && (
            <div className="mt-6">
              <div className="text-[#666666] text-xs font-semibold mb-3 tracking-wide">MANAGES</div>
              {selectedAgent.childAgents.map(child => (
                <div 
                  key={child.id} 
                  className="text-sm mb-3 cursor-pointer hover:text-[#0033CC] transition-colors p-2 rounded border border-[#CCCCCC] hover:border-[#0033CC]"
                  onClick={() => setSelectedAgent(child)}
                >
                  <span className="text-black font-medium">{child.name}</span>
                  <span className="text-[#666666] block text-xs mt-1">
                    Status: {child.status} · {child.entitiesManaged} entities
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}