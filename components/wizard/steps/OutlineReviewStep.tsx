"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Edit2, Save, X, FileText, ChevronRight, Users, Target, BookOpen } from "lucide-react"
import type { WizardStepProps } from "@/components/wizard/BookWizard"
import type { BookOutline, ChapterOutline } from "@/types"

interface OutlineReviewStepProps extends WizardStepProps {
  outline?: BookOutline
}

export const OutlineReviewStep: React.FC<OutlineReviewStepProps> = ({
  data,
  updateData,
  setIsValid
}) => {
  // Mock outline data for demonstration
  const [outline, setOutline] = useState<BookOutline>(data.outline || {
    title: "Python Web Scraping Quick Start",
    subtitle: "A Beginner's Guide to Extracting Data from the Web",
    chapters: [
      {
        chapterNumber: 1,
        title: "Introduction to Web Scraping",
        contentOverview: "Overview of web scraping, its applications, and legal considerations.",
        keyObjectives: ["Understand web scraping basics", "Learn about legal and ethical aspects", "Set up development environment"],
        wordCount: 1500,
        dependencies: [],
        researchRequirements: ["Current web scraping laws", "Popular use cases"]
      },
      {
        chapterNumber: 2,
        title: "Python Fundamentals for Web Scraping",
        contentOverview: "Essential Python concepts and libraries needed for web scraping projects.",
        keyObjectives: ["Master HTTP requests", "Understand HTML structure", "Learn Python web libraries"],
        wordCount: 2000,
        dependencies: [1],
        researchRequirements: ["Python requests library", "BeautifulSoup documentation"]
      },
      {
        chapterNumber: 3,
        title: "Building Your First Web Scraper",
        contentOverview: "Step-by-step guide to creating a basic web scraper with practical examples.",
        keyObjectives: ["Create a simple scraper", "Handle common challenges", "Parse and clean data"],
        wordCount: 2500,
        dependencies: [1, 2],
        researchRequirements: ["Real website examples", "Common scraping patterns"]
      },
      {
        chapterNumber: 4,
        title: "Advanced Techniques and Best Practices",
        contentOverview: "Professional techniques including rate limiting, user agents, and error handling.",
        keyObjectives: ["Implement rate limiting", "Handle dynamic content", "Manage errors gracefully"],
        wordCount: 2000,
        dependencies: [3],
        researchRequirements: ["Advanced scraping techniques", "Industry best practices"]
      }
    ],
    totalWordCount: 8000,
    estimatedPages: 32
  })

  const [editingTitle, setEditingTitle] = useState(false)
  const [editingSubtitle, setEditingSubtitle] = useState(false)
  const [editingChapter, setEditingChapter] = useState<number | null>(null)
  const [tempTitle, setTempTitle] = useState(outline.title)
  const [tempSubtitle, setTempSubtitle] = useState(outline.subtitle || "")
  const [tempChapter, setTempChapter] = useState<ChapterOutline | null>(null)

  // Update wizard data when outline changes
  useEffect(() => {
    updateData({ outline })
    setIsValid(true) // Outline is always valid for review
  }, [outline, updateData, setIsValid])

  const handleTitleSave = () => {
    setOutline(prev => ({ ...prev, title: tempTitle }))
    setEditingTitle(false)
  }

  const handleSubtitleSave = () => {
    setOutline(prev => ({ ...prev, subtitle: tempSubtitle }))
    setEditingSubtitle(false)
  }

  const handleChapterEdit = (chapterNumber: number) => {
    const chapter = outline.chapters.find(c => c.chapterNumber === chapterNumber)
    if (chapter) {
      setTempChapter({ ...chapter })
      setEditingChapter(chapterNumber)
    }
  }

  const handleChapterSave = () => {
    if (tempChapter && editingChapter) {
      setOutline(prev => ({
        ...prev,
        chapters: prev.chapters.map(c =>
          c.chapterNumber === editingChapter ? tempChapter : c
        )
      }))
      setEditingChapter(null)
      setTempChapter(null)
    }
  }

  const handleChapterCancel = () => {
    setEditingChapter(null)
    setTempChapter(null)
  }

  const getDependencyText = (dependencies: number[]) => {
    if (dependencies.length === 0) return "None"
    return dependencies.map(dep => `Chapter ${dep}`).join(", ")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Review Your Book Outline</h2>
        </div>
        <p className="text-muted-foreground">
          Review and customize your book structure before we create your content
        </p>
      </div>

      {/* Title and Subtitle Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Book Title & Subtitle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="book-title" className="text-sm font-medium">
              Title
            </Label>
            {editingTitle ? (
              <div className="flex gap-2">
                <Input
                  id="book-title"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  placeholder="Enter book title"
                  className="flex-1"
                />
                <Button size="sm" onClick={handleTitleSave}>
                  <Save className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingTitle(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between group">
                <h3 className="text-lg font-semibold">{outline.title}</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingTitle(true)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Subtitle */}
          <div className="space-y-2">
            <Label htmlFor="book-subtitle" className="text-sm font-medium">
              Subtitle
            </Label>
            {editingSubtitle ? (
              <div className="flex gap-2">
                <Input
                  id="book-subtitle"
                  value={tempSubtitle}
                  onChange={(e) => setTempSubtitle(e.target.value)}
                  placeholder="Enter book subtitle (optional)"
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSubtitleSave}>
                  <Save className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingSubtitle(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between group">
                <p className="text-muted-foreground">
                  {outline.subtitle || "No subtitle"}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingSubtitle(true)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Book Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="px-3 py-1 text-center">
            <div className="text-lg font-bold text-primary">{outline.chapters.length}</div>
            <p className="text-xs text-muted-foreground">Chapters</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-3 py-1 text-center">
            <div className="text-lg font-bold text-primary">{outline.totalWordCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Words</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-3 py-1 text-center">
            <div className="text-lg font-bold text-primary">{outline.estimatedPages}</div>
            <p className="text-xs text-muted-foreground">Pages</p>
          </CardContent>
        </Card>
      </div>

      {/* Chapter Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChevronRight className="w-5 h-5" />
            Chapter Structure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {outline.chapters.map((chapter, index) => (
            <div key={chapter.chapterNumber}>
              {index > 0 && <Separator className="my-4" />}

              {editingChapter === chapter.chapterNumber && tempChapter ? (
                /* Edit Mode */
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Editing Chapter {chapter.chapterNumber}</h4>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleChapterSave}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleChapterCancel}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`chapter-title-${chapter.chapterNumber}`} className="text-sm font-medium">
                        Chapter Title
                      </Label>
                      <Input
                        id={`chapter-title-${chapter.chapterNumber}`}
                        value={tempChapter.title}
                        onChange={(e) => setTempChapter(prev => prev ? { ...prev, title: e.target.value } : null)}
                        placeholder="Enter chapter title"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`chapter-overview-${chapter.chapterNumber}`} className="text-sm font-medium">
                        Content Overview
                      </Label>
                      <Textarea
                        id={`chapter-overview-${chapter.chapterNumber}`}
                        value={tempChapter.contentOverview}
                        onChange={(e) => setTempChapter(prev => prev ? { ...prev, contentOverview: e.target.value } : null)}
                        placeholder="Describe what this chapter will cover"
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Word Count Target</Label>
                      <Input
                        type="number"
                        value={tempChapter.wordCount}
                        onChange={(e) => setTempChapter(prev => prev ? { ...prev, wordCount: parseInt(e.target.value) || 0 } : null)}
                        placeholder="Target word count"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-3 group">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          Chapter {chapter.chapterNumber}
                        </Badge>
                        <h4 className="text-lg font-semibold">{chapter.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {chapter.contentOverview}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleChapterEdit(chapter.chapterNumber)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Word Count:</span>
                      <span className="font-medium">{chapter.wordCount.toLocaleString()}</span>
                    </div>

                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="text-muted-foreground">Dependencies:</span>
                        <span className="font-medium ml-1">{getDependencyText(chapter.dependencies)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Objectives:</span>
                      <span className="font-medium">{chapter.keyObjectives.length}</span>
                    </div>
                  </div>

                  {chapter.keyObjectives.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Key Objectives:</p>
                      <ul className="text-sm space-y-1">
                        {chapter.keyObjectives.map((objective, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>{objective}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Approval Section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="px-6 py-6 text-center space-y-3">
          <h3 className="text-lg font-semibold">Ready to Proceed?</h3>
          <p className="text-sm text-muted-foreground">
            Your outline looks great! When you're ready, we'll start creating your book content based on this structure.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Target className="w-4 h-4" />
            <span>Estimated completion time: ~15-30 minutes</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}