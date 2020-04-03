import AWS from 'aws-sdk';
import config from '../config';
import { IDType } from '../types/IDType';
import { Field, ObjectType } from 'type-graphql';
import uuid from 'uuid';
import { SendEmailMessage, SendNotificationMessage } from './sendEmail/EmailEntities';

@ObjectType()
export class UploadMessage {
  @Field()
  public webinarId!: IDType;
  @Field()
  public url!: string;
  @Field()
  public accessToken!: string;
}

@ObjectType()
export class TranscodeMessage {
  @Field()
  public webinarId!: IDType;
  @Field()
  public videoUrl!: string;
  @Field()
  public accessToken!: string;
  @Field()
  public progress!: number;
}

@ObjectType()
export class SendSmsMessage {
  @Field()
  public phoneNumber!: string;
  @Field()
  public message!: string;
  @Field()
  public notificationId!: IDType;
  @Field()
  public attendeeId!: IDType;
}

@ObjectType()
export class QMessage {
  @Field({ nullable: true })
  public q?: string;

  @Field({ nullable: true })
  public receiptHandle?: string;

  @Field(_type => UploadMessage, { nullable: true })
  public upload?: UploadMessage;

  @Field(_type => TranscodeMessage, { nullable: true })
  public transcode?: TranscodeMessage;

  @Field(_type => SendSmsMessage, { nullable: true })
  public sendSms?: SendSmsMessage;

  @Field(_type => SendEmailMessage, { nullable: true })
  public sendEmail?: SendEmailMessage;

  @Field(_type => SendNotificationMessage, { nullable: true })
  public sendNotification?: SendNotificationMessage;

  @Field({ nullable: true })
  public processNotifications?: string;
}

interface SQSPayload {
  MessageBody: any;
  QueueUrl: string;
  MessageGroupId?: string;
  MessageDeduplicationId?: string;
}

export const sendSQSWorkerMessage = (
  qmessage: QMessage,
  groupId: string,
  deduplicationId?: string | null
): Promise<string> => {
  const sqs = new AWS.SQS();
  const queueUrl = config.SQS_WORKER_URL;
  const message = JSON.stringify(qmessage);

  const params: SQSPayload = {
    MessageBody: message,
    QueueUrl: queueUrl,
    MessageGroupId: groupId,
    MessageDeduplicationId: deduplicationId ? deduplicationId : uuid(),
  };

  console.log(params);
  return new Promise((resolve, reject) => {
    sqs.sendMessage(params, (err, _data) => {
      if (err) {
        console.log(err, err.stack);
        reject(err);
      } else {
        console.log('Victory, message sent for ' + encodeURIComponent(message) + '!');
        resolve();
      }
    });
  });
};
