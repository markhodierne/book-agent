import { z } from "zod"

// Validation schemas for wizard steps
export const userPromptSchema = z.object({
  prompt: z.string()
    .min(3, "Prompt must be at least 3 characters long")
    .max(1000, "Prompt cannot exceed 1000 characters"),
  pdfFile: z.union([
      z.instanceof(File),
      z.undefined(),
      z.null()
    ])
    .optional()
    .refine(
      (file) => {
        if (!file) return true
        return file.size <= 50 * 1024 * 1024 // 50MB limit
      },
      "PDF file must be smaller than 50MB"
    )
    .refine(
      (file) => {
        if (!file) return true
        return file.type === "application/pdf" || file.name.endsWith('.pdf')
      },
      "File must be a PDF"
    ),
  author: z.string()
    .min(1, "Author name is required")
    .max(100, "Author name cannot exceed 100 characters")
})

export const requirementsSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  audience: z.object({
    demographics: z.string().min(1, "Target audience demographics required"),
    expertiseLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]),
    ageRange: z.string().optional()
  }),
  purpose: z.enum(["educational", "reference", "narrative", "practical", "academic", "entertainment"]),
  styleGuide: z.object({
    tone: z.enum(["formal", "casual", "conversational", "academic", "professional"]),
    perspective: z.enum(["first-person", "second-person", "third-person"]),
    complexity: z.enum(["simple", "moderate", "complex", "expert"])
  })
})

export const outlineSchema = z.object({
  title: z.string().min(1, "Book title is required"),
  subtitle: z.string().optional(),
  chapters: z.array(z.object({
    title: z.string().min(1, "Chapter title is required"),
    description: z.string().min(1, "Chapter description is required"),
    estimatedWordCount: z.number().min(500, "Minimum 500 words per chapter")
  })).min(3, "Book must have at least 3 chapters").max(25, "Book cannot have more than 25 chapters")
})

// Validation functions for wizard steps
export const validateUserPrompt = async (data: any): Promise<boolean> => {
  try {
    userPromptSchema.parse(data)
    return true
  } catch (error) {
    console.error('User prompt validation failed:', error)
    return false
  }
}

export const validateRequirements = async (data: any): Promise<boolean> => {
  try {
    if (!data.requirements) return false
    requirementsSchema.parse(data.requirements)
    return true
  } catch (error) {
    console.error('Requirements validation failed:', error)
    return false
  }
}

export const validateOutline = async (data: any): Promise<boolean> => {
  try {
    if (!data.outline) return false
    outlineSchema.parse(data.outline)
    return true
  } catch (error) {
    console.error('Outline validation failed:', error)
    return false
  }
}

// Helper function to extract validation errors
export const getValidationErrors = (schema: z.ZodSchema, data: any): string[] => {
  try {
    schema.parse(data)
    return []
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
    }
    return ['Unknown validation error']
  }
}

// Real-time validation for forms
export const createRealTimeValidator = <T>(schema: z.ZodSchema<T>) => {
  return (data: any): { isValid: boolean; errors: string[] } => {
    try {
      schema.parse(data)
      return { isValid: true, errors: [] }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        }
      }
      return { isValid: false, errors: ['Unknown validation error'] }
    }
  }
}

export type UserPromptData = z.infer<typeof userPromptSchema>
export type RequirementsData = z.infer<typeof requirementsSchema>
export type OutlineData = z.infer<typeof outlineSchema>