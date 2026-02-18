'use client'

import { useState, useEffect, useRef } from 'react'

interface Chat {
  role: 'user' | 'assistant'
  content: string
}

interface Entity {
  id: string
  name: string
  type: string
  properties?: any
}

interface Insight {
  id: string
  type: string
  severity: string
  text: string
  content?: string
}

interface Territory {
  id: string
  name: string
  type?: string
  status?: string
  entityCount?: number
  entities?: any[]
}

interface Document {
  id: string
  filename: string
  status: string
  entityCount: number
}

interface Agent {
  id: string
  name: string
  role: string
  domain?: string | null
  entitiesManaged: number
  status: string
}

interface Project {
  name: string
  description: string | null
}

interface WorkspaceViewProps {
  projectId: string
}

// Deduplicate agents by name+role, summing entity counts
function deduplicateAgents(agents: Agent[]): Agent[] {
  const merged = new Map<string, Agent>()
  for (const agent of agents) {
    const key = `${agent.name}::${agent.role}`
    if (merged.has(key)) {
      const existing = merged.get(key)!
      existing.entitiesManaged += agent.entitiesManaged
    } else {
      merged.set(key, { ...agent })
    }
  }
  return Array.from(merged.values())
}

export default function WorkspaceView({ projectId }: WorkspaceViewProps) {
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false)
  
  const [documentsCollapsed, setDocumentsCollapsed] = useState(false)
  const [agentsCollapsed, setAgentsCollapsed] = useState(false)
  const [entitiesCollapsed, setEntitiesCollapsed] = useState(false)
  const [insightsCollapsed, setInsightsCollapsed] = useState(false)
  const [territoriesCollapsed, setTerritoriesCollapsed] = useState(false)
  const [collapsedTypes, setCollapsedTypes] = useState<Record<string, boolean>>({})

  const [project, setProject] = useState<Project | null>(null)
  const [chatMessages, setChatMessages] = useState<Chat[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [entitySearch, setEntitySearch] = useState('')
  const [inputMessage, setInputMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [expandedInsights, setExpandedInsights] = useState<Record<string, boolean>>({})

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchProject()
    fetchChatHistory()
    fetchEntities()
    fetchInsights()
    fetchTerritories()
    fetchDocuments()
    fetchAgents()
  }, [projectId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data)
      }
    } catch (error) {
      console.error('Failed to fetch project:', error)
    }
  }

  const fetchChatHistory = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/chat`)
      if (response.ok) {
        const data = await response.json()
        setChatMessages(Array.isArray(data) ? data : data.messages || [])
      }
    } catch (error) {
      setChatMessages([])
    }
  }

  const fetchEntities = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/graph`)
      if (response.ok) {
        const data = await response.json()
        setEntities(data.nodes || [])
      }
    } catch (error) {
      console.error('Failed to fetch entities:', error)
    }
  }

  const fetchInsights = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/insights`)
      if (response.ok) {
        const data = await response.json()
        setInsights(Array.isArray(data) ? data : data.insights || [])
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error)
    }
  }

  const fetchTerritories = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/territories`)
      if (response.ok) {
        const data = await response.json()
        setTerritories(Array.isArray(data) ? data : [...(data.known || []), ...(data.frontier || [])])
      }
    } catch (error) {
      console.error('Failed to fetch territories:', error)
    }
  }

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/documents`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(Array.isArray(data) ? data : data.documents || [])
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    }
  }

  const fetchAgents = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/agents`)
      if (response.ok) {
        const data = await response.json()
        const raw = Array.isArray(data) ? data : data.agents || []
        setAgents(deduplicateAgents(raw))
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || sending) return

    setSending(true)
    const userMessage = { role: 'user' as const, content: inputMessage }
    setChatMessages(prev => [...prev, userMessage])
    setInputMessage('')

    try {
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputMessage })
      })

      if (response.ok) {
        const data = await response.json()
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Chat functionality is not yet implemented for this project.' 
        }])
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error processing your message.' 
      }])
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Group entities by type
  const entitiesByType: Record<string, Entity[]> = {}
  for (const entity of entities) {
    if (!entitiesByType[entity.type]) entitiesByType[entity.type] = []
    entitiesByType[entity.type].push(entity)
  }
  // Sort types by count descending
  const sortedTypes = Object.entries(entitiesByType).sort((a, b) => b[1].length - a[1].length)

  const toggleType = (type: string) => {
    setCollapsedTypes(prev => ({ ...prev, [type]: !prev[type] }))
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-700 bg-red-50 border border-red-200'
      case 'warning': return 'text-amber-700 bg-amber-50 border border-amber-200'
      case 'info': return 'text-blue-700 bg-blue-50 border border-blue-200'
      default: return 'text-gray-700 bg-gray-50 border border-gray-200'
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white'
      case 'warning': return 'bg-amber-500 text-white'
      case 'info': return 'bg-blue-600 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'extracted': return 'text-green-700 bg-green-50'
      case 'processing': return 'text-amber-700 bg-amber-50'
      case 'uploaded': return 'text-blue-700 bg-blue-50'
      default: return 'text-gray-700 bg-gray-50'
    }
  }

  const getInsightText = (insight: Insight) => insight.text || insight.content || ''

  const knownTerritories = territories.filter(t => t.status === 'known' || t.type === 'known')
  const frontierTerritories = territories.filter(t => t.status === 'frontier' || t.type === 'frontier')

  return (
    <div className="flex h-full bg-white relative" style={{ height: 'calc(100vh - 160px)' }}>
      {/* Left Sidebar */}
      <div
        className="border-r border-[#E5E5E5] flex flex-col overflow-y-auto transition-all duration-300 flex-shrink-0"
        style={{ width: leftSidebarCollapsed ? '0px' : '250px', opacity: leftSidebarCollapsed ? 0 : 1, overflow: leftSidebarCollapsed ? 'hidden' : 'auto' }}
      >
        {/* Project Info */}
        <div className="p-4 border-b border-[#E5E5E5]">
          <h2 className="font-semibold text-black text-sm">{project?.name || 'Loading...'}</h2>
          {project?.description && (
            <p className="text-[#666] text-xs mt-1">{project.description}</p>
          )}
        </div>

        {/* Documents Section */}
        <div className="border-b border-[#E5E5E5]">
          <button
            onClick={() => setDocumentsCollapsed(!documentsCollapsed)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
          >
            <span className="font-medium text-black text-sm">Documents ({documents.length})</span>
            <span className={`text-[#999] text-xs transform transition-transform duration-200 ${documentsCollapsed ? '-rotate-90' : ''}`}>▼</span>
          </button>
          {!documentsCollapsed && (
            <div className="pb-2">
              {documents.map(doc => (
                <div key={doc.id} className="px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  <div className="text-xs text-black truncate">{doc.filename}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                    <span className="text-[#999] text-[10px]">{doc.entityCount} entities</span>
                  </div>
                </div>
              ))}
              <button className="w-full px-4 py-2 text-[#0033CC] hover:bg-blue-50 text-xs font-medium text-left">
                + Upload Document
              </button>
            </div>
          )}
        </div>

        {/* Agents Section */}
        <div className="border-b border-[#E5E5E5]">
          <button
            onClick={() => setAgentsCollapsed(!agentsCollapsed)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
          >
            <span className="font-medium text-black text-sm">Agents ({agents.length})</span>
            <span className={`text-[#999] text-xs transform transition-transform duration-200 ${agentsCollapsed ? '-rotate-90' : ''}`}>▼</span>
          </button>
          {!agentsCollapsed && (
            <div className="pb-2">
              {agents.map(agent => (
                <div key={agent.id} className="px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-black font-medium">{agent.name}</span>
                    <span className="text-[10px] text-[#0033CC] font-semibold">{agent.entitiesManaged}</span>
                  </div>
                  {agent.domain && (
                    <div className="text-[10px] text-[#999] mt-0.5">{agent.domain}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Left Collapse Toggle */}
      <button
        onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
        className="absolute top-2 z-10 bg-white border border-[#E5E5E5] rounded px-1.5 py-1 text-[#999] hover:text-black text-xs transition-all duration-300"
        style={{ left: leftSidebarCollapsed ? '4px' : '254px' }}
      >
        {leftSidebarCollapsed ? '▶' : '◀'}
      </button>

      {/* Centre Column — Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {chatMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[#999]">
              <div className="text-center">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-sm">Ask anything about your project</p>
                <p className="text-xs mt-1">The AI has access to all extracted knowledge</p>
              </div>
            </div>
          ) : (
            chatMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl px-4 py-3 rounded-lg text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-[#0033CC] text-white rounded-br-sm'
                      : 'bg-[#F5F5F5] text-black rounded-bl-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="border-t border-[#E5E5E5] px-6 py-4">
          <div className="flex gap-3">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your project..."
              className="flex-1 resize-none border border-[#E5E5E5] rounded-lg px-4 py-3 focus:outline-none focus:border-[#0033CC] text-sm text-black placeholder-[#999]"
              rows={1}
              disabled={sending}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || sending}
              className="bg-[#0033CC] text-white px-5 py-3 rounded-lg hover:bg-[#0022AA] disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
          <div className="text-[10px] text-[#999] mt-2">Claude Sonnet</div>
        </div>
      </div>

      {/* Right Collapse Toggle */}
      <button
        onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
        className="absolute top-2 right-0 z-10 bg-white border border-[#E5E5E5] rounded px-1.5 py-1 text-[#999] hover:text-black text-xs transition-all duration-300"
        style={{ right: rightSidebarCollapsed ? '4px' : '284px' }}
      >
        {rightSidebarCollapsed ? '◀' : '▶'}
      </button>

      {/* Right Sidebar */}
      <div
        className="border-l border-[#E5E5E5] flex flex-col overflow-y-auto transition-all duration-300 flex-shrink-0"
        style={{ width: rightSidebarCollapsed ? '0px' : '280px', opacity: rightSidebarCollapsed ? 0 : 1, overflow: rightSidebarCollapsed ? 'hidden' : 'auto' }}
      >
        {/* Entities Section */}
        <div className="border-b border-[#E5E5E5]">
          <button
            onClick={() => setEntitiesCollapsed(!entitiesCollapsed)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
          >
            <span className="font-medium text-black text-sm">Entities ({entities.length})</span>
            <span className={`text-[#999] text-xs transform transition-transform duration-200 ${entitiesCollapsed ? '-rotate-90' : ''}`}>▼</span>
          </button>
          {!entitiesCollapsed && (
            <div>
              <div className="px-4 pb-2">
                <input
                  type="text"
                  placeholder="Search entities..."
                  value={entitySearch}
                  onChange={(e) => setEntitySearch(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#E5E5E5] rounded text-xs focus:outline-none focus:border-[#0033CC] text-black placeholder-[#999]"
                />
              </div>
              <div className="max-h-64 overflow-y-auto pb-2">
                {sortedTypes.map(([type, typeEntities]) => {
                  const filtered = entitySearch
                    ? typeEntities.filter(e => e.name.toLowerCase().includes(entitySearch.toLowerCase()))
                    : typeEntities
                  if (entitySearch && filtered.length === 0) return null
                  const isCollapsed = collapsedTypes[type]
                  return (
                    <div key={type}>
                      <button
                        onClick={() => toggleType(type)}
                        className="w-full px-4 py-1.5 flex items-center justify-between hover:bg-gray-50 text-left"
                      >
                        <span className="text-[11px] font-semibold text-[#666] uppercase tracking-wide">
                          {type} ({filtered.length})
                        </span>
                        <span className={`text-[#CCC] text-[10px] transform transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>▼</span>
                      </button>
                      {!isCollapsed && filtered.map(entity => (
                        <div key={entity.id} className="px-4 py-1 hover:bg-gray-50 cursor-pointer">
                          <span className="text-xs text-black">{entity.name}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Insights Section */}
        <div className="border-b border-[#E5E5E5]">
          <button
            onClick={() => setInsightsCollapsed(!insightsCollapsed)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
          >
            <span className="font-medium text-black text-sm">Insights ({insights.length})</span>
            <span className={`text-[#999] text-xs transform transition-transform duration-200 ${insightsCollapsed ? '-rotate-90' : ''}`}>▼</span>
          </button>
          {!insightsCollapsed && (
            <div className="max-h-64 overflow-y-auto pb-2">
              {insights.map(insight => {
                const text = getInsightText(insight)
                const isLong = text.length > 120
                const isExpanded = expandedInsights[insight.id]
                return (
                  <div key={insight.id} className={`mx-3 mb-2 p-2.5 rounded-md text-xs ${getSeverityColor(insight.severity)}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${getSeverityBadge(insight.severity)}`}>
                        {insight.severity}
                      </span>
                      {insight.type && (
                        <span className="text-[10px] opacity-70">{insight.type}</span>
                      )}
                    </div>
                    <div className="leading-relaxed">
                      {isLong && !isExpanded ? text.slice(0, 120) + '...' : text}
                    </div>
                    {isLong && (
                      <button
                        onClick={() => setExpandedInsights(prev => ({ ...prev, [insight.id]: !isExpanded }))}
                        className="mt-1 text-[10px] font-medium opacity-70 hover:opacity-100"
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Territories Section */}
        <div className="border-b border-[#E5E5E5]">
          <button
            onClick={() => setTerritoriesCollapsed(!territoriesCollapsed)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
          >
            <span className="font-medium text-black text-sm">Territories ({territories.length})</span>
            <span className={`text-[#999] text-xs transform transition-transform duration-200 ${territoriesCollapsed ? '-rotate-90' : ''}`}>▼</span>
          </button>
          {!territoriesCollapsed && (
            <div className="max-h-64 overflow-y-auto pb-2">
              {knownTerritories.length > 0 && (
                <div className="px-4 py-1">
                  <div className="text-[10px] font-semibold text-[#0033CC] uppercase tracking-wide mb-1">Known ({knownTerritories.length})</div>
                  {knownTerritories.map(t => (
                    <div key={t.id} className="py-1 flex items-center justify-between">
                      <span className="text-xs text-black">{t.name}</span>
                      <span className="text-[10px] text-[#666]">{t.entities?.length || t.entityCount || 0}</span>
                    </div>
                  ))}
                </div>
              )}
              {frontierTerritories.length > 0 && (
                <div className="px-4 py-1 mt-1 border-t border-[#E5E5E5]">
                  <div className="text-[10px] font-semibold text-[#999] uppercase tracking-wide mb-1 mt-2">Frontier ({frontierTerritories.length})</div>
                  {frontierTerritories.map(t => (
                    <div key={t.id} className="py-1">
                      <span className="text-xs text-[#999]">{t.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
