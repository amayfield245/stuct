'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import GraphView from '@/components/GraphView'
import HexMapView from '@/components/HexMapView'
import AgentTreeView from '@/components/AgentTreeView'
import ChatView from '@/components/ChatView'
import UploadPanel from '@/components/UploadPanel'

interface Project {
  id: string
  name: string
  description: string | null
  counts: {
    entities: number
    documents: number
    edges: number
    agents: number
    insights: number
    territories: number
    chatMessages: number
  }
}

type ViewType = 'graph' | 'map' | 'agents' | 'chat'

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [activeView, setActiveView] = useState<ViewType>('graph')
  const [showUpload, setShowUpload] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data)
      }
    } catch (error) {
      console.error('Failed to fetch project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUploadSuccess = () => {
    fetchProject()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-[#0033CC] font-medium">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-red-600 font-medium">Project not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#CCCCCC] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black tracking-wide">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-[#666666] mt-1">{project.description}</p>
            )}
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="flex gap-4">
              <div className="bg-[#F5F5F5] px-4 py-2 rounded border border-[#CCCCCC]">
                <span className="text-[#0033CC] font-semibold">{project.counts.entities}</span>
                <span className="text-[#666666] text-sm ml-1">entities</span>
              </div>
              <div className="bg-[#F5F5F5] px-4 py-2 rounded border border-[#CCCCCC]">
                <span className="text-[#0033CC] font-semibold">{project.counts.edges}</span>
                <span className="text-[#666666] text-sm ml-1">relations</span>
              </div>
              <div className="bg-[#F5F5F5] px-4 py-2 rounded border border-[#CCCCCC]">
                <span className="text-[#0033CC] font-semibold">{project.counts.agents}</span>
                <span className="text-[#666666] text-sm ml-1">agents</span>
              </div>
              <div className="bg-[#F5F5F5] px-4 py-2 rounded border border-[#CCCCCC]">
                <span className="text-[#0033CC] font-semibold">{project.counts.documents}</span>
                <span className="text-[#666666] text-sm ml-1">docs</span>
              </div>
              <div className="bg-[#F5F5F5] px-4 py-2 rounded border border-[#CCCCCC]">
                <span className="text-[#0033CC] font-semibold">{project.counts.insights}</span>
                <span className="text-[#666666] text-sm ml-1">insights</span>
              </div>
            </div>
            <Link
              href="/"
              className="px-4 py-2 rounded border border-[#CCCCCC] bg-white text-[#666666] hover:text-[#0033CC] hover:border-[#0033CC] transition-colors font-semibold text-sm tracking-wide"
              title="Return to home"
            >
              HOME
            </Link>
            <Link 
              href={`/settings?project=${project.id}`}
              className="text-[#666666] hover:text-[#0033CC] text-2xl transition-colors ml-4"
              title="Project Settings"
            >
              ⚙️
            </Link>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-[#CCCCCC]">
        <div className="flex">
          {[
            { key: 'graph', label: 'GRAPH VIEW' },
            { key: 'map', label: 'GAME VIEW' },
            { key: 'agents', label: 'GEN-TIC VIEW' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveView(key as ViewType)}
              className={`px-7 py-3 font-semibold text-sm tracking-wide border-b-2 transition-all ${
                activeView === key
                  ? 'text-[#0033CC] border-[#0033CC] bg-[#E6F0FF]'
                  : 'text-[#666666] border-transparent hover:text-black hover:bg-[#F5F5F5]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        {activeView === 'graph' && <GraphView projectId={projectId} />}
        {activeView === 'map' && <HexMapView projectId={projectId} />}
        {activeView === 'agents' && <AgentTreeView projectId={projectId} />}
      </div>

      {/* Upload FAB */}
      <button
        onClick={() => setShowUpload(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#0033CC] text-white rounded-full font-bold text-xl hover:bg-[#0029A3] transition-all z-40 shadow-lg"
        title="Upload Documents"
      >
        📄
      </button>

      {/* Chat Toggle */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-24 right-6 w-12 h-12 bg-white text-[#0033CC] rounded-full border-2 border-[#0033CC] hover:bg-[#E6F0FF] transition-all z-40 shadow-lg"
        title="Chat"
      >
        💬
      </button>

      {/* Panels */}
      {showUpload && (
        <UploadPanel
          projectId={projectId}
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {showChat && (
        <ChatView
          projectId={projectId}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  )
}