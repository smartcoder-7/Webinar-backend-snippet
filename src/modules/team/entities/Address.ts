import { Field, ObjectType, InputType } from 'type-graphql';

@ObjectType()
export class Address {
  @Field({ nullable: true })
  public address1?: string;

  @Field({ nullable: true })
  public address2?: string;

  @Field({ nullable: true })
  public city?: string;

  @Field({ nullable: true })
  public province?: string;

  @Field({ nullable: true })
  public postal?: string;

  @Field()
  public country!: string;
}

@InputType()
export class AddressInput {
  @Field({ nullable: false })
  public address1!: string;

  @Field({ nullable: true })
  public address2?: string;

  @Field({ nullable: false })
  public city!: string;

  @Field({ nullable: false })
  public province!: string;

  @Field({ nullable: false })
  public postal!: string;

  @Field({ nullable: false })
  public country!: string;
}

export default Address;
