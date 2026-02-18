'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Settings {
  id: string
  projectId: string
  aiProvider: string
  claudeApiKey?: string
  ollamaUrl: string
  ollamaModel: string
  autoExtract: boolean
  extractionDepth: string
}

interface Project {
  id: string
  name: string
}

function SettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const projectId = searchParams.get('project')
  
  const [project, setProject] = useState<Project | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<{
    status: 'connected' | 'disconnected' | 'testing' | null
    message?: string
  }>({ status: null })

  // Form state
  const [aiProvider, setAiProvider] = useState('claude')
  const [claudeApiKey, setClaudeApiKey] = useState('')
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [ollamaModel, setOllamaModel] = useState('llama3')
  const [autoExtract, setAutoExtract] = useState(true)
  const [extractionDepth, setExtractionDepth] = useState('deep')

  useEffect(() => {
    if (projectId) {
      fetchProjectAndSettings()
    } else {
      // Global settings (no specific project)
      setIsLoading(false)
    }
  }, [projectId])

  const fetchProjectAndSettings = async () => {
    try {
      // Fetch project info
      const projectResponse = await fetch(`/api/projects/${projectId}`)
      if (projectResponse.ok) {
        const projectData = await projectResponse.json()
        setProject(projectData)
      }

      // Fetch settings
      const settingsResponse = await fetch(`/api/projects/${projectId}/settings`)
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        setSettings(settingsData)
        
        // Update form state
        setAiProvider(settingsData.aiProvider)
        setClaudeApiKey(settingsData.claudeApiKey || '')
        setOllamaUrl(settingsData.ollamaUrl)
        setOllamaModel(settingsData.ollamaModel)
        setAutoExtract(settingsData.autoExtract)
        setExtractionDepth(settingsData.extractionDepth)
      }
    } catch (error) {
      console.error('Failed to fetch project or settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!projectId) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiProvider,
          claudeApiKey: claudeApiKey || null,
          ollamaUrl,
          ollamaModel,
          autoExtract,
          extractionDepth
        })
      })

      if (response.ok) {
        const updatedSettings = await response.json()
        setSettings(updatedSettings)
        // Show success feedback
        setConnectionStatus({ status: null })
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = async () => {
    if (!projectId) return

    setIsTestingConnection(true)
    setConnectionStatus({ status: 'testing' })

    try {
      const response = await fetch(`/api/projects/${projectId}/settings/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiProvider,
          claudeApiKey: claudeApiKey || null,
          ollamaUrl,
          ollamaModel
        })
      })

      const result = await response.json()

      if (response.ok) {
        setConnectionStatus({
          status: 'connected',
          message: result.message || 'Connection successful'
        })
      } else {
        setConnectionStatus({
          status: 'disconnected',
          message: result.error || 'Connection failed'
        })
      }
    } catch (error) {
      setConnectionStatus({
        status: 'disconnected',
        message: 'Connection test failed'
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-[#0033CC] font-medium">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-[#CCCCCC] p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href={projectId ? `/project/${projectId}` : '/'}
              className="text-[#666666] hover:text-[#0033CC] transition-colors font-medium"
            >
              ← Back
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-black tracking-wide">
                SETTINGS
              </h1>
              <p className="text-[#666666] mt-1">
                {project ? `Configure settings for ${project.name}` : 'Global settings'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded border border-[#CCCCCC] bg-white text-[#666666] hover:text-[#0033CC] hover:border-[#0033CC] transition-colors font-semibold text-sm tracking-wide"
              title="Return to home"
            >
              HOME
            </Link>
            <div className="text-2xl">⚙️</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        <div className="space-y-8">
          
          {/* AI Provider Section */}
          <section className="bg-white border border-[#CCCCCC] rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-black mb-6 flex items-center gap-3">
              🤖 AI Provider
              {connectionStatus.status && (
                <div className="flex items-center gap-2 text-sm">
                  {connectionStatus.status === 'connected' && (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-600">Connected</span>
                    </>
                  )}
                  {connectionStatus.status === 'disconnected' && (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-600">Disconnected</span>
                    </>
                  )}
                  {connectionStatus.status === 'testing' && (
                    <>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-yellow-600">Testing...</span>
                    </>
                  )}
                </div>
              )}
            </h2>

            {/* Provider Selection */}
            <div className="space-y-4 mb-6">
              <label className="block text-[#666666] text-sm mb-3 font-semibold">SELECT AI PROVIDER</label>
              <div className="space-y-3">
                {[
                  { value: 'claude', label: 'Claude (Anthropic)', desc: 'Advanced AI models for high-quality extraction' },
                  { value: 'ollama', label: 'Local Model (Ollama)', desc: 'Run models locally for privacy and control' },
                  { value: 'none', label: 'None (manual only)', desc: 'Manual data entry without AI assistance' }
                ].map((option) => (
                  <div key={option.value} className="flex items-start gap-3 p-3 border border-[#CCCCCC] rounded-lg hover:bg-[#F5F5F5] transition-colors">
                    <input
                      type="radio"
                      id={option.value}
                      name="aiProvider"
                      value={option.value}
                      checked={aiProvider === option.value}
                      onChange={(e) => setAiProvider(e.target.value)}
                      className="mt-1 w-4 h-4 text-[#0033CC] border-[#CCCCCC] focus:ring-[#0033CC]"
                    />
                    <label htmlFor={option.value} className="flex-1 cursor-pointer">
                      <div className="text-black font-medium">{option.label}</div>
                      <div className="text-[#666666] text-sm">{option.desc}</div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Claude Configuration */}
            {aiProvider === 'claude' && (
              <div className="space-y-4 border-t border-[#CCCCCC] pt-6">
                <div>
                  <label className="block text-[#666666] text-sm mb-2 font-medium">CLAUDE API KEY</label>
                  <div className="flex gap-3">
                    <input
                      type="password"
                      value={claudeApiKey}
                      onChange={(e) => setClaudeApiKey(e.target.value)}
                      className="flex-1 bg-white border border-[#CCCCCC] rounded px-3 py-2 text-black focus:border-[#0033CC] focus:outline-none focus:ring-2 focus:ring-[#0033CC]/20"
                      placeholder="sk-ant-api03-..."
                    />
                    <button
                      onClick={handleTestConnection}
                      disabled={isTestingConnection || !claudeApiKey}
                      className="bg-[#0033CC] text-white px-4 py-2 rounded font-semibold hover:bg-[#0029A3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTestingConnection ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                  {connectionStatus.message && (
                    <p className={`text-sm mt-2 ${connectionStatus.status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                      {connectionStatus.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Ollama Configuration */}
            {aiProvider === 'ollama' && (
              <div className="space-y-4 border-t border-[#CCCCCC] pt-6">
                <div>
                  <label className="block text-[#666666] text-sm mb-2 font-medium">OLLAMA URL</label>
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    className="w-full bg-white border border-[#CCCCCC] rounded px-3 py-2 text-black focus:border-[#0033CC] focus:outline-none focus:ring-2 focus:ring-[#0033CC]/20"
                    placeholder="http://localhost:11434"
                  />
                </div>
                <div>
                  <label className="block text-[#666666] text-sm mb-2 font-medium">MODEL NAME</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      className="flex-1 bg-white border border-[#CCCCCC] rounded px-3 py-2 text-black focus:border-[#0033CC] focus:outline-none focus:ring-2 focus:ring-[#0033CC]/20"
                      placeholder="llama3"
                    />
                    <button
                      onClick={handleTestConnection}
                      disabled={isTestingConnection || !ollamaUrl}
                      className="bg-[#0033CC] text-white px-4 py-2 rounded font-semibold hover:bg-[#0029A3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTestingConnection ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                  {connectionStatus.message && (
                    <p className={`text-sm mt-2 ${connectionStatus.status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                      {connectionStatus.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* None Configuration */}
            {aiProvider === 'none' && (
              <div className="border-t border-[#CCCCCC] pt-6">
                <div className="bg-[#FFF3CD] border border-[#F0D500] rounded p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">⚠️</div>
                    <div>
                      <div className="text-black font-medium">Manual Mode</div>
                      <div className="text-[#666600] text-sm">
                        AI extraction is disabled. You'll need to manually create entities and relationships.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Extraction Settings Section */}
          {aiProvider !== 'none' && (
            <section className="bg-white border border-[#CCCCCC] rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-black mb-6 flex items-center gap-3">
                📊 Extraction Settings
              </h2>

              <div className="space-y-6">
                {/* Auto-extract toggle */}
                <div className="flex items-center justify-between p-4 border border-[#CCCCCC] rounded-lg">
                  <div>
                    <div className="text-black font-medium">Auto-extract on upload</div>
                    <div className="text-[#666666] text-sm">
                      Automatically extract entities and relationships when documents are uploaded
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoExtract}
                      onChange={(e) => setAutoExtract(e.target.checked)}
                      aria-label="Auto extract on upload"
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      autoExtract ? 'bg-[#0033CC]' : 'bg-[#CCCCCC]'
                    }`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        autoExtract ? 'translate-x-6' : 'translate-x-1'
                      } mt-1 shadow-sm`}></div>
                    </div>
                  </label>
                </div>

                {/* Extraction depth */}
                <div>
                  <label className="block text-[#666666] text-sm mb-3 font-semibold">EXTRACTION DEPTH</label>
                  <div className="space-y-3">
                    {[
                      { value: 'quick', label: 'Quick scan', desc: 'Faster processing with basic models' },
                      { value: 'deep', label: 'Deep analysis', desc: 'Thorough analysis with advanced models' }
                    ].map((option) => (
                      <div key={option.value} className="flex items-start gap-3 p-3 border border-[#CCCCCC] rounded-lg hover:bg-[#F5F5F5] transition-colors">
                        <input
                          type="radio"
                          id={option.value}
                          name="extractionDepth"
                          value={option.value}
                          checked={extractionDepth === option.value}
                          onChange={(e) => setExtractionDepth(e.target.value)}
                          className="mt-1 w-4 h-4 text-[#0033CC] border-[#CCCCCC] focus:ring-[#0033CC]"
                        />
                        <label htmlFor={option.value} className="flex-1 cursor-pointer">
                          <div className="text-black font-medium">{option.label}</div>
                          <div className="text-[#666666] text-sm">{option.desc}</div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Save Button */}
        {projectId && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#0033CC] text-white px-8 py-3 rounded-md font-semibold hover:bg-[#0029A3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-[#0033CC] font-medium">Loading settings...</div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}