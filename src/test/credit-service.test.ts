import { describe, it, expect, beforeEach, vi } from 'vitest';
import { creditService, FEATURE_COSTS } from '../lib/credit-service';
import { db } from '../lib/db';

describe('CreditService', () => {
  beforeEach(async () => {
    await db.settings.clear();
    // Set initial balance
    await db.settings.put({ key: 'credit_balance', value: 1000 });
  });

  it('should get current balance', async () => {
    const balance = await creditService.getBalance();
    expect(balance).toBe(1000);
  });

  it('should add credits', async () => {
    await creditService.addCredits(500);
    const balance = await creditService.getBalance();
    expect(balance).toBe(1500);
  });

  it('should deduct credits', async () => {
    await creditService.deductCredits(200, 'Usage');
    const balance = await creditService.getBalance();
    expect(balance).toBe(800);
  });

  it('should not allow negative balance when deducting', async () => {
    await creditService.deductCredits(2000, 'Big spend');
    const balance = await creditService.getBalance();
    expect(balance).toBe(0);
  });

  it('should check if feature is unlocked', async () => {
    const unlocked = await creditService.hasFeature('realtime_voice');
    expect(unlocked).toBe(false);

    await db.settings.put({ key: 'feature_realtime_voice', value: true });
    const unlockedNow = await creditService.hasFeature('realtime_voice');
    expect(unlockedNow).toBe(true);
  });

  it('should unlock a feature if balance is sufficient', async () => {
    const cost = FEATURE_COSTS['realtime_voice'];
    await creditService.unlockFeature('realtime_voice');
    
    const balance = await creditService.getBalance();
    expect(balance).toBe(1000 - cost);
    
    const unlocked = await creditService.hasFeature('realtime_voice');
    expect(unlocked).toBe(true);
  });

  it('should throw error when unlocking unknown feature', async () => {
    await expect(creditService.unlockFeature('non_existent')).rejects.toThrow('Unknown feature');
  });

  it('should throw error if balance is insufficient to unlock', async () => {
    await db.settings.put({ key: 'credit_balance', value: 100 });
    await expect(creditService.unlockFeature('realtime_voice')).rejects.toThrow('Insufficient credits');
  });

  it('should not deduct twice if feature already unlocked', async () => {
    await creditService.unlockFeature('realtime_voice');
    const balanceAfterFirst = await creditService.getBalance();
    
    await creditService.unlockFeature('realtime_voice');
    const balanceAfterSecond = await creditService.getBalance();
    
    expect(balanceAfterFirst).toBe(balanceAfterSecond);
  });

  it('should calculate cost correctly', () => {
    const tokens = 1500;
    const cost = creditService.calculateCost(tokens, 'gpt-4o');
    // rate is 0.001 per token, so 1500 * 0.001 = 1.5, ceil is 2
    expect(cost).toBe(2);
  });
});
