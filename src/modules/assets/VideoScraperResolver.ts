import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Field, ObjectType } from 'type-graphql';
import youtubedl from 'youtube-dl';
import { CreatorRoles } from '../team/entities/TeamUserRelation';

@ObjectType()
export class VideoMeta {
  @Field()
  public id!: string;

  @Field()
  public url!: string;

  @Field()
  public title!: string;

  @Field()
  public duration!: string;

  @Field()
  public thumbnail!: string;
}

@Resolver(_of => VideoMeta)
export class VideoScraperResolver {
  @Authorized(CreatorRoles)
  @Mutation(_return => VideoMeta, { nullable: true })
  public async scrapeVideoMetaFromURL(@Arg('url') url: string): Promise<VideoMeta> {
    return new Promise((resolve, reject) =>
      youtubedl.getInfo(
        url,
        ['--skip-download', '--verbose', '--referer', 'api.ewebinar.com'],
        (err: any, info: any) => {
          if (err) {
            reject(err);
          } else {
            console.log('Got video info: ', info);
            resolve(info);
          }
        }
      )
    );
  }
}
