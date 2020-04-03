import { ObjectType } from 'type-graphql';
import { Arg, Authorized, Mutation, Resolver, InputType, Field } from 'type-graphql';
import { IsIn } from 'class-validator';
import { IDType } from '../../types/IDType';
import { s3 } from '../../utils/s3Promises';

export enum UploadScopeEnum {
  ewebinar = 'ewebinar',
  user = 'user',
  team = 'team',
}

@InputType()
export class CreateUploadUrlInput {
  @Field()
  public scope!: UploadScopeEnum;

  @Field()
  public id!: IDType;

  @Field()
  public name!: string;

  @Field({ nullable: true })
  @IsIn(['image/jpeg', 'image/png', 'image/svg+xml', 'video/mp4', 'vimeo'])
  public fileType?: string;
}

@ObjectType()
class Asset {
  @Field({ nullable: false })
  public url!: string;

  @Field({ nullable: true })
  public uploadUrl?: string;

  constructor(params: any) {
    this.url = params.url;
    this.uploadUrl = params.uploadUrl;
  }
}

@Resolver(_of => Asset)
export class AssetsResolver {
  @Authorized()
  @Mutation(_returns => Asset)
  public async createVimeoUploadUrl(@Arg('data') _params: CreateUploadUrlInput): Promise<Asset> {
    return new Asset({
      url: '',
      uploadUrl: '',
    });
  }

  @Authorized()
  @Mutation(_returns => Asset)
  public async createUploadUrl(@Arg('data') params: CreateUploadUrlInput): Promise<Asset> {
    if (params.fileType === 'vimeo') {
      return this.createVimeoUploadUrl(params);
    }

    let type: UploadScopeEnum = UploadScopeEnum.ewebinar;

    switch (params.scope) {
      case UploadScopeEnum.user:
        type = UploadScopeEnum.user;
        break;
      case UploadScopeEnum.team:
        type = UploadScopeEnum.team;
        break;
      default:
        type = UploadScopeEnum.ewebinar;
    }

    const uploadUrl = await s3.uploadFile(
      `${type}/${params.id}/${params.name}-draft`,
      params.fileType
    );

    return new Asset({
      url: uploadUrl.split('?')[0],
      uploadUrl,
    });
  }
}
