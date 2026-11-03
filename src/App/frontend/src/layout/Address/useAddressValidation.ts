import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { readDataFromState } from 'src/features/validation/nodeValidation/readDataFromState';
import type { ComponentValidation } from 'src/features/validation';
import type { ComponentValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';

export function validateAddress(ctx: ComponentValidationContext<'Address'>): ComponentValidation[] {
  // The user cannot correct a read-only address. It can be prefilled from the population register, where a postal
  // address abroad has a zip code that is not four digits, so an error here would stop the user with no way forward.
  const readOnly = evalExpr(ctx.component.readOnly, ctx.expressionDataSources, {
    returnType: ExprVal.Boolean,
    defaultValue: false,
  });
  if (readOnly) {
    return [];
  }

  const bindings = ctx.component.dataModelBindings as IDataModelBindings<'Address'> | undefined;
  const zipCode = readDataFromState(ctx.formState, bindings?.zipCode);
  const houseNumber = readDataFromState(ctx.formState, bindings?.houseNumber);

  const validations: ComponentValidation[] = [];

  const zipCodeAsString = typeof zipCode === 'string' || typeof zipCode === 'number' ? String(zipCode) : undefined;

  // TODO(Validation): Add better message for the special case of 0000 or add better validation for zipCodes that the API says are invalid
  if (zipCodeAsString && (!zipCodeAsString.match(/^\d{4}$/) || zipCodeAsString === '0000')) {
    validations.push({
      message: { key: 'address_component.validation_error_zipcode' },
      severity: 'error',
      bindingKey: 'zipCode',
      source: FrontendValidationSource.Component,
      category: ValidationMask.Component,
    });
  }

  const houseNumberAsString =
    typeof houseNumber === 'string' || typeof houseNumber === 'number' ? String(houseNumber) : undefined;

  if (houseNumberAsString && !houseNumberAsString.match(/^[a-z,A-Z]\d{4}$/)) {
    validations.push({
      message: { key: 'address_component.validation_error_house_number' },
      severity: 'error',
      bindingKey: 'houseNumber',
      source: FrontendValidationSource.Component,
      category: ValidationMask.Component,
    });
  }

  return validations;
}
