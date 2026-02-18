'use client'

import { useEffect, useState } from 'react'

interface Entity {
  id: string
  name: string
  type: string
  subtype?: string | null
  description?: string | null
  confidence: number
  reviewStatus: string
  territoryId?: string | null
  [key: string]: any // For metadata fields
}

interface Edge {
  id: string
  source: string
  target: string
  label: string
  weight: number
}

interface GraphData {
  nodes: Entity[]
  edges: Edge[]
}

// Clean color scheme - primarily using blue accent
const TYPE_COLORS: Record<string, string> = {
  organisation: '#0033CC',
  person: '#0033CC',
  client: '#0033CC',
  service: '#0033CC',
  strategy: '#0033CC',
  goal: '#0033CC',
  financial: '#0033CC',
  process: '#0033CC',
  system: '#0033CC',
  location: '#0033CC',
  context: '#0033CC',
  culture: '#0033CC',
  team: '#0033CC'
}

interface EntityDetailProps {
  entity: Entity
  projectId: string
  onClose: () => void
}

export default function EntityDetail({ entity, projectId, onClose }: EntityDetailProps) {
  const [connections, setConnections] = useState<Array<{
    entity: Entity
    relationship: string
    direction: 'incoming' | 'outgoing'
  }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchConnections()
  }, [entity.id, projectId])

  const fetchConnections = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/graph`)
      if (response.ok) {
        const data: GraphData = await response.json()
        
        // Find all edges connected to this entity
        const entityConnections = data.edges
          .filter(edge => edge.source === entity.id || edge.target === entity.id)
          .map(edge => {
            const isOutgoing = edge.source === entity.id
            const connectedEntityId = isOutgoing ? edge.target : edge.source
            const connectedEntity = data.nodes.find(n => n.id === connectedEntityId)
            
            if (!connectedEntity) return null
            
            return {
              entity: connectedEntity,
              relationship: edge.label,
              direction: isOutgoing ? 'outgoing' as const : 'incoming' as const
            }
          })
          .filter(Boolean) as Array<{
            entity: Entity
            relationship: string
            direction: 'incoming' | 'outgoing'
          }>

        setConnections(entityConnections)
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const color = TYPE_COLORS[entity.type] || '#0033CC'

  // Extract metadata fields (excluding standard fields)
  const standardFields = new Set(['id', 'name', 'type', 'subtype', 'description', 'confidence', 'reviewStatus', 'territoryId', 'size'])
  const metadataFields = Object.entries(entity).filter(([key]) => !standardFields.has(key))

  return (
    <div className="fixed top-0 right-0 w-96 h-full bg-white border-l border-[#CCCCCC] p-6 overflow-y-auto z-50 transform transition-transform duration-300 shadow-lg">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-[#666666] hover:text-black text-lg"
      >
        ✕
      </button>

      <h3 className="text-black text-lg font-semibold mb-2 pr-8">
        {entity.name}
      </h3>

      <div className="mb-4">
        <span 
          className="inline-block px-3 py-1 rounded text-xs border font-semibold"
          style={{
            backgroundColor: color + '20',
            color: color,
            borderColor: color
          }}
        >
          {entity.type.toUpperCase()}
          {entity.subtype && ` · ${entity.subtype}`}
        </span>
      </div>

      {entity.description && (
        <div className="mb-4">
          <p className="text-[#333333] text-sm leading-relaxed">
            {entity.description}
          </p>
        </div>
      )}

      {/* Metadata Fields */}
      {metadataFields.length > 0 && (
        <div className="mb-6">
          {metadataFields.map(([key, value]) => (
            <div key={key} className="flex justify-between py-3 border-b border-[#CCCCCC] text-sm">
              <span className="text-[#666666] capitalize font-medium">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
              <span className="text-black text-right max-w-48 truncate">{String(value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* System Fields */}
      <div className="mb-6">
        <div className="flex justify-between py-3 border-b border-[#CCCCCC] text-sm">
          <span className="text-[#666666] font-medium">Confidence</span>
          <span className="text-black font-semibold">
            {Math.round(entity.confidence * 100)}%
          </span>
        </div>
        
        <div className="flex justify-between py-3 border-b border-[#CCCCCC] text-sm">
          <span className="text-[#666666] font-medium">Review Status</span>
          <span className={`capitalize font-semibold ${
            entity.reviewStatus === 'approved' ? 'text-green-600' :
            entity.reviewStatus === 'rejected' ? 'text-red-600' :
            'text-orange-600'
          }`}>
            {entity.reviewStatus}
          </span>
        </div>
      </div>

      {/* Connections */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-[#666666] text-xs font-semibold tracking-wide">
            CONNECTIONS ({connections.length})
          </h4>
          {isLoading && (
            <div className="text-[#666666] text-xs">Loading...</div>
          )}
        </div>

        {connections.length === 0 && !isLoading ? (
          <div className="text-[#666666] text-xs">No connections found</div>
        ) : (
          <div className="space-y-3">
            {connections.map((conn, index) => (
              <div key={index} className="text-xs p-3 border border-[#CCCCCC] rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`${conn.direction === 'outgoing' ? 'text-[#0033CC]' : 'text-orange-600'}`}>
                    {conn.direction === 'outgoing' ? '→' : '←'}
                  </span>
                  <span className="font-medium text-black">
                    {conn.entity.name}
                  </span>
                </div>
                <div className="ml-4 text-[#666666] italic text-xs">
                  {conn.relationship}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}