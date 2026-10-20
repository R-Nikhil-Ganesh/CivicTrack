import { describe, it, expect } from 'vitest';
import {
  analyzeCivicQuery,
  MUNICIPAL_DEPARTMENTS,
  MUNICIPAL_HELPLINES,
  QUICK_PROMPTS,
} from './civicKnowledge';

describe('CivicKnowledge & NLP Query Classifier', () => {
  describe('Department & Knowledge Constants', () => {
    it('should have all 4 core municipal departments configured with SLAs', () => {
      const names = MUNICIPAL_DEPARTMENTS.map((d) => d.name);
      expect(names).toContain('Roads');
      expect(names).toContain('Water Supply');
      expect(names).toContain('Waste Management');
      expect(names).toContain('Electricity');

      MUNICIPAL_DEPARTMENTS.forEach((dept) => {
        expect(dept.sla).toBeTruthy();
        expect(dept.phone).toBeTruthy();
        expect(dept.keywords.length).toBeGreaterThan(5);
      });
    });

    it('should include 24/7 emergency helplines', () => {
      expect(MUNICIPAL_HELPLINES.length).toBeGreaterThan(4);
      const numbers = MUNICIPAL_HELPLINES.map((h) => h.number);
      expect(numbers).toContain('1916');
      expect(numbers).toContain('1912');
    });

    it('should provide quick prompt templates', () => {
      expect(QUICK_PROMPTS.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('analyzeCivicQuery() Intent Classification', () => {
    it('should detect 24-character hexadecimal MongoDB ObjectId as Issue ID lookup', () => {
      const hexId = '65dfa21234567890abcdef12';
      const result = analyzeCivicQuery(`Can you check the progress of issue ${hexId}?`);
      expect(result.actionType).toBe('view_issue');
      expect(result.actionUrl).toBe(`/issues/${hexId}`);
      expect(result.actionText).toContain(hexId.slice(-6));
    });

    it('should respond to greetings with welcome onboarding text', () => {
      const result = analyzeCivicQuery('Hello CivicBot');
      expect(result.text).toContain('CivicBot');
      expect(result.text).toContain('24/7 City Municipal Assistant');
      expect(result.chips.length).toBeGreaterThan(0);
    });

    it('should return verified helplines for emergency or contact queries', () => {
      const result = analyzeCivicQuery('What is the emergency helpline phone number?');
      expect(result.text).toContain('1916');
      expect(result.text).toContain('1912');
      expect(result.text).toContain('112');
    });

    it('should route "pothole on 100ft road" to Roads department', () => {
      const result = analyzeCivicQuery('There is a dangerous deep pothole and crater on the road');
      expect(result.category).toBe('Roads');
      expect(result.actionType).toBe('report');
      expect(result.actionUrl).toContain('category=Roads');
    });

    it('should route "water leakage pipe burst" to Water Supply department', () => {
      const result = analyzeCivicQuery('Drinking water pipe burst and clean water is leaking');
      expect(result.category).toBe('Water Supply');
      expect(result.actionType).toBe('report');
      expect(result.actionUrl).toContain('category=Water%20Supply');
    });

    it('should route "garbage dumpster overflow" to Waste Management department', () => {
      const result = analyzeCivicQuery('Municipal garbage bin is overflowing with rotten trash and waste');
      expect(result.category).toBe('Waste Management');
      expect(result.actionType).toBe('report');
      expect(result.actionUrl).toContain('category=Waste%20Management');
    });

    it('should route "street light pole dark" to Electricity department', () => {
      const result = analyzeCivicQuery('Streetlight pole lamp is broken and causing total blackout');
      expect(result.category).toBe('Electricity');
      expect(result.actionType).toBe('report');
      expect(result.actionUrl).toContain('category=Electricity');
    });

    it('should escalate priority to Emergency for life safety hazards (sparking wire)', () => {
      const result = analyzeCivicQuery('Live electric wire sparking and dangling over the footpath near school');
      expect(result.category).toBe('Electricity');
      expect(result.priority).toBe('Emergency');
      expect(result.actionUrl).toContain('priority=Emergency');
    });

    it('should answer questions regarding Department SLA turnaround timelines', () => {
      const result = analyzeCivicQuery('What is the SLA turnaround time to fix complaints?');
      expect(result.text).toContain('Municipal Department Resolution SLAs');
      expect(result.text).toContain('Roads');
      expect(result.text).toContain('Water Supply');
    });
  });
});
