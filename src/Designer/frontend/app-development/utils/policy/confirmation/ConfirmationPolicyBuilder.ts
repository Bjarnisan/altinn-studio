import { ArrayUtils } from '@studio/pure-functions';
import type { Policy, PolicyRule } from 'app-shared/types/Policy';
import type { Action } from '../types';
import {
  belongsToTask,
  buildTaskResource,
  buildTaskRuleId,
  coversWholeApp,
  isServiceOwner,
} from '../policyRuleUtils';

const confirmationActions: Action[] = ['read', 'confirm'];

type Users = Pick<PolicyRule, 'subject' | 'accessPackages'>;

/**
 * Gets the users that the rules grant the action to, leaving out service owners.
 */
const getUsersGranted = (rules: PolicyRule[], action: Action): Users => {
  const grantingRules = rules.filter((rule) => rule.actions.includes(action));
  return {
    subject: ArrayUtils.removeDuplicates(
      grantingRules.flatMap((rule) => rule.subject).filter((subject) => !isServiceOwner(subject)),
    ),
    accessPackages: ArrayUtils.removeDuplicates(
      grantingRules.flatMap((rule) => rule.accessPackages ?? []),
    ),
  };
};

const hasUsers = ({ subject, accessPackages }: Users): boolean =>
  subject.length > 0 || accessPackages.length > 0;

/**
 * Keeps the policy rule for a confirmation task. The app lets a user move on from a confirmation task only with the
 * confirm action, and write is not enough.
 */
export class ConfirmationPolicyBuilder {
  constructor(
    private readonly org: string,
    private readonly app: string,
  ) {}

  /**
   * Gives the users who can write in the whole app the right to read and confirm in the task, since they are the ones
   * who fill in the form. Returns undefined when the policy needs no rule: users can already confirm in the whole
   * app, no user can write in the whole app, or the policy has not loaded.
   */
  public getPolicyWithConfirmationRule(
    taskId: string,
    currentPolicy: Policy | undefined,
  ): Policy | undefined {
    if (!currentPolicy) return undefined;
    const wholeAppRules = currentPolicy.rules.filter((rule) => rule.resources.some(coversWholeApp));
    if (hasUsers(getUsersGranted(wholeAppRules, 'confirm'))) return undefined;
    const writers = getUsersGranted(wholeAppRules, 'write');
    if (!hasUsers(writers)) return undefined;

    const confirmationRule: PolicyRule = {
      ruleId: buildTaskRuleId(this.org, this.app, taskId),
      description: `Rule that defines that the users who can write in ${this.org}/${this.app} can read and confirm when it is in confirmation task`,
      ...writers,
      actions: confirmationActions,
      resources: [buildTaskResource(this.org, this.app, taskId)],
    };
    // Need to merge the rule with the current policy, since backend does not support partial updates.
    return { ...currentPolicy, rules: [...currentPolicy.rules, confirmationRule] };
  }

  /**
   * Removes the rule of a deleted confirmation task. Returns undefined when the policy has no rule for the task, or
   * has not loaded.
   */
  public getPolicyWithoutConfirmationRule(
    taskId: string,
    currentPolicy: Policy | undefined,
  ): Policy | undefined {
    if (!currentPolicy) return undefined;
    const rules = currentPolicy.rules.filter((rule) => !belongsToTask(rule.ruleId, taskId));
    if (rules.length === currentPolicy.rules.length) return undefined;
    return { ...currentPolicy, rules };
  }
}
