import {
  Arg,
  Authorized,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Resolver,
} from 'type-graphql';
import fetch from 'node-fetch';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { EWebinar } from '../ewebinar/entities/EWebinar';
import { User } from '../user/entities/User';
import { EWebinarRepository } from '../ewebinar/EWebinarRepository';
import { MyContext } from '../../types/MyContext';
import { UserRepository } from '../user/UserRepository';
import { createWorkerToken } from '../user/resolvers/createTokens';
import { sendSQSWorkerMessage } from '../../utils/sendSQSWorkerMessage';
import { IDType } from '../../types/IDType';
import { IsNotEmpty, IsUrl, IsString, IsNumber } from 'class-validator';
import { CreatorRoles } from '../team/entities/TeamUserRelation';
import config from '../../config';

@InputType({ description: 'Vimeo Video Url & ID' })
export class SetLocalVimeoUploadDoneInput {
  @Field({ nullable: false })
  @IsNotEmpty()
  @IsString()
  public vimeoVideoUri?: string;

  @Field({ nullable: false })
  @IsNotEmpty()
  @IsNumber()
  public vimeoVideoId?: number;
}

@InputType({ description: 'VimeoUrl' })
export class UploadVideoInput {
  @Field()
  @IsNotEmpty()
  @IsUrl()
  public url!: string;
}

@ObjectType()
export class StartVideoUploadInfo {
  @Field()
  public uploadLink!: string;

  @Field()
  public videoUri!: string;
}

@Resolver(_of => String)
export class VimeoVideoResolvers {
  constructor(
    @InjectRepository(EWebinar)
    private readonly ewebinarRepository: EWebinarRepository,
    @InjectRepository(User)
    private readonly userRepository: UserRepository
  ) {}

  @Authorized(CreatorRoles)
  @Mutation(_type => String)
  public async uploadVideo(
    @Arg('id') id: IDType,
    @Arg('data') data: UploadVideoInput,
    @Ctx() ctx: MyContext
  ): Promise<boolean> {
    const user = await this.userRepository.findOneOrFail(ctx.req.userId);

    await sendSQSWorkerMessage(
      {
        upload: {
          url: data.url,
          webinarId: id,
          accessToken: await createWorkerToken(user),
        },
      },
      `${id}`,
      `transfer-${id}`
    );

    return true;
  }

  @Authorized(CreatorRoles)
  @Mutation(_type => StartVideoUploadInfo)
  public async startVideoUpload(
    @Arg('fileSize') fileSize: number,
    @Arg('fileName') fileName: string
  ): Promise<StartVideoUploadInfo> {
    // IMPORTANT: This exact same code lives in worker - any changes should also be reflected there.

    interface VideoAPIResult {
      upload: {
        upload_link: string;
      };
      uri: string;
    }

    const vimeoBaseUrl = config.VIMEO_BASE_URL;
    const vimeoAccessToken = config.VIMEO_ACCESS_TOKEN;

    const createVideoAPIResult: VideoAPIResult = await fetch(`${vimeoBaseUrl}/me/videos`, {
      method: 'POST',
      body: JSON.stringify({
        name: fileName,
        upload: {
          approach: 'tus',
          size: fileSize,
        },
        privacy: {
          download: false,
          view: 'anybody',
        },
      }),
      headers: {
        "Authorization": `bearer ${vimeoAccessToken}`,
        'Content-Type': 'application/json',
        "Accept": 'application/vnd.vimeo.*+json;version=3.4',
      },
    }).then(response => response.json());

    return {
      uploadLink: createVideoAPIResult.upload.upload_link,
      videoUri: createVideoAPIResult.uri,
    };
  }

  @Authorized(CreatorRoles)
  @Mutation(_type => EWebinar)
  public async setLocalVimeoUploadDone(
    @Arg('id') id: IDType,
    @Arg('data') videoData: SetLocalVimeoUploadDoneInput,
    @Ctx() ctx: MyContext
  ): Promise<EWebinar | null> {
    const user = await this.userRepository.findOneOrFail(ctx.req.userId);

    let ewebinar = await this.ewebinarRepository.findInTeamOneOrFail(id, ctx.req);

    ewebinar = await ewebinar.updateWith({
      vimeoVideoId: videoData.vimeoVideoId,
      uploadStatus: {
        stage: 'Transcoding',
        localUpload: false,
        progress: 75, // This is the max for client uploads
        done: false,
        error: null,
      },
    });

    if (videoData.vimeoVideoUri && ewebinar) {
      sendSQSWorkerMessage(
        {
          transcode: {
            webinarId: id,
            videoUrl: videoData.vimeoVideoUri,
            accessToken: await createWorkerToken(user),
            progress: config.UPLOAD_PROGRESS_MAX,
          },
        },
        `${id}`,
        `transcode-${id}`
      );
    }

    return ewebinar;
  }
}
