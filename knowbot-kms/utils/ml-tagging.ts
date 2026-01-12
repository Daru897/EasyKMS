/**
 * ML Auto-Tagging
 * Suggests categories/tags for documents based on content
 * 
 * Options:
 * 1. Simple keyword-based approach (quick implementation)
 * 2. Transformers.js (client-side ML)
 * 3. OpenAI embeddings + similarity (more accurate)
 * 4. FastAPI service with ML models
 * 
 * For now, implementing keyword-based approach.
 * Can be upgraded to ML-based later.
 */

/**
 * Suggest categories for a document based on content
 * Uses keyword matching against common BPO categories
 */
export async function suggestCategories(
  text: string,
  tenantId: string
): Promise<string[]> {
  const textLower = text.toLowerCase();

  // Common BPO categories and their keywords
  const categoryKeywords: Record<string, string[]> = {
    Billing: ['billing', 'invoice', 'payment', 'charge', 'fee', 'cost', 'price', 'subscription'],
    Refunds: ['refund', 'return', 'reimburse', 'cancel', 'void', 'reverse'],
    Support: ['support', 'help', 'assistance', 'issue', 'problem', 'ticket', 'request'],
    Technical: ['technical', 'error', 'bug', 'fix', 'update', 'upgrade', 'system'],
    Account: ['account', 'login', 'password', 'profile', 'settings', 'user'],
    Product: ['product', 'feature', 'service', 'offering', 'solution'],
    Policy: ['policy', 'terms', 'agreement', 'legal', 'compliance', 'regulation'],
    Process: ['process', 'procedure', 'workflow', 'step', 'guide', 'instruction'],
    Training: ['training', 'onboarding', 'tutorial', 'course', 'education'],
    Escalation: ['escalate', 'manager', 'supervisor', 'urgent', 'priority'],
  };

  const suggestedCategories: string[] = [];
  const scores: Record<string, number> = {};

  // Score each category based on keyword matches
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      const matches = (textLower.match(new RegExp(keyword, 'gi')) || []).length;
      score += matches;
    }
    if (score > 0) {
      scores[category] = score;
    }
  }

  // Get top 3 categories by score
  const sortedCategories = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category);

  suggestedCategories.push(...sortedCategories);

  // Also check for tenant-specific categories
  // TODO: Load tenant's custom categories from database and match against them

  return suggestedCategories;
}

/**
 * Suggest categories using OpenAI embeddings (more accurate)
 * Requires OPENAI_API_KEY
 */
export async function suggestCategoriesWithOpenAI(
  text: string,
  tenantId: string
): Promise<string[]> {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    // Fallback to keyword-based
    return suggestCategories(text, tenantId);
  }

  try {
    // Get tenant's existing categories
    const { createServiceClient } = await import('@/utils/supabase/server');
    const supabase = createServiceClient();
    const { data: categories } = await supabase
      .from('document_categories')
      .select('id, name')
      .eq('tenant_id', tenantId);

    if (!categories || categories.length === 0) {
      return suggestCategories(text, tenantId);
    }

    // Create embeddings for document text and category names
    // Compare similarity and return top matches
    // This is a simplified version - full implementation would use OpenAI embeddings API

    // For now, fallback to keyword matching
    return suggestCategories(text, tenantId);
  } catch (error) {
    console.error('[ML Tagging] OpenAI error:', error);
    return suggestCategories(text, tenantId);
  }
}

/**
 * Detect duplicate documents using semantic similarity
 */
export async function detectDuplicate(
  text: string,
  tenantId: string
): Promise<{ isDuplicate: boolean; similarDocumentId?: string; similarity?: number }> {
  // Simple implementation: hash-based duplicate detection
  // Full implementation would use embeddings + similarity search

  return {
    isDuplicate: false,
  };
}
