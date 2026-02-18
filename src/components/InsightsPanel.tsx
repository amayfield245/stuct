'use client'

import { useEffect, useState } from 'react'

interface Insight {
  id: string
  type: string
  severity: 'critical' | 'warning' | 'info'
  text: string
  relatedEntityIds: string[]
  acknowledged: boolean
  createdAt: string
}

interface InsightsData {
  insights: Insight[]
  grouped: {
    critical: Insight[]
    warning: Insight[]
    info: Insight[]
  }
  counts: {
    total: number
    critical: number
    warning: number
    info: number
    unacknowledged: number
  }
}

interface InsightsPanelProps {
  projectId: string
}

export default function InsightsPanel({ projectId }: InsightsPanelProps) {
  const [data, setData] = useState<InsightsData | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchInsights()
  }, [projectId])

  const fetchInsights = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/insights`)
      if (response.ok) {
        const insights = await response.json()
        setData(insights)
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#DC2626' // Red for critical
      case 'warning': return '#D97706' // Orange for warning  
      case 'info': return '#0033CC' // Blue accent for info
      default: return '#666666'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '⚠'
      case 'warning': return '⚡'
      case 'info': return 'ℹ'
      default: return '·'
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="absolute top-4 right-4 w-80 z-10">
        <div className="bg-white border border-[#CCCCCC] rounded-lg p-4 shadow-sm">
          <div className="text-[#0033CC] text-sm font-medium">Loading insights...</div>
        </div>
      </div>
    )
  }

  if (!data || data.insights.length === 0) {
    return null // Don't show panel if no insights
  }

  // Show only the most important insights in collapsed mode
  const displayInsights = isExpanded 
    ? data.insights 
    : data.insights.slice(0, 3)

  return (
    <div className="absolute top-4 right-4 w-80 z-10">
      <div className="bg-white border border-[#CCCCCC] rounded-lg overflow-hidden shadow-sm">
        {/* Header */}
        <div 
          className="p-4 cursor-pointer hover:bg-[#F5F5F5] transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex justify-between items-center">
            <h3 className="text-[#666666] text-xs font-semibold tracking-wide">
              INSIGHTS ({data.counts.total})
            </h3>
            <div className="flex items-center gap-3">
              {/* Severity counts */}
              {data.counts.critical > 0 && (
                <span className="flex items-center gap-1 text-xs">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getSeverityColor('critical') }}
                  />
                  <span className="text-[#333333] font-medium">{data.counts.critical}</span>
                </span>
              )}
              {data.counts.warning > 0 && (
                <span className="flex items-center gap-1 text-xs">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getSeverityColor('warning') }}
                  />
                  <span className="text-[#333333] font-medium">{data.counts.warning}</span>
                </span>
              )}
              {data.counts.info > 0 && (
                <span className="flex items-center gap-1 text-xs">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getSeverityColor('info') }}
                  />
                  <span className="text-[#333333] font-medium">{data.counts.info}</span>
                </span>
              )}
              
              <span className="text-[#666666] text-xs">
                {isExpanded ? '▲' : '▼'}
              </span>
            </div>
          </div>
        </div>

        {/* Insights List */}
        <div className={`${isExpanded ? 'max-h-96 overflow-y-auto' : ''}`}>
          {displayInsights.map((insight) => (
            <div 
              key={insight.id}
              className="p-4 border-t border-[#CCCCCC] first:border-t-0"
              style={{ borderLeftColor: getSeverityColor(insight.severity), borderLeftWidth: '3px' }}
            >
              <div className="flex items-start gap-2">
                <span 
                  className="text-sm mt-0.5"
                  style={{ color: getSeverityColor(insight.severity) }}
                >
                  {getSeverityIcon(insight.severity)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded"
                      style={{ 
                        color: getSeverityColor(insight.severity),
                        backgroundColor: getSeverityColor(insight.severity) + '20'
                      }}
                    >
                      {insight.type}
                    </span>
                    <span className="text-xs text-[#666666]">
                      {formatTime(insight.createdAt)}
                    </span>
                  </div>
                  <p className="text-[#333333] text-sm leading-relaxed">
                    {insight.text}
                  </p>
                  
                  {insight.relatedEntityIds.length > 0 && (
                    <div className="mt-2 text-xs text-[#666666]">
                      Related to {insight.relatedEntityIds.length} entities
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {!isExpanded && data.insights.length > 3 && (
            <div className="p-3 text-center border-t border-[#CCCCCC]">
              <button 
                onClick={() => setIsExpanded(true)}
                className="text-sm text-[#0033CC] hover:text-[#0029A3] transition-colors font-medium"
              >
                View {data.insights.length - 3} more insights
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}