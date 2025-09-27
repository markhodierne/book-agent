#!/usr/bin/env npx tsx

/**
 * PDF Generation Test
 * Creates a complete book PDF using mock data to test formatting pipeline
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { FormattingNode } from '../lib/agents/nodes/formatting';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function testPDFGeneration(): Promise<void> {
  console.log('📖 PDF Generation Test');
  console.log('======================\n');

  const startTime = Date.now();
  const outputDir = './test-output/pdf-test';

  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true });

  try {
    // Create mock book data
    console.log('1. 📝 Creating mock book data...');
    const mockBookData = createMockBookData();

    console.log(`   ✅ Title: "${mockBookData.outline.title}"`);
    console.log(`   📚 Chapters: ${mockBookData.chapters.length}`);
    console.log(`   📊 Words: ${mockBookData.chapters.reduce((sum, ch) => sum + ch.wordCount, 0)}`);
    console.log(`   ⏱️  Time: ${Date.now() - startTime}ms\n`);

    // Generate PDF
    console.log('2. 🎨 Generating PDF...');
    const formattingNode = new FormattingNode();
    const result = await formattingNode.execute(mockBookData);

    console.log(`   ✅ PDF generated successfully`);
    console.log(`   📄 Pages: ${result.formattingResult?.estimatedPages}`);
    console.log(`   💾 Size: ${result.formattingResult?.pdfBuffer ? Math.round(result.formattingResult.pdfBuffer.length / 1024) + 'KB' : 'Unknown'}`);
    console.log(`   ⏱️  Time: ${Date.now() - startTime}ms\n`);

    // Save PDF
    if (result.formattingResult?.pdfBuffer) {
      const pdfPath = join(outputDir, 'inkwell-test-book.pdf');
      writeFileSync(pdfPath, result.formattingResult.pdfBuffer);
      console.log(`📚 PDF SAVED: ${pdfPath}`);

      // Also save JSON summary
      const summary = {
        title: mockBookData.outline.title,
        subtitle: mockBookData.outline.subtitle,
        author: mockBookData.requirements.author.name,
        chapters: mockBookData.chapters.length,
        totalWords: mockBookData.chapters.reduce((sum, ch) => sum + ch.wordCount, 0),
        pages: result.formattingResult.estimatedPages,
        generatedAt: new Date().toISOString(),
        pdfSize: result.formattingResult.pdfBuffer.length
      };

      writeFileSync(
        join(outputDir, 'book-summary.json'),
        JSON.stringify(summary, null, 2)
      );

      console.log(`📋 Summary saved: ${join(outputDir, 'book-summary.json')}`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`\n🎉 PDF Generation Complete!`);
    console.log(`⏱️  Total time: ${Math.round(totalTime / 1000)}s`);
    console.log(`📁 Check: ${outputDir}/inkwell-test-book.pdf`);

  } catch (error) {
    console.error('\n❌ PDF generation failed:');
    console.error('Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

function createMockBookData() {
  const sessionId = `pdf-test-${Date.now()}`;

  return {
    sessionId,
    userId: 'test-user',
    currentStage: 'formatting' as const,
    status: 'active' as const,
    userPrompt: 'Create a comprehensive guide about Python programming for automation',
    progress: {
      overall: 90,
      stage: 10,
      message: 'Starting PDF generation'
    },
    requirements: {
      topic: 'Python Programming for Automation: A Complete Beginner\'s Guide',
      audience: {
        level: 'beginner' as const,
        demographics: 'Software developers and IT professionals new to Python',
        priorKnowledge: 'Basic understanding of programming concepts',
        ageGroup: 'Adults (25-45)',
        readingContext: 'Professional development'
      },
      author: {
        name: 'Inkwell',
        credentials: 'AI Book Author Extraordinaire',
        bio: 'Expert in creating comprehensive technical guides'
      },
      styleGuide: {
        tone: 'professional' as const,
        voice: 'second_person' as const,
        formality: 'semiformal' as const,
        technicalLevel: 'intermediate' as const
      },
      wordCountTarget: 35000,
      specializationArea: 'Python automation and scripting'
    },
    outline: {
      title: 'Python Automation Mastery',
      subtitle: 'From Beginner to Automation Expert: A Complete Guide to Python Scripting',
      chapters: [
        {
          chapterNumber: 1,
          title: 'Getting Started with Python',
          overview: 'Introduction to Python programming language, installation, and basic syntax',
          contentOverview: 'Introduction to Python programming language, installation, and basic syntax',
          objectives: ['Install Python and set up development environment', 'Understand Python syntax and basic concepts', 'Write your first Python scripts'],
          keyObjectives: ['Install Python and set up development environment', 'Understand Python syntax and basic concepts', 'Write your first Python scripts'],
          wordCount: 3500,
          dependencies: [],
          researchRequirements: ['Latest Python installation methods', 'Popular IDE recommendations']
        },
        {
          chapterNumber: 2,
          title: 'Python Fundamentals',
          overview: 'Core Python concepts including variables, data types, control structures, and functions',
          contentOverview: 'Core Python concepts including variables, data types, control structures, and functions',
          objectives: ['Master Python data types and variables', 'Use control structures effectively', 'Create and use functions'],
          keyObjectives: ['Master Python data types and variables', 'Use control structures effectively', 'Create and use functions'],
          wordCount: 4000,
          dependencies: [1],
          researchRequirements: ['Python best practices', 'Common beginner mistakes']
        },
        {
          chapterNumber: 3,
          title: 'File Operations and Data Handling',
          overview: 'Working with files, directories, and various data formats in Python',
          contentOverview: 'Working with files, directories, and various data formats in Python',
          objectives: ['Read and write files efficiently', 'Handle different data formats', 'Manage file system operations'],
          keyObjectives: ['Read and write files efficiently', 'Handle different data formats', 'Manage file system operations'],
          wordCount: 3800,
          dependencies: [2],
          researchRequirements: ['File handling best practices', 'Popular data formats']
        },
        {
          chapterNumber: 4,
          title: 'Web Scraping Essentials',
          overview: 'Introduction to web scraping using Python libraries like requests and BeautifulSoup',
          contentOverview: 'Introduction to web scraping using Python libraries like requests and BeautifulSoup',
          objectives: ['Understand web scraping fundamentals', 'Use requests and BeautifulSoup', 'Handle common scraping challenges'],
          keyObjectives: ['Understand web scraping fundamentals', 'Use requests and BeautifulSoup', 'Handle common scraping challenges'],
          wordCount: 4200,
          dependencies: [3],
          researchRequirements: ['Web scraping ethics', 'Popular scraping libraries']
        },
        {
          chapterNumber: 5,
          title: 'API Integration and Automation',
          overview: 'Working with APIs to automate data collection and system integration',
          contentOverview: 'Working with APIs to automate data collection and system integration',
          objectives: ['Understand RESTful APIs', 'Integrate with popular APIs', 'Build automated workflows'],
          keyObjectives: ['Understand RESTful APIs', 'Integrate with popular APIs', 'Build automated workflows'],
          wordCount: 4300,
          dependencies: [4],
          researchRequirements: ['Popular APIs for automation', 'API authentication methods']
        },
        {
          chapterNumber: 6,
          title: 'Task Scheduling and Deployment',
          overview: 'Scheduling automated tasks and deploying Python scripts for production use',
          contentOverview: 'Scheduling automated tasks and deploying Python scripts for production use',
          objectives: ['Set up task scheduling', 'Deploy scripts to production', 'Monitor and maintain automation'],
          keyObjectives: ['Set up task scheduling', 'Deploy scripts to production', 'Monitor and maintain automation'],
          wordCount: 3700,
          dependencies: [5],
          researchRequirements: ['Task scheduling tools', 'Python deployment options']
        },
        {
          chapterNumber: 7,
          title: 'Advanced Automation Techniques',
          overview: 'Advanced patterns and techniques for robust, scalable automation solutions',
          contentOverview: 'Advanced patterns and techniques for robust, scalable automation solutions',
          objectives: ['Implement error handling and logging', 'Build scalable automation', 'Use advanced Python features'],
          keyObjectives: ['Implement error handling and logging', 'Build scalable automation', 'Use advanced Python features'],
          wordCount: 4000,
          dependencies: [6],
          researchRequirements: ['Automation best practices', 'Python advanced patterns']
        },
        {
          chapterNumber: 8,
          title: 'Real-World Projects and Case Studies',
          overview: 'Complete automation projects demonstrating practical applications of Python',
          contentOverview: 'Complete automation projects demonstrating practical applications of Python',
          objectives: ['Build complete automation projects', 'Learn from real-world examples', 'Apply best practices'],
          keyObjectives: ['Build complete automation projects', 'Learn from real-world examples', 'Apply best practices'],
          wordCount: 4500,
          dependencies: [7],
          researchRequirements: ['Popular automation use cases', 'Industry examples']
        }
      ],
      totalWordCount: 32000,
      estimatedPages: 128,
      targetAudience: {
        level: 'beginner' as const,
        demographics: 'Software developers and IT professionals new to Python',
        priorKnowledge: 'Basic understanding of programming concepts'
      }
    },
    chapters: [
      {
        chapterNumber: 1,
        title: 'Getting Started with Python',
        content: createMockChapterContent('Getting Started with Python', 3500),
        wordCount: 3500,
        status: 'completed' as const
      },
      {
        chapterNumber: 2,
        title: 'Python Fundamentals',
        content: createMockChapterContent('Python Fundamentals', 4000),
        wordCount: 4000,
        status: 'completed' as const
      },
      {
        chapterNumber: 3,
        title: 'File Operations and Data Handling',
        content: createMockChapterContent('File Operations and Data Handling', 3800),
        wordCount: 3800,
        status: 'completed' as const
      },
      {
        chapterNumber: 4,
        title: 'Web Scraping Essentials',
        content: createMockChapterContent('Web Scraping Essentials', 4200),
        wordCount: 4200,
        status: 'completed' as const
      },
      {
        chapterNumber: 5,
        title: 'API Integration and Automation',
        content: createMockChapterContent('API Integration and Automation', 4300),
        wordCount: 4300,
        status: 'completed' as const
      },
      {
        chapterNumber: 6,
        title: 'Task Scheduling and Deployment',
        content: createMockChapterContent('Task Scheduling and Deployment', 3700),
        wordCount: 3700,
        status: 'completed' as const
      },
      {
        chapterNumber: 7,
        title: 'Advanced Automation Techniques',
        content: createMockChapterContent('Advanced Automation Techniques', 4000),
        wordCount: 4000,
        status: 'completed' as const
      },
      {
        chapterNumber: 8,
        title: 'Real-World Projects and Case Studies',
        content: createMockChapterContent('Real-World Projects and Case Studies', 4500),
        wordCount: 4500,
        status: 'completed' as const
      }
    ],
    metadata: {
      startTime: new Date().toISOString(),
      lastUpdateTime: new Date().toISOString()
    }
  };
}

function createMockChapterContent(title: string, targetWords: number): string {
  const wordsPerParagraph = 150;
  const sectionsCount = Math.max(4, Math.floor(targetWords / 800));

  let content = `# ${title}\n\n`;

  // Introduction
  content += `## Introduction\n\n`;
  content += `Welcome to "${title}" – an essential chapter in your Python automation journey. This chapter will provide you with the foundational knowledge and practical skills needed to master this crucial aspect of Python programming. Whether you're just starting out or looking to deepen your understanding, the concepts covered here will serve as building blocks for more advanced topics.\n\n`;

  // Main sections
  for (let i = 0; i < sectionsCount; i++) {
    const sectionTitle = getSectionTitle(title, i);
    content += `## ${sectionTitle}\n\n`;

    // Add paragraphs for this section
    const paragraphsInSection = Math.floor(targetWords / sectionsCount / wordsPerParagraph);
    for (let j = 0; j < paragraphsInSection; j++) {
      content += generatePythonParagraph(wordsPerParagraph) + '\n\n';

      // Add code examples every 2-3 paragraphs
      if (j % 2 === 1) {
        content += generateCodeExample(title, i, j) + '\n\n';
      }
    }
  }

  // Summary
  content += `## Chapter Summary\n\n`;
  content += `In this chapter, we've explored the key concepts of ${title.toLowerCase()}. You've learned how to apply these techniques in real-world scenarios and gained hands-on experience through practical examples. The skills you've developed here will be instrumental as you progress to more advanced automation techniques.\n\n`;
  content += `**Key Takeaways:**\n`;
  content += `- Understanding the fundamental principles and best practices\n`;
  content += `- Practical implementation techniques and common patterns\n`;
  content += `- Real-world applications and use cases\n`;
  content += `- Troubleshooting and optimization strategies\n\n`;
  content += `In the next chapter, we'll build upon these concepts and explore more advanced topics that will further enhance your Python automation capabilities.\n\n`;

  return content;
}

function getSectionTitle(chapterTitle: string, index: number): string {
  const titleMap: Record<string, string[]> = {
    'Getting Started with Python': [
      'Installing Python and Setting Up Your Environment',
      'Understanding Python Syntax and Basic Concepts',
      'Your First Python Scripts',
      'Python Development Tools and IDEs'
    ],
    'Python Fundamentals': [
      'Variables and Data Types',
      'Control Structures and Logic',
      'Functions and Modules',
      'Error Handling Basics'
    ],
    'File Operations and Data Handling': [
      'Reading and Writing Files',
      'Working with Different Data Formats',
      'Directory Operations',
      'Data Processing Techniques'
    ],
    'Web Scraping Essentials': [
      'HTTP Requests and Response Handling',
      'Parsing HTML with BeautifulSoup',
      'Handling Forms and Sessions',
      'Ethical Scraping Practices'
    ],
    'API Integration and Automation': [
      'Understanding RESTful APIs',
      'Authentication and API Keys',
      'Making API Requests with Python',
      'Building Automated Workflows'
    ],
    'Task Scheduling and Deployment': [
      'Scheduling Tasks with Cron and Task Scheduler',
      'Deploying Python Scripts',
      'Monitoring and Logging',
      'Production Considerations'
    ],
    'Advanced Automation Techniques': [
      'Design Patterns for Automation',
      'Performance Optimization',
      'Scalability and Reliability',
      'Testing Automation Scripts'
    ],
    'Real-World Projects and Case Studies': [
      'Project 1: Automated Data Collection',
      'Project 2: System Monitoring Dashboard',
      'Project 3: Content Management Automation',
      'Best Practices and Lessons Learned'
    ]
  };

  const sections = titleMap[chapterTitle] || [`Section ${index + 1}`, `Advanced Topics`, `Implementation Details`, `Best Practices`];
  return sections[index % sections.length];
}

function generatePythonParagraph(targetWords: number): string {
  const sentences = [
    "Python's intuitive syntax makes it an excellent choice for automation tasks, allowing developers to write clear and maintainable code.",
    "When working with automation scripts, it's crucial to implement proper error handling to ensure your programs run reliably in production environments.",
    "The Python standard library provides a wealth of modules that can handle common automation tasks without requiring external dependencies.",
    "Understanding how to structure your code with functions and classes will make your automation scripts more modular and easier to maintain.",
    "Effective debugging techniques are essential when developing automation solutions, as they help identify and resolve issues quickly.",
    "Performance considerations become important when scaling automation scripts to handle large datasets or frequent executions.",
    "Documentation and comments play a vital role in making your automation code understandable and maintainable by other developers.",
    "Testing your automation scripts thoroughly helps prevent unexpected failures when they're deployed in production environments.",
    "Security best practices should always be considered when writing automation scripts that handle sensitive data or system operations.",
    "Code reusability is a key principle that allows you to build upon previous work and create more efficient automation solutions."
  ];

  let paragraph = '';
  let wordCount = 0;

  while (wordCount < targetWords) {
    const sentence = sentences[Math.floor(Math.random() * sentences.length)];
    const sentenceWords = sentence.split(' ').length;

    if (wordCount + sentenceWords <= targetWords + 10) {
      paragraph += sentence + ' ';
      wordCount += sentenceWords;
    } else {
      break;
    }
  }

  return paragraph.trim();
}

function generateCodeExample(chapterTitle: string, sectionIndex: number, paragraphIndex: number): string {
  const examples = [
    {
      description: "Here's a simple example that demonstrates this concept:",
      code: `# Example: Basic Python automation script
import os
import time

def automate_task():
    print("Starting automation...")
    # Perform automation logic here
    time.sleep(1)
    print("Task completed successfully!")

if __name__ == "__main__":
    automate_task()`
    },
    {
      description: "Let's look at a practical implementation:",
      code: `# Example: File processing automation
import glob
import shutil

def process_files(source_dir, target_dir):
    files = glob.glob(f"{source_dir}/*.txt")
    for file in files:
        filename = os.path.basename(file)
        shutil.copy2(file, f"{target_dir}/{filename}")
        print(f"Processed: {filename}")

process_files("./input", "./output")`
    },
    {
      description: "This example shows how to handle errors gracefully:",
      code: `# Example: Error handling in automation
import requests
from typing import Optional

def fetch_data(url: str) -> Optional[dict]:
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching data: {e}")
        return None

data = fetch_data("https://api.example.com/data")`
    }
  ];

  const example = examples[(sectionIndex + paragraphIndex) % examples.length];
  return `${example.description}\n\n\`\`\`python\n${example.code}\n\`\`\``;
}

// Run the test
if (require.main === module) {
  testPDFGeneration().catch(console.error);
}