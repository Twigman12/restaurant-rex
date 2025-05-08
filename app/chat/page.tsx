"use client"

import type React from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"

import { useAuth } from "@/contexts/auth-context"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Loader2, MapPin, ArrowLeft } from "lucide-react"
import type { ChatMessage } from "@/lib/types"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { getRecommendations, type RecommendationResult } from "@/app/chat/actions"
import { Badge } from "@/components/ui/badge"

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
  }\n*Reason:* ${rec.reason}\n[View Details](/restaurants/${rec.id})`
}

export default function ChatPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm REX, your NYC restaurant guide. Tell me what you're looking for! Mention things like cuisine, neighborhood, price range, or occasion (e.g., 'cheap Thai near Union Square' or 'fancy dinner for an anniversary').",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [initialQueryProcessed, setInitialQueryProcessed] = useState(false)
  const [followUpCount, setFollowUpCount] = useState(0);
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
            setMessages((prev) => [...prev, { role: "assistant", content: "Okay, let me look for that..." }])

            const historyForBackend = currentMessages.map(m => ({ 
              role: (m.role === "assistant" ? "model" : m.role) as "user" | "model", 
              parts: m.content 
            }));
            const relevantHistory = historyForBackend.slice(0, -2);

            const result = await getRecommendations(initialQuery, user.id, relevantHistory, followUpCount)
            setMessages((prev) => prev.slice(0, -1))

            if (result.followUpQuestion && typeof result.followUpQuestion === 'string') {
              setMessages((prev) => [...prev, { role: "assistant", content: result.followUpQuestion! }])
              setFollowUpCount(prevCount => prevCount + 1);
            } else if (result.recommendations.length > 0) {
              setFollowUpCount(0);
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
                  { role: "assistant", content: "Based on your preferences, here are my top picks:" },
                ])
              }
              
              result.recommendations.forEach((rec) => {
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: formatRecommendationMessage(rec) },
                ])
              })
              
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
                  content: "Hmm, I couldn't find anything matching that exactly. Could you try broadening your search a bit, maybe focusing on the cuisine or neighborhood?",
                },
              ])
            }
          } catch (error) {
            console.error("Error getting recommendations:", error)
            setMessages((prev) => {
              const newMessages = [...prev]
              if (newMessages[newMessages.length - 1]?.content === "Okay, let me look for that...") {
                newMessages.pop()
              }
              return [
                ...newMessages,
                {
                  role: "assistant",
                  content: "Apologies, I couldn't fetch those recommendations right now. Sometimes rephrasing helps, or feel free to try again shortly.",
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
    const updatedMessages: ChatMessage[] = [...messages, { role: "user", content: userMessage }];
    setMessages(updatedMessages);
    setIsLoading(true)

    try {
      setMessages((prev) => [...prev, { role: "assistant", content: "Okay, let me check..." }])

      const historyForBackend = updatedMessages.map(m => ({ 
        role: (m.role === "assistant" ? "model" : m.role) as "user" | "model",
        parts: m.content 
      }));
      const relevantHistory = historyForBackend.slice(0, -2);

      const result = await getRecommendations(userMessage, user.id, relevantHistory, followUpCount)
      setMessages((prev) => prev.slice(0, -1))

      if (result.followUpQuestion && typeof result.followUpQuestion === 'string') {
        setMessages((prev) => [...prev, { role: "assistant", content: result.followUpQuestion! }])
        setFollowUpCount(prevCount => prevCount + 1);
      } else if (result.recommendations.length > 0) {
        setFollowUpCount(0);
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
            { role: "assistant", content: "Based on your preferences, here are my top picks:" },
          ])
        }
        
        result.recommendations.forEach((rec) => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: formatRecommendationMessage(rec) },
          ])
        })
        
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
            content: "Hmm, I couldn't find anything matching that exactly. Could you try broadening your search a bit, maybe focusing on the cuisine or neighborhood?",
          },
        ])
      }
    } catch (error) {
      console.error("Error getting recommendations:", error)
      setMessages((prev) => {
        const newMessages = [...prev]
        if (newMessages[newMessages.length - 1]?.content === "Okay, let me check...") {
          newMessages.pop()
        }
        return [
          ...newMessages,
          {
            role: "assistant",
            content: "Apologies, I couldn't fetch those recommendations right now. Sometimes rephrasing helps, or feel free to try again shortly.",
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
      <div className="flex min-h-screen items-center justify-center bg-rex-cream">
        <Loader2 className="h-8 w-8 animate-spin text-rex-red" />
      </div>
    )
  }

  return (
    <div className="bg-rex-cream h-full">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl h-full flex flex-col">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.back()}
              className="text-rex-black hover:bg-rex-red/10"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Go back</span>
            </Button>
            <h1 className="text-xl md:text-2xl font-bold text-rex-black rex-logo">Chat with REX</h1>
          </div>
          <div></div>
        </div>

        <div className="flex flex-col flex-1 h-[calc(100%-4rem)]">
          <div className="flex-1 overflow-y-auto mb-4 space-y-5 p-4 rounded-xl border border-rex-red/10 bg-white dark:bg-rex-black/50">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out`}
              >
                <Card
                  className={`max-w-[85%] rounded-xl shadow-sm ${ 
                    message.role === "user" 
                      ? "bg-rex-red text-white" 
                      : "bg-rex-black text-rex-cream"
                  }`}
                >
                  <CardContent className="p-4 prose prose-base dark:prose-invert max-w-none prose-p:my-1 prose-a:text-rex-red hover:prose-a:text-rex-red/80">
                    {message.content === "..." ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>REX is thinking...</span>
                      </div>
                    ) : (
                      <ReactMarkdown
                        components={{
                          a: ({ node, ...props }) => (
                            <Link
                              href={props.href || "#"}
                              {...props}
                              className="text-rex-red hover:text-rex-red/80 underline font-medium"
                            />
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-white dark:bg-rex-black rounded-lg p-2 border border-rex-red/10 shadow-sm">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask REX anything about NYC dining..."
                  className="flex-1 min-h-10 resize-none border rounded-md px-3 py-2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 placeholder:text-muted-foreground bg-transparent dark:bg-transparent"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                />
                <Button type="submit" size="icon" className="rex-button rounded-md w-10 h-10 flex-shrink-0" disabled={isLoading || !input.trim()}>
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </form>
            </div>
            <div className="flex flex-wrap gap-2 pb-2">
              {getCurrentSuggestions(messages).map((suggestion, index) => (
                <Badge
                  key={index}
                  className="px-3 py-1.5 cursor-pointer rounded-full shadow-sm text-sm 
                             bg-rex-red text-white hover:bg-red-600 transition-colors"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
