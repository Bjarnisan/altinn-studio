import { ArrayUtils } from '@studio/pure-functions';
import type { Policy, PolicyRule } from 'app-shared/types/Policy';
import type { Action } from '../types';
import { buildTaskResource, buildTaskRuleId, coversWholeApp } from '../policyRuleUtils';

const confirmationActions: Action[] = ['read', 'confirm'];

/**
 * Builds the rule for a confirmation task. The app lets a user move on from a confirmation task only with the
 * confirm action, and write is not enough.
 */
export class ConfirmationPolicyBuilder {
  constructor(
    private readonly org: string,
    private readonly app: string,
  ) {}

  /**
   * Gives the subjects that can write in the whole app the right to read and confirm in the task, since they are
   * the ones who fill in the form. Returns undefined when no rule gives write in the whole app.
   */
  public getConfirmationRule(taskId: string, currentPolicy: Policy): PolicyRule | undefined {
    const writeRules = currentPolicy.rules.filter(
      (rule) => rule.actions.includes('write') && rule.resources.some(coversWholeApp),
    );
    const subject = ArrayUtils.removeDuplicates(writeRules.flatMap((rule) => rule.subject));
    const accessPackages = ArrayUtils.removeDuplicates(
      writeRules.flatMap((rule) => rule.accessPackages ?? []),
    );
    if (subject.length === 0 && accessPackages.length === 0) return undefined;

    return {
      ruleId: this.getPolicyRuleId(taskId),
      description: `Rule that defines that the users who can write in ${this.org}/${this.app} can read and confirm when it is in confirmation task`,
      subject,
      accessPackages,
      actions: confirmationActions,
      resources: [buildTaskResource(this.org, this.app, taskId)],
    };
  }

  public getPolicyRuleId(taskId: string): string {
    return buildTaskRuleId(this.org, this.app, taskId);
  }
}
