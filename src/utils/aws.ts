// Load the AWS SDK for Node.js
import AWS from 'aws-sdk';
import config from '../config';

AWS.config.update({
  region: config.AWS_REGION,
  secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  accessKeyId: config.AWS_ACCESS_KEY_ID,
});

export default AWS;
