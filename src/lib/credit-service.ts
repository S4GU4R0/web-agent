import { db } from './db';

export interface CreditTransaction {
  id: string;
  type: 'top-up' | 'usage';
  amount: number; // in "credits" (e.g., 1 credit = $0.01)
  description: string;
  timestamp: number;
}

export class CreditService {
  async getBalance(): Promise<number> {
    const balance = await db.settings.get('credit_balance');
    return balance?.value || 0;
  }

  async addCredits(amount: number, description: string = 'Top-up') {
    const currentBalance = await this.getBalance();
    const newBalance = currentBalance + amount;
    await db.settings.put({ key: 'credit_balance', value: newBalance });
    
    // Track transaction (we might need a new table for this, or just use settings with a list)
    // For now, let's keep it simple and just update balance.
    // In a real app, we'd have a 'transactions' table.
  }

  async deductCredits(amount: number, description: string) {
    const currentBalance = await this.getBalance();
    const newBalance = Math.max(0, currentBalance - amount);
    await db.settings.put({ key: 'credit_balance', value: newBalance });
  }

  async hasFeature(featureKey: string): Promise<boolean> {
    const feature = await db.settings.get(`feature_${featureKey}`);
    return !!feature?.value;
  }

  async unlockFeature(featureKey: string) {
    await db.settings.put({ key: `feature_${featureKey}`, value: true });
  }

  calculateCost(tokens: number, modelId: string): number {
    // Simplified cost calculation
    // e.g., $0.01 per 1000 tokens = 1 credit per 1000 tokens
    const rate = 0.001; // credits per token
    return tokens * rate;
  }
}

export const creditService = new CreditService();
