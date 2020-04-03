import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { getCustomRepository } from 'typeorm';
import { UserRepository } from '../UserRepository';

@ValidatorConstraint({ name: 'isEmailAlreadyExist', async: true })
export class IsEmailAlreadyExistConstraint implements ValidatorConstraintInterface {
  public async validate(email: string) {
    const userRepository = getCustomRepository(UserRepository);
    const user = await userRepository.findByEmail(email);
    if (user && (await user.currentTeamRelation)) {
      return false;
    }
    return true;
  }
}

export function IsEmailAlreadyExist(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsEmailAlreadyExistConstraint,
    });
  };
}
