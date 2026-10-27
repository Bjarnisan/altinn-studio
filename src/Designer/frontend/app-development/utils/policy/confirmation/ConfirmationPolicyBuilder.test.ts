import { describe, expect, it } from 'vitest';
import type { Policy, PolicyRule } from 'app-shared/types/Policy';
import { ConfirmationPolicyBuilder } from './ConfirmationPolicyBuilder';

const org = 'testOrg';
const app = 'testApp';
const taskId = 'testTaskId';
const confirmationRuleId = 'urn:altinn:resource:app_testOrg_testApp:policyid:1:ruleid:testTaskId';
const wholeAppResource = ['urn:altinn:org:[ORG]', 'urn:altinn:app:[APP]'];
const taskResource = ['urn:altinn:org:testOrg', 'urn:altinn:app:testApp', 'urn:altinn:task:Task_1'];
const accessPackage = 'urn:altinn:accesspackage:skattegrunnlag';

const createRule = (ruleChanges: Partial<PolicyRule>): PolicyRule => ({
  ruleId: 'existingRuleId',
  description: 'Existing rule',
  subject: [],
  actions: ['read', 'write'],
  resources: [wholeAppResource],
  ...ruleChanges,
});

const createPolicy = (rules: PolicyRule[]): Policy => ({
  requiredAuthenticationLevelEndUser: '3',
  requiredAuthenticationLevelOrg: '3',
  rules,
});

const createBuilder = (): ConfirmationPolicyBuilder => new ConfirmationPolicyBuilder(org, app);

describe('ConfirmationPolicyBuilder', () => {
  describe('getPolicyWithConfirmationRule', () => {
    it('gives the users who can write in the whole app the right to read and confirm in the task', () => {
      const endUserRule = createRule({
        subject: ['urn:altinn:rolecode:priv', 'urn:altinn:rolecode:dagl'],
      });
      const serviceOwnerRule = createRule({ subject: ['urn:altinn:org:[org]'] });
      const currentPolicy = createPolicy([endUserRule, serviceOwnerRule]);

      const policy = createBuilder().getPolicyWithConfirmationRule(taskId, currentPolicy);

      expect(policy).toEqual({
        ...currentPolicy,
        rules: [
          endUserRule,
          serviceOwnerRule,
          {
            ruleId: confirmationRuleId,
            description:
              'Rule that defines that the users who can write in testOrg/testApp can read and confirm when it is in confirmation task',
            subject: ['urn:altinn:rolecode:priv', 'urn:altinn:rolecode:dagl'],
            accessPackages: [],
            actions: ['read', 'confirm'],
            resources: [
              ['urn:altinn:org:testOrg', 'urn:altinn:app:testApp', 'urn:altinn:task:testTaskId'],
            ],
          },
        ],
      });
    });

    it('copies each role and access package once', () => {
      const currentPolicy = createPolicy([
        createRule({ subject: ['urn:altinn:rolecode:dagl'], accessPackages: [accessPackage] }),
        createRule({ subject: ['urn:altinn:rolecode:dagl'], accessPackages: [accessPackage] }),
      ]);

      const policy = createBuilder().getPolicyWithConfirmationRule(taskId, currentPolicy);

      expect(policy.rules[2]).toMatchObject({
        subject: ['urn:altinn:rolecode:dagl'],
        accessPackages: [accessPackage],
      });
    });

    it('gives the rule to access packages alone when no rule that can write has a role', () => {
      const currentPolicy = createPolicy([createRule({ accessPackages: [accessPackage] })]);

      const policy = createBuilder().getPolicyWithConfirmationRule(taskId, currentPolicy);

      expect(policy.rules[1]).toMatchObject({ subject: [], accessPackages: [accessPackage] });
    });

    it.each<[string, PolicyRule[]]>([
      ['no rule gives write', [createRule({ actions: ['read', 'instantiate'] })]],
      ['the rule gives write only in a task', [createRule({ resources: [taskResource] })]],
      ['the rule that gives write has no subjects', [createRule({ subject: [] })]],
      [
        'only the service owner can write',
        [createRule({ subject: ['urn:altinn:org:[org]'], accessPackages: [] })],
      ],
      [
        'users can already confirm in the whole app',
        [createRule({ subject: ['urn:altinn:rolecode:priv'], actions: ['write', 'confirm'] })],
      ],
    ])('returns no policy when %s', (_, rules) => {
      const policy = createBuilder().getPolicyWithConfirmationRule(taskId, createPolicy(rules));

      expect(policy).toBeUndefined();
    });

    it('returns no policy when the policy has not loaded', () => {
      expect(createBuilder().getPolicyWithConfirmationRule(taskId, undefined)).toBeUndefined();
    });
  });

  describe('getPolicyWithoutConfirmationRule', () => {
    it.each([
      ['as Studio added it', confirmationRuleId],
      ['after the policy editor saved it', 'urn:altinn:example:ruleid:testTaskId'],
    ])('removes the rule of the task %s', (_, ruleId) => {
      const otherRule = createRule({ ruleId: 'urn:altinn:example:ruleid:1' });
      const currentPolicy = createPolicy([otherRule, createRule({ ruleId })]);

      const policy = createBuilder().getPolicyWithoutConfirmationRule(taskId, currentPolicy);

      expect(policy).toEqual({ ...currentPolicy, rules: [otherRule] });
    });

    it('returns no policy when the policy has no rule for the task', () => {
      const currentPolicy = createPolicy([createRule({ ruleId: 'urn:altinn:example:ruleid:1' })]);

      expect(
        createBuilder().getPolicyWithoutConfirmationRule(taskId, currentPolicy),
      ).toBeUndefined();
    });

    it('returns no policy when the policy has not loaded', () => {
      expect(createBuilder().getPolicyWithoutConfirmationRule(taskId, undefined)).toBeUndefined();
    });
  });
});
