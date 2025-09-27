// Debug validation issue by running just conversation -> outline -> chapter spawning

import { ConversationNode } from '@/lib/agents/nodes/conversation';
import { OutlineNode } from '@/lib/agents/nodes/outline';
import { ChapterSpawningNode } from '@/lib/agents/nodes/chapterSpawning';
import { WorkflowState } from '@/types';

async function debugValidation() {
  console.log('🔍 DEBUGGING VALIDATION ISSUE');

  // Step 1: Create initial state
  const initialState: WorkflowState = {
    sessionId: 'debug-validation-test',
    currentStage: 'conversation',
    userPrompt: 'Python web scraping quick start',
    progress: 0,
    updatedAt: new Date().toISOString(),
  };

  // Step 2: Run conversation node
  console.log('\n💬 Running conversation node...');
  const conversationNode = new ConversationNode();
  const requirementsState = await conversationNode.execute(initialState);

  console.log('✅ Conversation completed');
  console.log('📋 Requirements keys:', Object.keys(requirementsState.requirements || {}));
  if (requirementsState.requirements) {
    console.log('📋 Requirements structure:', JSON.stringify(requirementsState.requirements, null, 2));
  }

  // Step 3: Run outline node
  console.log('\n📋 Running outline node...');
  const outlineNode = new OutlineNode();
  const outlineState = await outlineNode.execute(requirementsState);

  console.log('✅ Outline completed');
  console.log('📚 Outline keys:', Object.keys(outlineState.outline || {}));

  // Step 4: TEST the validation explicitly
  console.log('\n🔄 Testing chapter spawning validation...');
  const spawningNode = new ChapterSpawningNode();

  // Call validate method directly
  console.log('Testing validation on outline state:');
  const isValid = spawningNode.validate(outlineState);
  console.log('Validation result:', isValid);

  if (!isValid) {
    console.log('\n❌ Validation failed - this is the issue!');
    console.log('Need to examine what fields are missing or incorrect');
  } else {
    console.log('\n✅ Validation passed - running execution...');
    const spawnedState = await spawningNode.execute(outlineState);
    console.log('✅ Chapter spawning completed successfully');
  }
}

debugValidation().catch(error => {
  console.error('❌ DEBUG TEST FAILED:', error);
  process.exit(1);
});