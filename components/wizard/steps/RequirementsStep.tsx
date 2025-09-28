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
  sessionId?: string
  planningAnalysis?: any
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

      // Call real Planning Agent
      const planningResponse = await callPlanningAgent(stepData.prompt, stepData.pdfFile)

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: planningResponse.content,
        timestamp: new Date()
      }

      const finalMessages = [...updatedMessages, aiMessage]

      // Update data with new messages and requirements
      updateData({
        ...stepData,
        chatMessages: finalMessages,
        requirements: planningResponse.requirements || stepData.requirements,
        sessionId: planningResponse.sessionId // Store session ID for later use
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

// Call the real Planning Agent via API
async function callPlanningAgent(userPrompt: string, pdfFile?: File) {
  // Extract PDF content if provided
  let baseContent = undefined;
  if (pdfFile) {
    // TODO: Implement PDF extraction for base content
    // For now, we'll just note that a PDF was provided
    baseContent = `[PDF file provided: ${pdfFile.name}]`;
  }

  const response = await fetch('/api/planning', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userPrompt,
      baseContent
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Planning analysis failed');
  }

  const analysis = data.analysis;

  // Format the Planning Agent response for the chat interface
  const content = `🎯 **Planning Analysis Complete!**

I've analyzed your book concept and created an optimal generation strategy:

**📊 Complexity Assessment**: ${analysis.complexity.toUpperCase()}
**📚 Topic Category**: ${analysis.topicCategory}
**📈 Estimated Word Count**: ${analysis.estimatedWordCount.toLocaleString()} words
**⚡ Generation Strategy**: ${analysis.strategy.toUpperCase()}
**🎨 Content Approach**: ${analysis.approach.replace('_', ' ').toUpperCase()}
**📖 Planned Chapters**: ${analysis.chapterCount} chapters
**⏱️ Estimated Duration**: ${analysis.estimatedDuration} minutes
**🔬 Research Intensity**: ${analysis.researchIntensity.toUpperCase()}

${analysis.reasoning ? `**💡 Strategy Reasoning**: ${analysis.reasoning}` : ''}

This comprehensive plan will guide the creation of your book. Would you like to review and confirm these requirements?`;

  // Convert Planning Agent analysis to BookRequirements format
  const requirements: BookRequirements = {
    topic: userPrompt,
    purpose: `${analysis.topicCategory} - ${analysis.approach.replace('_', ' ')} approach`,
    audience: {
      demographics: getAudienceFromComplexity(analysis.complexity),
      expertiseLevel: getExpertiseLevelFromComplexity(analysis.complexity),
      readingContext: analysis.topicCategory
    },
    author: {
      name: "Author" // Will be filled from form
    },
    style: {
      tone: getToneFromApproach(analysis.approach),
      complexity: analysis.complexity,
      approach: analysis.approach
    },
    scope: {
      estimatedWordCount: analysis.estimatedWordCount,
      chapterCount: analysis.chapterCount,
      depth: `${analysis.researchIntensity} research depth`
    },
    contentOrientation: getContentOrientationFromStrategy(analysis.strategy, analysis.approach)
  };

  return {
    content,
    requirements,
    sessionId: data.sessionId,
    planningAnalysis: analysis
  };
}

// Helper functions to convert Planning Agent output to UI format
function getAudienceFromComplexity(complexity: string): string {
  switch (complexity) {
    case 'simple': return 'General audience';
    case 'moderate': return 'Interested readers with some background';
    case 'complex': return 'Advanced readers with domain knowledge';
    case 'expert': return 'Professional and expert practitioners';
    default: return 'General audience';
  }
}

function getExpertiseLevelFromComplexity(complexity: string): string {
  switch (complexity) {
    case 'simple': return 'Beginner';
    case 'moderate': return 'Beginner to intermediate';
    case 'complex': return 'Intermediate to advanced';
    case 'expert': return 'Advanced to expert';
    default: return 'Beginner to intermediate';
  }
}

function getToneFromApproach(approach: string): string {
  switch (approach) {
    case 'research_heavy': return 'Scholarly and authoritative';
    case 'narrative_focused': return 'Engaging and story-driven';
    case 'technical_deep': return 'Precise and technical';
    case 'practical_guide': return 'Clear and instructional';
    default: return 'Professional and accessible';
  }
}

function getContentOrientationFromStrategy(strategy: string, approach: string): string[] {
  const orientations = [];

  if (strategy === 'parallel') orientations.push('Modular');
  if (strategy === 'sequential') orientations.push('Progressive');
  if (strategy === 'hybrid') orientations.push('Flexible');

  if (approach === 'research_heavy') orientations.push('Evidence-based');
  if (approach === 'narrative_focused') orientations.push('Story-driven');
  if (approach === 'technical_deep') orientations.push('Technical');
  if (approach === 'practical_guide') orientations.push('Step-by-step', 'Actionable');

  return orientations.length > 0 ? orientations : ['Comprehensive'];
}