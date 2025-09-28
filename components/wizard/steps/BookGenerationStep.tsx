"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Download, FileText, CheckCircle, XCircle, RefreshCw, AlertCircle, Wand2 } from "lucide-react"
import type { WizardStepProps } from "../types"

interface GenerationStatus {
  stage: 'planning' | 'conversation' | 'outline' | 'chapters' | 'review' | 'assembly' | 'completed' | 'error'
  progress: number
  currentChapter?: number
  totalChapters?: number
  message: string
  error?: string
  downloadUrl?: string
  pdfReady?: boolean
}

type BookGenerationStepProps = WizardStepProps

export const BookGenerationStep: React.FC<BookGenerationStepProps> = ({
  data,
  setData,
  setIsValid
}) => {
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({
    stage: 'planning',
    progress: 0,
    message: 'Preparing to generate your book...'
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // Set step as valid when PDF is ready for download
  useEffect(() => {
    setIsValid(generationStatus.pdfReady === true)
  }, [generationStatus.pdfReady, setIsValid])

  // Simulate book generation process (will be replaced with actual API calls)
  const startGeneration = async () => {
    setIsGenerating(true)
    setRetryCount(0)

    try {
      // Planning phase
      setGenerationStatus({
        stage: 'planning',
        progress: 5,
        message: 'Creating adaptive execution plan...'
      })
      await simulateDelay(2000)

      // Conversation analysis
      setGenerationStatus({
        stage: 'conversation',
        progress: 15,
        message: 'Analyzing requirements and style preferences...'
      })
      await simulateDelay(1500)

      // Outline generation
      setGenerationStatus({
        stage: 'outline',
        progress: 25,
        message: 'Generating detailed book structure...'
      })
      await simulateDelay(2000)

      // Chapter generation (simulated)
      const totalChapters = data.outline?.chapters?.length || 8
      for (let i = 1; i <= totalChapters; i++) {
        const chapterProgress = 25 + (i / totalChapters) * 50
        setGenerationStatus({
          stage: 'chapters',
          progress: chapterProgress,
          currentChapter: i,
          totalChapters,
          message: `Generating Chapter ${i}: "${data.outline?.chapters?.[i-1]?.title || `Chapter ${i}`}"...`
        })
        await simulateDelay(3000)
      }

      // Review phase
      setGenerationStatus({
        stage: 'review',
        progress: 85,
        message: 'Reviewing content for consistency and quality...'
      })
      await simulateDelay(2000)

      // Assembly phase
      setGenerationStatus({
        stage: 'assembly',
        progress: 95,
        message: 'Assembling final PDF with professional formatting...'
      })
      await simulateDelay(1500)

      // Completion
      const completedStatus = {
        stage: 'completed' as const,
        progress: 100,
        message: 'Your book is ready for download!',
        downloadUrl: '/api/download/sample-book.pdf', // Mock URL
        pdfReady: true
      }
      setGenerationStatus(completedStatus)

      // Update wizard data to mark PDF as ready
      setData({ ...data, pdfReady: true, downloadUrl: completedStatus.downloadUrl })

    } catch (error) {
      setGenerationStatus({
        stage: 'error',
        progress: 0,
        message: 'Book generation failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const retryGeneration = () => {
    setRetryCount(prev => prev + 1)
    startGeneration()
  }

  const downloadPDF = () => {
    if (generationStatus.downloadUrl) {
      // In a real implementation, this would trigger the actual download
      const link = document.createElement('a')
      link.href = generationStatus.downloadUrl
      link.download = `${data.outline?.title || 'Generated Book'}.pdf`
      link.click()
    }
  }

  // Helper function for simulation
  const simulateDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const getStageIcon = (stage: GenerationStatus['stage']) => {
    switch (stage) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <LoadingSpinner size="sm" />
    }
  }

  const getStageColor = (stage: GenerationStatus['stage']) => {
    switch (stage) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Wand2 className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Create Your Book</h2>
        </div>
        <p className="text-muted-foreground">
          {!isGenerating && generationStatus.stage !== 'completed' && generationStatus.stage !== 'error'
            ? "Ready to generate your book based on your requirements"
            : generationStatus.message
          }
        </p>
      </div>

      {/* Book Summary Card */}
      <Card>
        <CardHeader className="px-6 py-4">
          <CardTitle className="text-lg font-semibold">Book Summary</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Title:</span>
              <p className="text-muted-foreground">{data.outline?.title || 'Untitled Book'}</p>
            </div>
            <div>
              <span className="font-medium">Author:</span>
              <p className="text-muted-foreground">{data.author || 'Unknown Author'}</p>
            </div>
            <div>
              <span className="font-medium">Chapters:</span>
              <p className="text-muted-foreground">{data.outline?.chapters?.length || 8} chapters</p>
            </div>
            <div>
              <span className="font-medium">Estimated Length:</span>
              <p className="text-muted-foreground">{data.outline?.estimatedPages || 25} pages</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generation Status */}
      {(isGenerating || generationStatus.stage !== 'planning' || generationStatus.progress > 0) && (
        <Card>
          <CardHeader className="px-6 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Generation Progress</CardTitle>
              <Badge className={getStageColor(generationStatus.stage)}>
                {generationStatus.stage.charAt(0).toUpperCase() + generationStatus.stage.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-6 py-4 space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{generationStatus.message}</span>
                <span>{generationStatus.progress}%</span>
              </div>
              <Progress value={generationStatus.progress} className="h-2" />
            </div>

            {/* Chapter Progress (when generating chapters) */}
            {generationStatus.stage === 'chapters' && generationStatus.currentChapter && generationStatus.totalChapters && (
              <div className="text-sm text-muted-foreground">
                Chapter {generationStatus.currentChapter} of {generationStatus.totalChapters}
              </div>
            )}

            {/* Status Icon and Message */}
            <div className="flex items-center gap-2">
              {getStageIcon(generationStatus.stage)}
              <span className="text-sm">
                {generationStatus.stage === 'completed'
                  ? 'Generation completed successfully!'
                  : generationStatus.stage === 'error'
                  ? `Error: ${generationStatus.error}`
                  : 'Processing...'
                }
              </span>
            </div>

            {/* Error details and retry option */}
            {generationStatus.stage === 'error' && (
              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-red-800">Generation Failed</p>
                      <p className="text-red-600 mt-1">{generationStatus.error}</p>
                      {retryCount > 0 && (
                        <p className="text-red-600 mt-1">Retry attempt: {retryCount}</p>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={retryGeneration}
                  variant="outline"
                  size="sm"
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Generation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Download Section */}
      {generationStatus.pdfReady && generationStatus.downloadUrl && (
        <Card>
          <CardHeader className="px-6 py-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Your Book is Ready!
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Your book has been successfully generated and is ready for download.
            </p>

            {/* Download Button */}
            <Button
              onClick={downloadPDF}
              className="w-full flex items-center gap-2"
              size="lg"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>

            {/* PDF Info */}
            <div className="text-xs text-muted-foreground text-center">
              PDF format • Professional formatting • Ready for sharing
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start Generation Button */}
      {!isGenerating && generationStatus.stage === 'planning' && generationStatus.progress === 0 && (
        <div className="text-center">
          <Button
            onClick={startGeneration}
            size="lg"
            className="px-8"
          >
            Generate Book
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            This process typically takes 3-5 minutes
          </p>
        </div>
      )}
    </div>
  )
}