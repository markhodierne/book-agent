"use client"

import React, { useState, useCallback } from "react"
import { Upload, FileText, X, AlertCircle, Key, MessageSquare, CheckSquare2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatInterface, type ChatMessage } from "@/components/chat/ChatInterface"
import { RequirementsReview, type BookRequirements } from "@/components/chat/RequirementsReview"
import type { WizardStepProps } from "../BookWizard"

interface RequirementsStepProps extends WizardStepProps {
  openaiApiKey?: string
  setOpenaiApiKey?: (key: string) => void
}

interface RequirementsStepData {
  prompt: string
  author: string
  pdfFile?: File
  openaiApiKey?: string
  chatMessages: ChatMessage[]
  requirements?: BookRequirements
  requirementsConfirmed: boolean
}

export const RequirementsStep: React.FC<RequirementsStepProps> = ({
  data,
  updateData,
  setIsValid,
  openaiApiKey = "",
  setOpenaiApiKey
}) => {
  const [activeTab, setActiveTab] = useState("conversation")
  const [dragOver, setDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Initialize data with defaults
  const stepData: RequirementsStepData = {
    prompt: data.prompt || "",
    author: data.author || "",
    pdfFile: data.pdfFile,
    openaiApiKey: data.openaiApiKey || openaiApiKey,
    chatMessages: data.chatMessages || [],
    requirements: data.requirements,
    requirementsConfirmed: data.requirementsConfirmed || false,
    ...data
  }

  // Validate step completion
  React.useEffect(() => {
    const isValid = Boolean(
      stepData.prompt.trim() &&
      stepData.author.trim() &&
      stepData.requirements &&
      stepData.requirementsConfirmed
    )
    setIsValid(isValid)
  }, [stepData, setIsValid])

  // Handle initial prompt and author changes
  const handleBasicInfoChange = (field: keyof RequirementsStepData, value: any) => {
    const updated = { ...stepData, [field]: value }
    updateData(updated)
  }

  // Handle file upload
  const handleFileUpload = (file: File) => {
    if (file.type === "application/pdf" || file.name.endsWith('.pdf')) {
      if (file.size <= 50 * 1024 * 1024) { // 50MB limit
        handleBasicInfoChange('pdfFile', file)
      } else {
        alert('File size must be less than 50MB')
      }
    } else {
      alert('Please upload a PDF file')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const removeFile = () => {
    handleBasicInfoChange('pdfFile', undefined)
  }

  // Handle chat message sending
  const handleSendMessage = useCallback(async (message: string) => {
    if (!stepData.prompt.trim()) {
      alert('Please enter a book description first')
      return
    }

    setIsLoading(true)

    try {
      // Create user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: message,
        timestamp: new Date()
      }

      const updatedMessages = [...stepData.chatMessages, userMessage]

      // Simulate AI response (replace with actual API call)
      const aiResponse = await simulateAIResponse(message, stepData)

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse.content,
        timestamp: new Date()
      }

      const finalMessages = [...updatedMessages, aiMessage]

      // Update data with new messages and potentially requirements
      updateData({
        ...stepData,
        chatMessages: finalMessages,
        requirements: aiResponse.requirements || stepData.requirements
      })

    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to get AI response. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [stepData, updateData])

  // Handle requirements confirmation
  const handleConfirmRequirements = () => {
    updateData({
      ...stepData,
      requirementsConfirmed: true
    })
    setActiveTab("conversation") // Stay on current tab but mark as confirmed
  }

  const handleEditRequirements = () => {
    setActiveTab("conversation")
  }

  // Check if we can show the review tab
  const canShowReview = Boolean(stepData.requirements)

  return (
    <div className="space-y-6">
      {/* Basic Information Form */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Book Description */}
          <div className="space-y-2">
            <Label htmlFor="prompt">What book would you like to create?</Label>
            <Textarea
              id="prompt"
              placeholder="Describe your book in a few sentences or paragraphs. The more detail you provide, the better your book will be."
              value={stepData.prompt}
              onChange={(e) => handleBasicInfoChange('prompt', e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Author Name */}
          <div className="space-y-2">
            <Label htmlFor="author">Author Name</Label>
            <Input
              id="author"
              placeholder="Enter your name or pen name"
              value={stepData.author}
              onChange={(e) => handleBasicInfoChange('author', e.target.value)}
            />
          </div>

          {/* OpenAI API Key */}
          {setOpenaiApiKey && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="openai-key">OpenAI API Key</Label>
              </div>
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-..."
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your key is not stored and only used for this session.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Reference Material (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Card
            className={cn(
              "border-2 border-dashed transition-colors cursor-pointer",
              dragOver && "border-primary bg-primary/5",
              !dragOver && "border-muted-foreground/25 hover:border-muted-foreground/50"
            )}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
          >
            <CardContent className="p-6">
              {stepData.pdfFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-medium">{stepData.pdfFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(stepData.pdfFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">
                      Upload a PDF as reference material to enhance your book content
                    </p>
                    <p className="text-muted-foreground">
                      Drag and drop a PDF file here, or click to browse
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Maximum file size: 50MB
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileInputChange}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('pdf-upload')?.click()}
                  >
                    Choose File
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Requirements Gathering Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Requirements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4 mx-6 mt-4">
              <TabsTrigger value="conversation" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                AI Conversation
              </TabsTrigger>
              <TabsTrigger
                value="review"
                disabled={!canShowReview}
                className="flex items-center gap-2"
              >
                <CheckSquare2 className="w-4 h-4" />
                Review & Confirm
              </TabsTrigger>
            </TabsList>

            <TabsContent value="conversation" className="px-6 pb-6">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Have a conversation with the AI to refine your book requirements.
                  Start by asking questions about your audience, style, or scope.
                </div>

                {stepData.prompt.trim() ? (
                  <div className="h-[500px]">
                    <ChatInterface
                      messages={stepData.chatMessages}
                      onSendMessage={handleSendMessage}
                      isLoading={isLoading}
                      placeholder="Ask about audience, writing style, book scope, or any other requirements..."
                      className="h-full"
                      disabled={!stepData.prompt.trim()}
                    />
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please enter a book description above to start the conversation.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="review" className="px-6 pb-6">
              {stepData.requirements ? (
                <RequirementsReview
                  requirements={stepData.requirements}
                  uploadedFile={stepData.pdfFile}
                  onEdit={handleEditRequirements}
                  onConfirm={handleConfirmRequirements}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Continue the conversation to gather requirements</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Validation Message */}
      {!stepData.requirementsConfirmed && stepData.requirements && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please review and confirm your requirements in the "Review & Confirm" tab to continue.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Simulate AI response (replace with actual API call)
async function simulateAIResponse(message: string, stepData: RequirementsStepData) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

  // Simple simulation - in reality, this would call the conversation agent
  const responses = [
    {
      content: "I'd love to help you refine your book concept! Can you tell me more about who your target audience is? For example, are you writing for beginners, professionals, or a general audience?",
      requirements: undefined
    },
    {
      content: "Great! Based on our conversation, I'm starting to understand your vision. What writing style do you prefer - more formal and academic, conversational and friendly, or something else?",
      requirements: undefined
    },
    {
      content: `Perfect! I now have a good understanding of your book requirements. Here's what I've gathered:

**Topic**: ${stepData.prompt}
**Target Audience**: General readers interested in the subject
**Writing Style**: Conversational and accessible
**Estimated Scope**: 20,000-30,000 words, 10-15 chapters

Would you like to review these requirements and make any adjustments?`,
      requirements: {
        topic: stepData.prompt,
        purpose: "Educational and practical guide",
        audience: {
          demographics: "General readers",
          expertiseLevel: "Beginner to intermediate",
          readingContext: "Self-improvement and learning"
        },
        author: {
          name: stepData.author
        },
        style: {
          tone: "Conversational and friendly",
          complexity: "Accessible",
          approach: "Practical with examples"
        },
        scope: {
          estimatedWordCount: 25000,
          chapterCount: 12,
          depth: "Comprehensive but accessible"
        },
        contentOrientation: ["Practical", "Example-driven", "Step-by-step"]
      }
    }
  ]

  // Return a random response or the final one if we have enough messages
  const messageCount = stepData.chatMessages.length
  if (messageCount >= 4) {
    return responses[2] // Return the complete requirements
  } else if (messageCount >= 2) {
    return responses[1]
  } else {
    return responses[0]
  }
}