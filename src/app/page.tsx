'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  description: string | null
  createdAt: string
  entityCount: number
  documentCount: number
  agentCount: number
  insightCount: number
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', description: '' })

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      setProjects(data)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProject.name.trim()) return

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      })

      if (response.ok) {
        setNewProject({ name: '', description: '' })
        setShowCreateForm(false)
        fetchProjects()
      }
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-[#0033CC] font-medium">Loading projects...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-[#CCCCCC] p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black tracking-wide">
              THE SYSTEM AGENT
            </h1>
            <p className="text-[#666666] mt-2">
              Knowledge graph extraction and exploration system
            </p>
          </div>
          <Link 
            href="/settings"
            className="text-[#666666] hover:text-[#0033CC] text-2xl transition-colors"
            title="Settings"
          >
            ⚙️
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold text-black">
            Projects ({projects.length})
          </h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-[#0033CC] text-white px-6 py-2 rounded-md font-semibold hover:bg-[#0029A3] transition-colors"
          >
            New Project
          </button>
        </div>

        {/* Create Project Form */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <form
              onSubmit={createProject}
              className="bg-white border border-[#CCCCCC] p-6 rounded-lg w-full max-w-md shadow-lg"
            >
              <h3 className="text-lg font-semibold text-black mb-4">
                Create New Project
              </h3>
              
              <div className="mb-4">
                <label className="block text-[#666666] text-sm font-medium mb-2">
                  PROJECT NAME
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full bg-white border border-[#CCCCCC] rounded px-3 py-2 text-black focus:border-[#0033CC] focus:outline-none focus:ring-2 focus:ring-[#0033CC]/20"
                  placeholder="Enter project name..."
                  autoFocus
                />
              </div>

              <div className="mb-6">
                <label className="block text-[#666666] text-sm font-medium mb-2">
                  DESCRIPTION (OPTIONAL)
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full bg-white border border-[#CCCCCC] rounded px-3 py-2 text-black focus:border-[#0033CC] focus:outline-none focus:ring-2 focus:ring-[#0033CC]/20 resize-none"
                  rows={3}
                  placeholder="Describe the project..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-white border border-[#CCCCCC] text-[#333333] py-2 rounded hover:bg-[#F5F5F5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#0033CC] text-white py-2 rounded font-semibold hover:bg-[#0029A3] transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-[#666666] text-lg mb-4">No projects yet</div>
            <p className="text-[#666666] mb-8">
              Create your first project to start extracting knowledge graphs from documents
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-[#0033CC] text-white px-8 py-3 rounded-md font-semibold hover:bg-[#0029A3] transition-colors"
            >
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/project/${project.id}`}
                className="group"
              >
                <div className="bg-white border border-[#CCCCCC] rounded-lg p-6 hover:border-[#0033CC] hover:shadow-md transition-all cursor-pointer">
                  <h3 className="font-semibold text-black mb-2 group-hover:text-[#0033CC] transition-colors">
                    {project.name}
                  </h3>
                  
                  {project.description && (
                    <p className="text-[#666666] text-sm mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="bg-[#F5F5F5] px-3 py-1 rounded border border-[#CCCCCC]">
                      <span className="text-[#0033CC] font-semibold">{project.entityCount}</span>
                      <span className="text-[#666666]"> entities</span>
                    </span>
                    <span className="bg-[#F5F5F5] px-3 py-1 rounded border border-[#CCCCCC]">
                      <span className="text-[#0033CC] font-semibold">{project.documentCount}</span>
                      <span className="text-[#666666]"> docs</span>
                    </span>
                    <span className="bg-[#F5F5F5] px-3 py-1 rounded border border-[#CCCCCC]">
                      <span className="text-[#0033CC] font-semibold">{project.agentCount}</span>
                      <span className="text-[#666666]"> agents</span>
                    </span>
                    <span className="bg-[#F5F5F5] px-3 py-1 rounded border border-[#CCCCCC]">
                      <span className="text-[#0033CC] font-semibold">{project.insightCount}</span>
                      <span className="text-[#666666]"> insights</span>
                    </span>
                  </div>

                  <div className="mt-4 text-xs text-[#666666]">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}