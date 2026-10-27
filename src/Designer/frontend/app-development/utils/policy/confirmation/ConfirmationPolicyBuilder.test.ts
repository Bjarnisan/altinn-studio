import { describe, expect, it } from 'vitest';
import type { Policy, PolicyRule } from 'app-shared/types/Policy';
import { ConfirmationPolicyBuilder } from './ConfirmationPolicyBuilder';

const org = 'testOrg';
const app = 'testApp';
const taskId = 'testTaskId';
const wholeAppResource = ['urn:altinn:org:[ORG]', 'urn:altinn:app:[APP]'];
const taskResource = ['urn:altinn:org:testOrg', 'urn:altinn:app:testApp', 'urn:altinn:task:Task_1'];

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

describe('ConfirmationPolicyBuilder', () => {
  it('gives the subjects that can write in the whole app the right to read and confirm in the task', () => {
    const currentPolicy = createPolicy([
      createRule({ subject: ['urn:altinn:rolecode:priv', 'urn:altinn:rolecode:dagl'] }),
      createRule({ subject: ['urn:altinn:org:testOrg'] }),
    ]);

    const rule = new ConfirmationPolicyBuilder(org, app).getConfirmationRule(taskId, currentPolicy);

    expect(rule).toEqual({
      ruleId: 'urn:altinn:resource:app_testOrg_testApp:policyid:1:ruleid:testTaskId',
      description:
        'Rule that defines that the users who can write in testOrg/testApp can read and confirm when it is in confirmation task',
      subject: ['urn:altinn:rolecode:priv', 'urn:altinn:rolecode:dagl', 'urn:altinn:org:testOrg'],
      accessPackages: [],
      actions: ['read', 'confirm'],
      resources: [
        ['urn:altinn:org:testOrg', 'urn:altinn:app:testApp', 'urn:altinn:task:testTaskId'],
      ],
    });
  });

  it('copies each subject and access package once', () => {
    const accessPackage = 'urn:altinn:accesspackage:skattegrunnlag';
    const currentPolicy = createPolicy([
      createRule({ subject: ['urn:altinn:rolecode:dagl'], accessPackages: [accessPackage] }),
      createRule({ subject: ['urn:altinn:rolecode:dagl'], accessPackages: [accessPackage] }),
    ]);

    const rule = new ConfirmationPolicyBuilder(org, app).getConfirmationRule(taskId, currentPolicy);

    expect(rule.subject).toEqual(['urn:altinn:rolecode:dagl']);
    expect(rule.accessPackages).toEqual([accessPackage]);
  });

  it('gives the rule to access packages alone when no rule that can write has a role', () => {
    const accessPackage = 'urn:altinn:accesspackage:skattegrunnlag';
    const currentPolicy = createPolicy([createRule({ accessPackages: [accessPackage] })]);

    const rule = new ConfirmationPolicyBuilder(org, app).getConfirmationRule(taskId, currentPolicy);

    expect(rule.subject).toEqual([]);
    expect(rule.accessPackages).toEqual([accessPackage]);
  });

  it.each<[string, Partial<PolicyRule>]>([
    ['gives no write', { actions: ['read', 'instantiate'] }],
    ['gives write only in a task', { resources: [taskResource] }],
    ['has no subjects', { subject: [] }],
  ])('returns no rule when the only rule %s', (_, ruleChanges) => {
    const currentPolicy = createPolicy([
      createRule({ subject: ['urn:altinn:rolecode:priv'], ...ruleChanges }),
    ]);

    const rule = new ConfirmationPolicyBuilder(org, app).getConfirmationRule(taskId, currentPolicy);

    expect(rule).toBeUndefined();
  });

  it('gives the rule id that the task rules share', () => {
    const ruleId = new ConfirmationPolicyBuilder(org, app).getPolicyRuleId(taskId);

    expect(ruleId).toBe('urn:altinn:resource:app_testOrg_testApp:policyid:1:ruleid:testTaskId');
  });
});
