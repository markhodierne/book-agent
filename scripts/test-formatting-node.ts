#!/usr/bin/env npx tsx
// Interactive Testing Script for FormattingNode
// Tests PDF generation with different scenarios and real data
// Usage: npx tsx scripts/test-formatting-node.ts [--scenario=simple|complex|academic]

import { FormattingNode } from '@/lib/agents/nodes/formatting';
import { WorkflowState, ChapterResult, BookOutline, BookRequirements, StyleGuide } from '@/types';
import { logger } from '@/lib/errors/exports';
import fs from 'fs';
import path from 'path';

/**
 * Test scenarios for different formatting complexity levels
 */
interface TestScenario {
  name: string;
  description: string;
  chapters: ChapterResult[];
  outline: BookOutline;
  requirements: BookRequirements;
  styleGuide: StyleGuide;
}

/**
 * Create test scenarios for formatting validation
 */
function createTestScenarios(): Record<string, TestScenario> {
  return {
    simple: {
      name: 'Simple Book',
      description: '3-chapter book with basic content',
      chapters: [
        {
          chapterNumber: 1,
          title: 'Introduction to AI',
          content: `# Introduction to Artificial Intelligence

Artificial intelligence represents one of the most transformative technologies of our time. This introductory chapter explores the fundamental concepts that define AI and its growing impact on society.

## What is Artificial Intelligence?

At its core, artificial intelligence refers to the simulation of human intelligence in machines. These systems are designed to think, learn, and make decisions in ways that mimic human cognitive processes.

## Key Components of AI

The field of AI encompasses several key areas:

- Machine Learning: Algorithms that improve through experience
- Natural Language Processing: Understanding and generating human language
- Computer Vision: Interpreting and analyzing visual information
- Robotics: Physical embodiment of AI systems

## Historical Context

The journey of AI began in the 1950s with pioneers like Alan Turing and John McCarthy. Since then, the field has experienced periods of rapid advancement and temporary setbacks, leading to today's AI renaissance.

## Looking Forward

As we stand on the brink of even more advanced AI capabilities, understanding these fundamentals becomes crucial for anyone seeking to navigate our increasingly AI-driven world.`,
          wordCount: 1800,
          status: 'completed',
          generatedAt: new Date().toISOString(),
          researchSources: ['Academic papers', 'Industry reports'],
        },
        {
          chapterNumber: 2,
          title: 'Machine Learning Fundamentals',
          content: `# Machine Learning Fundamentals

Machine learning stands as the cornerstone of modern artificial intelligence, enabling systems to learn and improve from experience without explicit programming for every task.

## Types of Machine Learning

### Supervised Learning
Supervised learning algorithms learn from labeled training data to make predictions on new, unseen data. Common applications include:
- Image classification
- Email spam detection
- Medical diagnosis

### Unsupervised Learning
These algorithms find hidden patterns in data without labeled examples:
- Customer segmentation
- Anomaly detection
- Data compression

### Reinforcement Learning
Agents learn through interaction with an environment, receiving rewards or penalties:
- Game playing (chess, Go)
- Autonomous driving
- Resource allocation

## Core Algorithms

Several fundamental algorithms form the backbone of machine learning:

**Linear Regression**: Predicts continuous values by finding the best line through data points.

**Decision Trees**: Create a tree-like model of decisions, easy to interpret and visualize.

**Neural Networks**: Inspired by biological neurons, these networks can learn complex patterns.

**Support Vector Machines**: Find optimal boundaries between different classes of data.

## The Learning Process

Machine learning follows a systematic process:
1. Data collection and preprocessing
2. Feature selection and engineering
3. Model selection and training
4. Evaluation and validation
5. Deployment and monitoring

Understanding this process is essential for successfully applying machine learning to real-world problems.`,
          wordCount: 2200,
          status: 'completed',
          generatedAt: new Date().toISOString(),
          researchSources: ['ML textbooks', 'Research papers'],
        },
        {
          chapterNumber: 3,
          title: 'Applications and Future Directions',
          content: `# Applications and Future Directions

The practical applications of artificial intelligence span virtually every industry and aspect of human life, with new use cases emerging continuously.

## Current Applications

### Healthcare
AI is revolutionizing medical care through:
- Medical imaging analysis for early disease detection
- Drug discovery and development acceleration
- Personalized treatment recommendations
- Surgical robotics and precision medicine

### Transportation
The transportation sector benefits from AI innovations:
- Autonomous vehicles and smart traffic systems
- Route optimization for logistics
- Predictive maintenance for aircraft and vehicles
- Traffic flow management in smart cities

### Finance
Financial institutions leverage AI for:
- Fraud detection and prevention
- Algorithmic trading and risk assessment
- Credit scoring and loan approval
- Customer service chatbots

### Entertainment and Media
AI enhances user experiences through:
- Recommendation systems for content
- Computer-generated visual effects
- Music and art creation
- Personalized news and content curation

## Emerging Trends

Several trends are shaping the future of AI:

**Edge AI**: Moving intelligence closer to data sources for reduced latency and improved privacy.

**Explainable AI**: Developing systems that can explain their decisions and reasoning processes.

**AI Ethics**: Establishing frameworks for responsible AI development and deployment.

**Quantum AI**: Exploring the intersection of quantum computing and artificial intelligence.

## Challenges and Considerations

As AI continues to advance, we must address important challenges:
- Privacy and data protection
- Algorithmic bias and fairness
- Job displacement and economic impact
- Safety and reliability in critical applications

## Conclusion

The future of AI holds immense promise for solving complex problems and improving human life. Success will require thoughtful development, ethical considerations, and collaborative efforts across disciplines and industries.`,
          wordCount: 2500,
          status: 'completed',
          generatedAt: new Date().toISOString(),
          researchSources: ['Industry reports', 'Future trends analysis'],
        },
      ],
      outline: {
        title: 'Artificial Intelligence: A Beginner\'s Guide',
        subtitle: 'Understanding the Fundamentals of AI',
        chapters: [
          {
            chapterNumber: 1,
            title: 'Introduction to AI',
            overview: 'Basic concepts and historical context',
            objectives: ['Define AI', 'Understand history', 'Identify key components'],
            wordCount: 1800,
            dependencies: [],
            researchRequirements: ['Historical overview', 'Basic definitions'],
          },
          {
            chapterNumber: 2,
            title: 'Machine Learning Fundamentals',
            overview: 'Core ML concepts and algorithms',
            objectives: ['Explain ML types', 'Describe algorithms', 'Understand the process'],
            wordCount: 2200,
            dependencies: [1],
            researchRequirements: ['Algorithm explanations', 'Technical concepts'],
          },
          {
            chapterNumber: 3,
            title: 'Applications and Future Directions',
            overview: 'Real-world applications and future trends',
            objectives: ['Show practical uses', 'Discuss trends', 'Address challenges'],
            wordCount: 2500,
            dependencies: [1, 2],
            researchRequirements: ['Current applications', 'Future predictions'],
          },
        ],
        totalWordCount: 6500,
        estimatedPages: 26,
      },
      requirements: {
        topic: 'Artificial Intelligence for Beginners',
        audience: {
          demographics: 'Tech-curious individuals, students, professionals',
          expertiseLevel: 'beginner',
          ageRange: '18-65',
          priorKnowledge: ['Basic computer literacy'],
          readingContext: 'educational',
        },
        author: {
          name: 'Dr. Sarah Chen',
          credentials: 'PhD in Computer Science, AI Research Director',
          background: '15 years in AI research and education',
        },
        scope: {
          purpose: 'educational',
          approach: 'practical',
          coverageDepth: 'overview',
        },
        contentOrientation: {
          primaryAngle: 'Practical understanding of AI concepts',
          secondaryAngles: ['Historical context', 'Future implications'],
          engagementStrategy: 'practical_examples',
        },
        wordCountTarget: 30000,
      },
      styleGuide: {
        tone: 'friendly',
        voice: 'active',
        perspective: 'second_person',
        formality: 'professional',
        technicalLevel: 'intermediate',
        exampleUsage: 'Clear explanations with practical examples, accessible to newcomers while maintaining technical accuracy.',
      },
    },

    complex: {
      name: 'Complex Academic Book',
      description: '8-chapter technical book with academic style',
      chapters: Array.from({ length: 8 }, (_, i) => ({
        chapterNumber: i + 1,
        title: `Advanced Topic ${i + 1}`,
        content: `# Chapter ${i + 1}: Advanced Topic ${i + 1}

This chapter explores complex theoretical concepts and their practical implementations in modern systems.

## Theoretical Foundation

The mathematical foundations underlying this topic require careful analysis of several key principles:

1. **Primary Principle**: Mathematical formulation and proof structures
2. **Secondary Considerations**: Implementation complexity and performance characteristics
3. **Practical Applications**: Real-world deployment scenarios and case studies

## Detailed Analysis

${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20)}

### Subsection A: Technical Implementation

${'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '.repeat(15)}

### Subsection B: Performance Optimization

${'Ut enim ad minim veniam, quis nostrud exercitation ullamco. '.repeat(12)}

## Case Studies

Multiple case studies demonstrate the practical application of these concepts:

- **Case Study 1**: Enterprise implementation with 10,000+ users
- **Case Study 2**: Real-time processing system handling 1M+ requests/second
- **Case Study 3**: Distributed architecture across multiple data centers

## Conclusion

This chapter has covered the essential aspects of this advanced topic, providing both theoretical grounding and practical insights for implementation.`,
        wordCount: 4000,
        status: 'completed',
        generatedAt: new Date().toISOString(),
        researchSources: ['Academic journals', 'Technical specifications'],
      })),
      outline: {
        title: 'Advanced Systems Architecture: Theory and Practice',
        subtitle: 'A Comprehensive Technical Guide',
        chapters: Array.from({ length: 8 }, (_, i) => ({
          chapterNumber: i + 1,
          title: `Advanced Topic ${i + 1}`,
          overview: `Detailed exploration of advanced concept ${i + 1}`,
          objectives: ['Master theoretical concepts', 'Implement practical solutions', 'Optimize performance'],
          wordCount: 4000,
          dependencies: i > 0 ? [i] : [],
          researchRequirements: ['Academic research', 'Technical documentation'],
        })),
        totalWordCount: 32000,
        estimatedPages: 128,
      },
      requirements: {
        topic: 'Advanced Systems Architecture',
        audience: {
          demographics: 'Senior engineers, researchers, graduate students',
          expertiseLevel: 'expert',
          ageRange: '25-55',
          priorKnowledge: ['Systems design', 'Advanced mathematics', 'Programming'],
          readingContext: 'academic',
        },
        author: {
          name: 'Prof. Michael Roberts',
          credentials: 'PhD in Computer Science, Systems Architecture Expert',
          background: '20 years in academic research and industry consulting',
        },
        scope: {
          purpose: 'reference',
          approach: 'theoretical',
          coverageDepth: 'comprehensive',
        },
        contentOrientation: {
          primaryAngle: 'Rigorous theoretical analysis with practical validation',
          secondaryAngles: ['Mathematical foundations', 'Implementation strategies'],
          engagementStrategy: 'case_studies',
        },
        wordCountTarget: 32000,
      },
      styleGuide: {
        tone: 'academic',
        voice: 'passive',
        perspective: 'third_person',
        formality: 'academic',
        technicalLevel: 'expert',
        exampleUsage: 'Formal academic writing with precise technical terminology, mathematical notation, and rigorous analysis.',
      },
    },

    academic: {
      name: 'Academic Research',
      description: '5-chapter research-focused book',
      chapters: Array.from({ length: 5 }, (_, i) => ({
        chapterNumber: i + 1,
        title: `Research Chapter ${i + 1}`,
        content: `# Chapter ${i + 1}: Research Methodology and Findings

## Abstract

This chapter presents original research findings in the field of computational science, with particular emphasis on novel algorithmic approaches and their empirical validation.

## Introduction

The research presented herein addresses fundamental questions in computational efficiency and algorithmic optimization. Through systematic experimentation and rigorous analysis, we demonstrate significant improvements over existing methodologies.

## Literature Review

Previous work in this domain has established several key principles:

1. **Foundational Studies** (Author et al., 2020): Established baseline performance metrics
2. **Recent Advances** (Researcher et al., 2023): Introduced novel optimization techniques
3. **Comparative Analysis** (Expert et al., 2023): Provided comprehensive benchmarking

## Methodology

Our experimental approach employed multiple validation techniques:

### Experimental Design
- **Sample Size**: 10,000 test cases across diverse scenarios
- **Control Variables**: System configuration, input parameters, environmental conditions
- **Metrics**: Execution time, memory usage, accuracy measures

### Data Collection
Systematic data collection protocols ensured statistical validity and reproducibility of results.

## Results and Analysis

Comprehensive analysis of experimental data reveals several significant findings:

- **Performance Improvement**: 23% average improvement over baseline methods
- **Scalability**: Linear scaling behavior maintained up to 100,000 data points
- **Robustness**: Consistent performance across varied input conditions

## Discussion

The implications of these findings extend beyond immediate applications to fundamental questions about computational complexity and optimization theory.

## Conclusions

This research contributes to the growing body of knowledge in computational optimization while opening new avenues for future investigation.

## References

[Detailed academic references would appear here in a real publication]`,
        wordCount: 6000,
        status: 'completed',
        generatedAt: new Date().toISOString(),
        researchSources: ['Peer-reviewed journals', 'Conference proceedings'],
      })),
      outline: {
        title: 'Computational Optimization: Novel Approaches and Empirical Validation',
        subtitle: 'A Research Monograph',
        chapters: Array.from({ length: 5 }, (_, i) => ({
          chapterNumber: i + 1,
          title: `Research Chapter ${i + 1}`,
          overview: `Original research findings and analysis for topic ${i + 1}`,
          objectives: ['Present methodology', 'Analyze results', 'Discuss implications'],
          wordCount: 6000,
          dependencies: i > 0 ? [i] : [],
          researchRequirements: ['Literature review', 'Empirical data', 'Statistical analysis'],
        })),
        totalWordCount: 30000,
        estimatedPages: 120,
      },
      requirements: {
        topic: 'Computational Optimization Research',
        audience: {
          demographics: 'Academic researchers, PhD students, industry R&D',
          expertiseLevel: 'expert',
          ageRange: '25-65',
          priorKnowledge: ['Advanced mathematics', 'Research methodology', 'Statistical analysis'],
          readingContext: 'academic',
        },
        author: {
          name: 'Dr. Elena Vasquez',
          credentials: 'PhD in Mathematics, Research Professor',
          background: 'Principal Investigator with 50+ publications in computational optimization',
        },
        scope: {
          purpose: 'reference',
          approach: 'theoretical',
          coverageDepth: 'exhaustive',
        },
        contentOrientation: {
          primaryAngle: 'Original research contributions with rigorous validation',
          secondaryAngles: ['Methodological innovation', 'Empirical validation'],
          engagementStrategy: 'step_by_step',
        },
        wordCountTarget: 30000,
      },
      styleGuide: {
        tone: 'academic',
        voice: 'passive',
        perspective: 'third_person',
        formality: 'academic',
        technicalLevel: 'expert',
        exampleUsage: 'Scholarly writing with extensive citations, mathematical proofs, and empirical validation. Formal academic tone throughout.',
      },
    },
  };
}

/**
 * Create mock workflow state for testing
 */
function createTestWorkflowState(scenario: TestScenario): WorkflowState {
  return {
    sessionId: `test-formatting-${Date.now()}`,
    userId: 'test-user',
    currentStage: 'formatting',
    status: 'active',
    userPrompt: `Create a book about ${scenario.requirements.topic}`,
    chapters: scenario.chapters,
    outline: scenario.outline,
    requirements: scenario.requirements,
    styleGuide: scenario.styleGuide,
    progress: {
      currentStageProgress: 90,
      overallProgress: 85,
      chaptersCompleted: scenario.chapters.length,
      totalChapters: scenario.chapters.length,
    },
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Save PDF buffer to file for manual inspection
 */
async function savePDFToFile(pdfBuffer: Buffer, scenarioName: string): Promise<string> {
  const outputDir = path.join(process.cwd(), 'test-output');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `formatting-test-${scenarioName}-${Date.now()}.pdf`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, pdfBuffer);
  return filepath;
}

/**
 * Test formatting node with specified scenario
 */
async function testFormattingScenario(scenarioName: string): Promise<void> {
  const scenarios = createTestScenarios();
  const scenario = scenarios[scenarioName];

  if (!scenario) {
    console.error(`❌ Unknown scenario: ${scenarioName}`);
    console.log(`Available scenarios: ${Object.keys(scenarios).join(', ')}`);
    return;
  }

  console.log(`\n🧪 Testing Formatting Node: ${scenario.name}`);
  console.log(`📝 Description: ${scenario.description}`);
  console.log(`📊 Chapters: ${scenario.chapters.length}`);
  console.log(`📄 Total Words: ${scenario.outline.totalWordCount.toLocaleString()}`);
  console.log(`📖 Estimated Pages: ${scenario.outline.estimatedPages}`);

  try {
    // Create formatting node and test state
    const formattingNode = new FormattingNode();
    const testState = createTestWorkflowState(scenario);

    console.log('\n⏳ Validating workflow state...');
    const isValid = formattingNode.validate(testState);
    console.log(`✅ Validation result: ${isValid ? 'PASSED' : 'FAILED'}`);

    if (!isValid) {
      console.error('❌ Test state validation failed');
      return;
    }

    console.log('\n⏳ Executing formatting node...');
    const startTime = Date.now();

    const result = await formattingNode.execute(testState);

    const executionTime = Date.now() - startTime;
    console.log(`✅ Formatting completed in ${executionTime}ms`);

    // Validate results
    console.log('\n📋 Formatting Results:');
    console.log(`📄 Page Count: ${result.formattingResult?.pageCount}`);
    console.log(`📊 Total Words: ${result.formattingResult?.totalWordCount?.toLocaleString()}`);
    console.log(`💾 File Size: ${(result.formattingResult?.fileSize || 0 / 1024).toFixed(2)} KB`);
    console.log(`🎯 Stage Transition: ${testState.currentStage} → ${result.currentStage}`);
    console.log(`📈 Progress: ${result.progress.currentStageProgress}%`);

    // Save PDF to file for manual inspection
    if (result.formattingResult?.pdfBuffer) {
      console.log('\n💾 Saving PDF for manual inspection...');
      const savedPath = await savePDFToFile(result.formattingResult.pdfBuffer, scenarioName);
      console.log(`📁 PDF saved to: ${savedPath}`);
    }

    // Performance analysis
    console.log('\n⚡ Performance Analysis:');
    console.log(`⏱️  Processing Speed: ${((result.formattingResult?.totalWordCount || 0) / (executionTime / 1000)).toFixed(0)} words/second`);
    console.log(`📄 Page Generation: ${((result.formattingResult?.pageCount || 0) / (executionTime / 1000)).toFixed(2)} pages/second`);

    console.log(`\n✅ ${scenario.name} test completed successfully!`);

  } catch (error) {
    console.error(`\n❌ Formatting test failed:`, error);
    console.error('Error details:', (error as Error).message);

    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

/**
 * Run multiple test scenarios
 */
async function runAllTests(): Promise<void> {
  const scenarios = createTestScenarios();

  console.log('🧪 Running all formatting node test scenarios...\n');

  for (const scenarioName of Object.keys(scenarios)) {
    try {
      await testFormattingScenario(scenarioName);
      console.log('\n' + '='.repeat(80));
    } catch (error) {
      console.error(`❌ Failed to complete ${scenarioName} test:`, error);
    }
  }

  console.log('\n🎉 All formatting tests completed!');
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const scenarioArg = args.find(arg => arg.startsWith('--scenario='));

  if (scenarioArg) {
    const scenarioName = scenarioArg.split('=')[1];
    await testFormattingScenario(scenarioName);
  } else {
    console.log('🧪 Formatting Node Testing Script');
    console.log('Usage: npx tsx scripts/test-formatting-node.ts [--scenario=simple|complex|academic]');
    console.log('       npx tsx scripts/test-formatting-node.ts (runs all scenarios)');
    console.log('');

    await runAllTests();
  }
}

// Execute main function
if (require.main === module) {
  main().catch(console.error);
}