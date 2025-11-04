"use client"

import type React from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"

import { useAuth } from "@/contexts/auth-context"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Loader2, MapPin, Plus } from "lucide-react"
import type { ChatMessage } from "@/lib/types"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { getRecommendations, type RecommendationResult } from "@/app/chat/actions"
import { Badge } from "@/components/ui/badge"
import { ChatRestaurantCard } from "@/components/chat-restaurant-card"

// Sample suggestions for quick prompts
const suggestionCategories = {
  initial: [
    "Italian restaurant in SoHo",
    "Vegan food in Brooklyn",
    "Business lunch in Midtown"
  ],
  afterRecommendation: [
    "Something more casual",
    "A cheaper option",
    "Similar but in a different neighborhood"
  ],
  afterNoResults: [
    "Italian restaurants anywhere",
    "Casual dining options",
    "Places good for groups"
  ]
};

// Function to determine which suggestions to show
const getCurrentSuggestions = (messages: ChatMessage[]) => {
  // If no messages yet or just the greeting, show initial suggestions
  if (messages.length <= 1) return suggestionCategories.initial;
  
  // Get the last assistant message
  const lastAssistantMsg = [...messages].reverse()
    .find(m => m.role === "assistant");
  
  // Check the content to determine context
  if (lastAssistantMsg?.content.includes("couldn't find")) {
    return suggestionCategories.afterNoResults;
  } else if (lastAssistantMsg?.content.includes("top picks") || 
             lastAssistantMsg?.content.includes("alternatives") ||
             lastAssistantMsg?.content.includes("Would you like more details")) {
    return suggestionCategories.afterRecommendation;
  }
  
  // Default to initial suggestions
  return suggestionCategories.initial;
};

// Helper function to format a recommendation message using Markdown
function formatRecommendationMessage(rec: RecommendationResult): string {
  return `**${rec.name}** (${rec.cuisine_type} in ${rec.neighborhood})${
    rec.price_range ? ` - ${Array(rec.price_range).fill("$").join("")}` : ""
  }\n*Reason:* ${rec.reason}`
}

export default function ChatPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hey there, I'm REX—your brutally honest NYC restaurant guide who's eaten at more places than you have Instagram followers. Tell me what you're craving, what mood you're in, and where you want to eat. And please, be more specific than 'I'm hungry' because...obviously. 🙄",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [initialQueryProcessed, setInitialQueryProcessed] = useState(false)
  const [followUpCount, setFollowUpCount] = useState(0);
  const [currentRecommendations, setCurrentRecommendations] = useState<RecommendationResult[]>([])
  const [lastPreferences, setLastPreferences] = useState<any>(null) // Store last search preferences
  const [resultOffset, setResultOffset] = useState(0) // Track offset for pagination
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Process initial query from home page if it exists
  useEffect(() => {
    const processInitialQuery = async () => {
      if (typeof window !== "undefined" && !initialQueryProcessed && user) {
        const initialQuery = sessionStorage.getItem("initialChatQuery")
        if (initialQuery) {
          setInitialQueryProcessed(true)
          sessionStorage.removeItem("initialChatQuery")

          const currentMessages: ChatMessage[] = [...messages, { role: "user", content: initialQuery }];
          setMessages(currentMessages);
          setIsLoading(true)

          try {
            setMessages((prev) => [...prev, { role: "assistant", content: "Hold on, let me work my magic..." }])

            const historyForBackend = currentMessages.map(m => ({ 
              role: (m.role === "assistant" ? "model" : m.role) as "user" | "model", 
              parts: m.content 
            }));
            const relevantHistory = historyForBackend.slice(0, -2);

            const result = await getRecommendations(initialQuery, user.id, relevantHistory, followUpCount, undefined, 0)
            setMessages((prev) => prev.slice(0, -1))

            // Store preferences if we got any
            if (result.extractedPreferences) {
              setLastPreferences(result.extractedPreferences)
              setResultOffset(10) // Next "more options" will start from index 10
            }

            if (result.followUpQuestion && typeof result.followUpQuestion === 'string') {
              setMessages((prev) => [...prev, { role: "assistant", content: result.followUpQuestion! }])
              setFollowUpCount(prevCount => prevCount + 1);
            } else if (result.recommendations.length > 0) {
              setFollowUpCount(0);
              setCurrentRecommendations(result.recommendations);
              if (result.recommendations[0].reason.includes("couldn't find an exact match")) {
                setMessages((prev) => [
                  ...prev,
                  { 
                    role: "assistant", 
                    content: "I couldn't find exact matches, but you might like these alternatives:" 
                  },
                ])
              } else {
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: "Alright, alright, here's what I found for you:" },
                ])
              }
              
              setTimeout(() => {
                setMessages(prev => [
                  ...prev,
                  { 
                    role: "assistant", 
                    content: "More details, or different suggestions?"
                  }
                ]);
              }, 1500);
            } else {
              setFollowUpCount(0);
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: "Well this is awkward... I got nothing for that combo. Either your standards are too high or your search is too vague. Wanna try again with different criteria?",
                },
              ])
            }
          } catch (error) {
            console.error("Error getting recommendations:", error)
            setMessages((prev) => {
              const newMessages = [...prev]
              if (newMessages[newMessages.length - 1]?.content === "Hold on, let me work my magic...") {
                newMessages.pop()
              }
              return [
                ...newMessages,
                {
                  role: "assistant",
                  content: "Oof, something broke on my end. Even I'm not perfect. 😤 Give it another shot in a sec?",
                },
              ]
            })
            toast({
              title: "Error",
              description: "Failed to get recommendations. Please try again.",
              variant: "destructive",
            })
          } finally {
            setIsLoading(false)
          }
        }
      }
    }

    processInitialQuery()
  }, [user, initialQueryProcessed, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !user) return

    const userMessage = input.trim()
    setInput("")
    
    // Check if user is asking for more options
    const isAskingForMore = 
      userMessage.toLowerCase().includes("more option") || 
      userMessage.toLowerCase().includes("more detail") ||
      userMessage.toLowerCase().includes("show me more") ||
      userMessage.toLowerCase().includes("what else") ||
      userMessage.toLowerCase().includes("other option") ||
      userMessage.toLowerCase().includes("more suggestion") ||
      userMessage.toLowerCase().includes("something else");

    // Don't clear recommendations if asking for more
    if (!isAskingForMore) {
      setCurrentRecommendations([]) // Clear previous recommendations
      setResultOffset(0) // Reset offset for new search
    }

    const updatedMessages: ChatMessage[] = [...messages, { role: "user", content: userMessage }];
    setMessages(updatedMessages);
    setIsLoading(true)

    try {
      setMessages((prev) => [...prev, { role: "assistant", content: "Hold on, let me work my magic..." }])

      const historyForBackend = updatedMessages.map(m => ({ 
        role: (m.role === "assistant" ? "model" : m.role) as "user" | "model",
        parts: m.content 
      }));
      const relevantHistory = historyForBackend.slice(0, -2);

      // Pass stored preferences and offset if asking for more options
      const prefsToUse = isAskingForMore ? lastPreferences : undefined;
      const offsetToUse = isAskingForMore ? resultOffset : 0;

      const result = await getRecommendations(userMessage, user.id, relevantHistory, followUpCount, prefsToUse, offsetToUse)
      setMessages((prev) => prev.slice(0, -1))

      // Store/update preferences if we got any
      if (result.extractedPreferences) {
        setLastPreferences(result.extractedPreferences)
        if (result.recommendations.length > 0) {
          // Increment offset for next "more options" request
          setResultOffset(prev => isAskingForMore ? prev + 10 : 10)
        }
      }

      if (result.followUpQuestion && typeof result.followUpQuestion === 'string') {
        setMessages((prev) => [...prev, { role: "assistant", content: result.followUpQuestion! }])
        setFollowUpCount(prevCount => prevCount + 1);
      } else if (result.recommendations.length > 0) {
        setFollowUpCount(0);
        setCurrentRecommendations(result.recommendations);
        if (result.recommendations[0].reason.includes("couldn't find an exact match")) {
          setMessages((prev) => [
            ...prev,
            { 
              role: "assistant", 
              content: "I couldn't find exact matches, but you might like these alternatives:" 
            },
          ])
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Alright, alright, here's what I found for you:" },
          ])
        }
        
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            { 
              role: "assistant", 
              content: "More details, or different suggestions?"
            }
          ]);
        }, 1500);
      } else {
        setFollowUpCount(0);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Well this is awkward... I got nothing for that combo. Either your standards are too high or your search is too vague. Wanna try again with different criteria?",
          },
        ])
      }
    } catch (error) {
      console.error("Error getting recommendations:", error)
      setMessages((prev) => {
        const newMessages = [...prev]
        if (newMessages[newMessages.length - 1]?.content === "Hold on, let me work my magic...") {
          newMessages.pop()
        }
        return [
          ...newMessages,
          {
            role: "assistant",
            content: "Oof, something broke on my end. Even I'm not perfect. 😤 Give it another shot in a sec?",
          },
        ]
      })
      toast({
        title: "Error",
        description: "Failed to get recommendations. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212]">
        <Loader2 className="h-8 w-8 animate-spin text-[#e53935]" />
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full bg-[#121212] flex flex-col overflow-hidden">
      {/* Subtle red gradient overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="h-full w-full bg-gradient-to-b from-transparent via-[#e53935] to-transparent" />
      </div>

      {/* Header */}
      <div className="relative bg-[#e53935] border-b-4 border-[beige] flex items-center gap-3 h-[68px] px-4 z-10">
        {/* REX Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-[beige] border-2 border-black w-10 h-10 flex items-center justify-center">
            <span className="text-[#e53935] font-bold text-sm">REX</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-[beige] text-base font-normal" style={{ textShadow: '0px 0px 16px #f5f5dc' }}>
              REX
            </h1>
            <p className="text-black text-xs font-normal">
              ⚡ ONLINE • NYC DINING ⚡
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="relative flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start items-start gap-2"} animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out`}
          >
            {/* REX Avatar for assistant messages */}
            {message.role === "assistant" && (
              <div className="flex-shrink-0 mt-8">
                <div className="bg-[beige] border-2 border-black w-8 h-8 flex items-center justify-center">
                  <span className="text-[#e53935] font-normal text-xs">R</span>
                </div>
              </div>
            )}
            
            <div className={`flex flex-col gap-1 ${message.role === "user" ? "items-end" : "items-start"} max-w-[75%]`}>
              {/* Message Bubble */}
              <div
                className={`${
                  message.role === "user" 
                    ? "bg-[#e53935] border-4 border-[beige] text-white" 
                    : "bg-[beige] border-4 border-black text-[#121212]"
                } px-5 py-4`}
              >
                {message.content === "..." ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">REX is thinking...</span>
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed">
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => <p className="my-1" {...props} />,
                        a: ({ node, ...props }) => (
                          <Link
                            href={props.href || "#"}
                            {...props}
                            className={`${message.role === "user" ? "text-[beige] underline" : "text-[#e53935] underline"} font-medium`}
                          />
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              
              {/* Timestamp */}
              <p className={`text-[beige] text-xs px-2 ${message.role === "user" ? "text-right" : "text-left"}`}>
                {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        
        {/* Display restaurant recommendations as cards */}
        {currentRecommendations.length > 0 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
            <div className="space-y-3">
              {currentRecommendations.map((restaurant) => (
                <ChatRestaurantCard 
                  key={restaurant.id} 
                  restaurant={restaurant} 
                  showActions={true}
                />
              ))}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions Row */}
      <div className="relative bg-[#121212] px-4 py-3 border-t-4 border-[beige]/10">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {getCurrentSuggestions(messages).map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="bg-[beige] border-4 border-[#e53935] px-5 py-3 text-[#121212] text-base font-normal whitespace-nowrap hover:bg-[beige]/90 transition-colors flex-shrink-0"
            >
              ★ {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="relative bg-[#e53935] border-t-4 border-[beige] px-4 py-4">
        <div className="flex items-center gap-3">
          {/* Plus Button */}
          <button className="bg-[beige] border-2 border-black w-11 h-11 flex items-center justify-center hover:bg-[beige]/90 transition-colors flex-shrink-0">
            <Plus className="w-5 h-5 text-black" />
          </button>

          {/* Input Container */}
          <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
            <div className="flex-1 bg-[#121212] border-4 border-[beige] px-5 py-3 flex items-center gap-2" style={{ boxShadow: '0px 0px 20px 0px inset rgba(245, 245, 220, 0.2)' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ASK REX..."
                className="flex-1 bg-transparent text-base text-white placeholder:text-[rgba(245,245,220,0.5)] outline-none border-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
              <button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className="bg-[beige] border-2 border-black w-8 h-8 flex items-center justify-center hover:bg-[beige]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-[#e53935] animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-black" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
