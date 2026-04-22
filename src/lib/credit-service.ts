import { db } from './db';

export interface CreditTransaction {
  id: string;
  type: 'top-up' | 'usage';
  amount: number; // in "credits" (e.g., 1 credit = $0.01)
  description: string;
  timestamp: number;
}

export const FEATURE_COSTS: Record<string, number> = {
  'realtime_voice': 1000, // 1000 credits = $10.00
  'cloud_sync': 500,     // 500 credits = $5.00
  'encryption': 500,     // 500 credits = $5.00
};

export class CreditService {
  async getBalance(): Promise<number> {
    const balance = await db.settings.get('credit_balance');
    return balance?.value || 0;
  }

  async addCredits(amount: number, description: string = 'Top-up') {
    // amount is in credits
    const currentBalance = await this.getBalance();
    const newBalance = currentBalance + amount;
    await db.settings.put({ key: 'credit_balance', value: newBalance });
  }

  async deductCredits(amount: number, description: string) {
    // amount is in credits
    const currentBalance = await this.getBalance();
    const newBalance = Math.max(0, currentBalance - amount);
    await db.settings.put({ key: 'credit_balance', value: newBalance });
  }

  async hasFeature(featureKey: string): Promise<boolean> {
    const feature = await db.settings.get(`feature_${featureKey}`);
    return !!feature?.value;
  }

  async unlockFeature(featureKey: string) {
    const isUnlocked = await this.hasFeature(featureKey);
    if (isUnlocked) return;

    const cost = FEATURE_COSTS[featureKey];
    if (cost === undefined) throw new Error(`Unknown feature: ${featureKey}`);

    const currentBalance = await this.getBalance();
    if (currentBalance < cost) {
      throw new Error(`Insufficient credits to unlock ${featureKey}. Cost: ${cost} credits.`);
    }

    await this.deductCredits(cost, `Unlock feature: ${featureKey}`);
    await db.settings.put({ key: `feature_${featureKey}`, value: true });
  }

  calculateCost(tokens: number, modelId: string): number {
    // Returns cost in credits
    // e.g., $0.01 per 1000 tokens = 1 credit per 1000 tokens
    const rate = 0.001; // credits per token
    return Math.ceil(tokens * rate);
  }
}

export const creditService = new CreditService();
