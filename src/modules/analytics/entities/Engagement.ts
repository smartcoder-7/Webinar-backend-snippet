import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class Engagement {
  @Field({ nullable: true, description: "total interactions" })
  public totalInteractions?: number;

  @Field({ nullable: true, description: "total reactions" })
  public totalReactions?: number;

  @Field({ nullable: true, description: "engagement percent" })
  public engagementPercent?: number;

  @Field({ nullable: true, description: "chat message" })
  public chatMessages?: number;

  @Field({ nullable: true, description: "questions answered" })
  public question?: number;

  @Field({ nullable: true, description: "poll takens" })
  public poll?: number;

  @Field({ nullable: true, description: "offer clicked" })
  public specialOffer?: number;

  @Field({ nullable: true, description: "handout downloads"})
  public handout?: number;

  @Field({ nullable: true, description: "contact request sent" })
  public requestToContact?: number;

  @Field({ nullable: true, description: "rating given" })
  public feedback?: number;

  @Field({ nullable: true, description: "tip" })
  public tip?: number;
  
  @Field({ nullable: true, description: "private message" })
  public privateMessage?: number;

  @Field({ nullable: true, description: "end stream" })
  public endStream?: number;

  @Field({ nullable: true, description: "welcome" })
  public welcome?: number;

  @Field({ nullable: true, description: "public Post" })
  public publicPost?: number;

  @Field({ nullable: true, description: "overall rating"})
  public overallRating?: number;
}