#!/usr/bin/env tsx
// Interactive Testing Script for Consistency Review Node
// Tests real GPT-5 integration and consistency analysis capabilities
// Run with: npx tsx scripts/test-consistency-review.ts [scenario]

import { ConsistencyReviewNode } from '@/lib/agents/nodes/consistencyReview';
import { WorkflowState, ChapterResult, BookRequirements, StyleGuide } from '@/types';
import { logger } from '@/lib/errors/exports';

// Test scenarios with different consistency challenges
const TEST_SCENARIOS = {
  simple: {
    name: 'Simple AI Guide (Good Consistency)',
    chapters: [
      {
        chapterNumber: 1,
        title: 'Introduction to Artificial Intelligence',
        content: `Artificial intelligence (AI) represents one of the most significant technological advances of our time. In this comprehensive introduction, we will explore the fundamentals of AI and machine learning.

Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed. Throughout this book, we will maintain consistency in our use of terminology and approach.

This chapter establishes the foundation for understanding AI concepts that we will build upon in subsequent chapters. By the end of this introduction, you will have a clear understanding of what artificial intelligence means and how machine learning fits into the broader AI landscape.`,
        wordCount: 1200,
        status: 'completed',
        dependencies: [],
        researchSources: [],
        completedAt: '2025-09-22T10:00:00Z',
      },
      {
        chapterNumber: 2,
        title: 'Machine Learning Fundamentals',
        content: `Machine learning, as introduced in Chapter 1, is the cornerstone of modern artificial intelligence systems. This chapter delves deeper into the core concepts and methodologies that make machine learning possible.

We will examine three primary types of machine learning: supervised learning, unsupervised learning, and reinforcement learning. Each approach serves different purposes and applications within the broader artificial intelligence ecosystem.

Supervised learning uses labeled training data to teach algorithms to make predictions. Unsupervised learning finds patterns in data without labeled examples. Reinforcement learning trains agents through rewards and penalties. These fundamental approaches form the basis for all machine learning applications we will discuss throughout this book.`,
        wordCount: 1350,
        status: 'completed',
        dependencies: [1],
        researchSources: [],
        completedAt: '2025-09-22T11:00:00Z',
      },
    ],
  },

  inconsistent: {
    name: 'AI Guide with Consistency Issues',
    chapters: [
      {
        chapterNumber: 1,
        title: 'Intro to AI',
        content: `AI is really cool and powerful. In this chapter we're gonna learn about artificial intelligence and how it works. Machine Learning (ML) is part of AI that helps computers learn stuff.

This book will teach you everything about AI and ML. We'll use simple examples so anyone can understand. The writing style here is casual and friendly.

Artificial Intelligence has many applications in business, healthcare, and technology. We will explore these in detail.`,
        wordCount: 800,
        status: 'completed',
        dependencies: [],
        researchSources: [],
        completedAt: '2025-09-22T10:00:00Z',
      },
      {
        chapterNumber: 2,
        title: 'Machine Learning Principles',
        content: `Machine learning represents a sophisticated computational paradigm wherein algorithmic systems acquire knowledge through empirical observation and statistical inference. This chapter elucidates the fundamental theoretical constructs underlying modern ML methodologies.

The taxonomy of machine learning encompasses supervised learning paradigms, unsupervised discovery algorithms, and reinforcement-based optimization techniques. Each classification exhibits distinct characteristics with respect to data requirements and computational complexity.

Supervised learning algorithms utilize labeled training datasets to establish predictive mappings between input features and target variables. The mathematical foundations involve optimization of loss functions through gradient-based approaches.`,
        wordCount: 1500,
        status: 'completed',
        dependencies: [1],
        researchSources: [],
        completedAt: '2025-09-22T11:00:00Z',
      },
      {
        chapterNumber: 3,
        title: 'Neural Nets and Deep Learning',
        content: `Neural networks are like the brain of computers. They have lots of neurons that work together to solve problems. Deep learning uses really big neural networks with many layers.

In this chapter, we'll learn how neural networks process information. Each neuron takes inputs, does some math, and produces an output. When you connect many neurons together, you get a neural network.

Deep learning has revolutionized AI. It's used in image recognition, natural language processing, and game playing. Companies like Google and Facebook use deep learning for their AI systems.`,
        wordCount: 900,
        status: 'completed',
        dependencies: [1, 2],
        researchSources: [],
        completedAt: '2025-09-22T12:00:00Z',
      },
    ],
  },

  technical: {
    name: 'Technical AI Guide (Complex Consistency)',
    chapters: [
      {
        chapterNumber: 1,
        title: 'Mathematical Foundations of Artificial Intelligence',
        content: `The mathematical foundations of artificial intelligence encompass linear algebra, calculus, probability theory, and optimization theory. Understanding these mathematical concepts is essential for comprehending advanced AI algorithms and their implementations.

Linear algebra provides the framework for vector spaces and matrix operations that underlie neural network computations. Eigenvalues and eigenvectors play crucial roles in dimensionality reduction techniques such as Principal Component Analysis (PCA).

Calculus, particularly differential calculus, enables gradient-based optimization methods used in training machine learning models. The chain rule is fundamental to backpropagation algorithms in neural networks.

Probability theory forms the basis for statistical machine learning approaches, including Bayesian inference and probabilistic graphical models. Information theory concepts like entropy and mutual information guide feature selection and model evaluation.`,
        wordCount: 1800,
        status: 'completed',
        dependencies: [],
        researchSources: [],
        completedAt: '2025-09-22T10:00:00Z',
      },
      {
        chapterNumber: 2,
        title: 'Optimization Algorithms in Machine Learning',
        content: `Optimization algorithms serve as the computational engines that drive machine learning model training. This chapter examines gradient descent variants, evolutionary algorithms, and modern optimization techniques used in deep learning.

Stochastic Gradient Descent (SGD) and its variants, including Adam, RMSprop, and AdaGrad, form the backbone of neural network training. Each optimizer addresses specific challenges related to convergence speed and stability.

The mathematical formulation of SGD involves iterative parameter updates: θ(t+1) = θ(t) - α∇J(θ), where θ represents model parameters, α is the learning rate, and ∇J(θ) is the gradient of the cost function.

Advanced optimization techniques include momentum-based methods that accelerate convergence and adaptive learning rate algorithms that adjust step sizes dynamically. Second-order methods like L-BFGS provide faster convergence but require significant computational resources.`,
        wordCount: 1650,
        status: 'completed',
        dependencies: [1],
        researchSources: [],
        completedAt: '2025-09-22T11:00:00Z',
      },
      {
        chapterNumber: 3,
        title: 'Deep Neural Network Architectures',
        content: `Deep neural network architectures represent sophisticated computational graphs designed to model complex patterns in high-dimensional data. This chapter explores convolutional neural networks (CNNs), recurrent neural networks (RNNs), and transformer architectures.

Convolutional Neural Networks excel at processing grid-like data structures such as images. The convolution operation: (f * g)(t) = ∫f(τ)g(t-τ)dτ captures local spatial patterns through learnable filters.

Recurrent Neural Networks process sequential data through hidden state propagation: h(t) = f(Wxh*x(t) + Whh*h(t-1) + bh). LSTM and GRU variants address the vanishing gradient problem in standard RNNs.

Transformer architectures revolutionized natural language processing through self-attention mechanisms: Attention(Q,K,V) = softmax(QK^T/√dk)V. Multi-head attention enables parallel processing of different representation subspaces.`,
        wordCount: 1750,
        status: 'completed',
        dependencies: [1, 2],
        researchSources: [],
        completedAt: '2025-09-22T12:00:00Z',
      },
    ],
  },
};

// Test requirements and style guides
const TEST_REQUIREMENTS: Record<string, BookRequirements> = {
  simple: {
    topic: 'Artificial Intelligence for Beginners',
    audience: {
      demographic: 'technology enthusiasts',
      expertiseLevel: 'beginner',
      ageRange: '25-45',
      readingContext: 'personal learning',
    },
    author: {
      name: 'AI Expert',
      credentials: 'PhD in Computer Science',
      background: 'AI researcher and educator',
    },
    scope: {
      primaryFocus: 'foundational understanding',
      coverage: 'comprehensive introduction',
      approach: 'practical with examples',
    },
    contentOrientation: {
      angle: 'accessible and practical',
      engagementStrategy: 'clear explanations and examples',
    },
    wordCountTarget: 30000,
  },

  inconsistent: {
    topic: 'AI Guide with Mixed Styles',
    audience: {
      demographic: 'general readers',
      expertiseLevel: 'mixed levels',
      ageRange: '18-65',
      readingContext: 'casual reading',
    },
    author: {
      name: 'Mixed Author',
      credentials: 'Various contributors',
      background: 'Different writing backgrounds',
    },
    scope: {
      primaryFocus: 'broad overview',
      coverage: 'inconsistent depth',
      approach: 'mixed approaches',
    },
    contentOrientation: {
      angle: 'varied presentation',
      engagementStrategy: 'inconsistent engagement',
    },
    wordCountTarget: 25000,
  },

  technical: {
    topic: 'Advanced AI: Mathematical and Computational Foundations',
    audience: {
      demographic: 'computer science professionals',
      expertiseLevel: 'advanced',
      ageRange: '25-50',
      readingContext: 'professional development',
    },
    author: {
      name: 'Dr. Technical Expert',
      credentials: 'PhD in Machine Learning',
      background: 'Senior AI researcher',
    },
    scope: {
      primaryFocus: 'mathematical rigor',
      coverage: 'deep technical coverage',
      approach: 'theoretical with proofs',
    },
    contentOrientation: {
      angle: 'mathematically rigorous',
      engagementStrategy: 'detailed technical exposition',
    },
    wordCountTarget: 45000,
  },
};

const TEST_STYLE_GUIDES: Record<string, StyleGuide> = {
  simple: {
    tone: 'friendly',
    voice: 'instructional',
    perspective: 'second person',
    formality: 'casual',
    technicalLevel: 'beginner',
    exampleUsage: 'frequent',
    structurePreference: 'clear progression',
  },

  inconsistent: {
    tone: 'mixed',
    voice: 'inconsistent',
    perspective: 'varies',
    formality: 'inconsistent',
    technicalLevel: 'varies',
    exampleUsage: 'inconsistent',
    structurePreference: 'loose',
  },

  technical: {
    tone: 'formal',
    voice: 'authoritative',
    perspective: 'third person',
    formality: 'academic',
    technicalLevel: 'advanced',
    exampleUsage: 'mathematical',
    structurePreference: 'rigorous logical progression',
  },
};

/**
 * Create test workflow state for a given scenario
 */
function createTestState(scenarioKey: string): WorkflowState {
  const scenario = TEST_SCENARIOS[scenarioKey as keyof typeof TEST_SCENARIOS];
  const requirements = TEST_REQUIREMENTS[scenarioKey];
  const styleGuide = TEST_STYLE_GUIDES[scenarioKey];

  if (!scenario || !requirements || !styleGuide) {
    throw new Error(`Unknown scenario: ${scenarioKey}`);
  }

  return {
    sessionId: `test-consistency-${scenarioKey}-${Date.now()}`,
    userId: 'test-user',
    currentStage: 'consistency_review',
    status: 'active',
    userPrompt: `Test consistency review for ${scenario.name}`,
    chapters: scenario.chapters,
    requirements,
    styleGuide,
    progress: {
      currentStageProgress: 0,
      overallProgress: 60,
      chaptersCompleted: scenario.chapters.length,
      totalChapters: scenario.chapters.length,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Run consistency review test for a specific scenario
 */
async function testConsistencyReview(scenarioKey: string): Promise<void> {
  const scenario = TEST_SCENARIOS[scenarioKey as keyof typeof TEST_SCENARIOS];

  console.log(`\n🔍 Testing Consistency Review: ${scenario.name}`);
  console.log('='.repeat(60));

  try {
    // Create test state
    const state = createTestState(scenarioKey);
    console.log(`📚 Chapters: ${state.chapters.length}`);
    console.log(`📖 Total words: ${state.chapters.reduce((sum, ch) => sum + ch.wordCount, 0)}`);
    console.log(`🎯 Target audience: ${state.requirements!.audience.expertiseLevel}`);
    console.log(`📝 Style: ${state.styleGuide!.tone}, ${state.styleGuide!.formality}`);

    // Create and execute consistency review node
    const startTime = Date.now();
    const consistencyNode = new ConsistencyReviewNode();

    console.log('\n⚙️  Executing consistency review...');
    const result = await consistencyNode.execute(state);
    const executionTime = Date.now() - startTime;

    // Display results
    console.log(`\n✅ Consistency review completed in ${executionTime}ms`);
    console.log(`🎯 Overall Consistency Score: ${result.consistencyReview!.overallConsistencyScore}/100`);
    console.log(`🔍 Total Issues Found: ${result.consistencyReview!.totalIssuesFound}`);

    // Chapter-by-chapter analysis
    console.log('\n📊 Chapter Analysis:');
    result.consistencyReview!.chapterResults.forEach((chapterResult, index) => {
      console.log(`\n  Chapter ${chapterResult.chapterNumber}: ${chapterResult.title}`);
      console.log(`  Score: ${chapterResult.consistencyScore}/100`);
      console.log(`  Issues: ${chapterResult.issues.length}`);

      if (chapterResult.issues.length > 0) {
        chapterResult.issues.forEach((issue, issueIndex) => {
          console.log(`    ${issueIndex + 1}. [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.description}`);
          if (issue.suggestion) {
            console.log(`       💡 Suggestion: ${issue.suggestion}`);
          }
        });
      }

      if (chapterResult.suggestions.length > 0) {
        console.log(`  Suggestions:`);
        chapterResult.suggestions.forEach((suggestion, i) => {
          console.log(`    • ${suggestion}`);
        });
      }
    });

    // Global issues
    if (result.consistencyReview!.globalIssues.length > 0) {
      console.log('\n🌐 Global Issues:');
      result.consistencyReview!.globalIssues.forEach((issue, index) => {
        console.log(`  ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.description}`);
        if (issue.relatedChapters && issue.relatedChapters.length > 0) {
          console.log(`     Affects chapters: ${issue.relatedChapters.join(', ')}`);
        }
        if (issue.suggestion) {
          console.log(`     💡 Suggestion: ${issue.suggestion}`);
        }
      });
    }

    // Recommended actions
    if (result.consistencyReview!.recommendedActions.length > 0) {
      console.log('\n📋 Recommended Actions:');
      result.consistencyReview!.recommendedActions.forEach((action, index) => {
        console.log(`  ${index + 1}. ${action}`);
      });
    }

    // Terminology map
    const terminologyEntries = Object.entries(result.consistencyReview!.terminologyMap);
    if (terminologyEntries.length > 0) {
      console.log('\n📚 Terminology Standardization:');
      terminologyEntries.forEach(([term, standardized]) => {
        console.log(`  "${term}" → "${standardized}"`);
      });
    }

    // Summary
    console.log('\n📈 Summary:');
    console.log(`  • Overall quality: ${result.consistencyReview!.overallConsistencyScore >= 85 ? 'Excellent' :
                                         result.consistencyReview!.overallConsistencyScore >= 70 ? 'Good' :
                                         result.consistencyReview!.overallConsistencyScore >= 50 ? 'Needs improvement' : 'Poor'}`);
    console.log(`  • Issues severity: ${result.consistencyReview!.globalIssues.filter(i => i.severity === 'high').length} high, ${result.consistencyReview!.globalIssues.filter(i => i.severity === 'medium').length} medium, ${result.consistencyReview!.globalIssues.filter(i => i.severity === 'low').length} low`);
    console.log(`  • Next stage: ${result.currentStage}`);

  } catch (error) {
    console.error('❌ Consistency review failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const scenario = args[0] || 'simple';

  console.log('🚀 Consistency Review Node Testing Script');
  console.log('==========================================');

  if (scenario === 'all') {
    // Test all scenarios
    for (const key of Object.keys(TEST_SCENARIOS)) {
      await testConsistencyReview(key);
      console.log('\n' + '─'.repeat(60));
    }
  } else if (scenario in TEST_SCENARIOS) {
    // Test specific scenario
    await testConsistencyReview(scenario);
  } else {
    // Show help
    console.log('\nAvailable test scenarios:');
    Object.entries(TEST_SCENARIOS).forEach(([key, scenario]) => {
      console.log(`  ${key.padEnd(12)} - ${scenario.name}`);
    });
    console.log(`  all          - Run all scenarios`);
    console.log('\nUsage: npx tsx scripts/test-consistency-review.ts [scenario]');
    console.log('Example: npx tsx scripts/test-consistency-review.ts inconsistent');
    return;
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}