'use client'

import { useState, useEffect, useRef } from 'react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  referencedEntityIds: string[]
  createdAt: string
}

interface ChatViewProps {
  projectId: string
  onClose: () => void
}

export default function ChatView({ projectId, onClose }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchChatHistory()
    // Focus input when panel opens
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [projectId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchChatHistory = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/chat`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Add user message immediately
    const tempUserMessage: ChatMessage = {
      id: 'temp-user',
      role: 'user',
      content: userMessage,
      referencedEntityIds: [],
      createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMessage])

    try {
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Remove temp message and fetch updated history
        await fetchChatHistory()
      } else {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      console.error('Chat error:', error)
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: 'error',
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        referencedEntityIds: [],
        createdAt: new Date().toISOString()
      }
      
      setMessages(prev => [...prev.filter(m => m.id !== 'temp-user'), errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed bottom-6 right-6 w-[400px] h-[500px] bg-white border border-[#CCCCCC] rounded-lg flex flex-col z-50 shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-[#CCCCCC]">
        <h3 className="text-black text-sm font-semibold tracking-wide">
          💬 SYSTEM CHAT
        </h3>
        <button
          onClick={onClose}
          className="text-[#666666] hover:text-black text-lg"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[#0033CC] text-sm font-medium">Loading chat...</div>
          </div>
        ) : (
          <>
            {messages.length === 0 && (
              <div className="text-center text-[#666666] py-8">
                <div className="mb-2">👋</div>
                <div className="text-sm leading-relaxed">
                  Hello! I can answer questions about your knowledge graph.
                  <br />
                  What would you like to know?
                </div>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div key={message.id || index} className={`mb-4 ${message.role}`}>
                <div className={`inline-block max-w-[85%] ${
                  message.role === 'user' 
                    ? 'ml-auto bg-[#0033CC] text-white rounded-lg rounded-br-sm' 
                    : 'bg-[#F5F5F5] text-black rounded-lg rounded-bl-sm border border-[#CCCCCC]'
                }`}>
                  <div className="px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
                  <div className={`px-3 pb-1 text-xs ${
                    message.role === 'user' 
                      ? 'text-right text-white/70' 
                      : 'text-left text-[#666666]'
                  }`}>
                    {formatTime(message.createdAt)}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="mb-4">
                <div className="inline-block bg-[#F5F5F5] text-black rounded-lg rounded-bl-sm border border-[#CCCCCC] px-3 py-2">
                  <div className="text-sm text-[#666666]">
                    Thinking...
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#CCCCCC]">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about the data..."
            className="flex-1 bg-white border border-[#CCCCCC] rounded-full px-4 py-2 text-sm text-black placeholder-[#666666] focus:border-[#0033CC] focus:outline-none focus:ring-2 focus:ring-[#0033CC]/20"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-[#0033CC] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#0029A3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <div className="text-xs text-[#666666] mt-2 text-center">
          Press Enter to send • Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}