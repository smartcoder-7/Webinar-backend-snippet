import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsValidPassword', async: true })
export class IsValidPasswordConstraint implements ValidatorConstraintInterface {
  public async validate(password: string) {
    if (password.length < 8) {
      return false;
    }

    return true;
  }

  public defaultMessage(_validationArguments?: ValidationArguments): string {
    return 'Password must be at least 8 characters long';
  }
}

export function IsValidPassword(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidPasswordConstraint,
    });
  };
}
