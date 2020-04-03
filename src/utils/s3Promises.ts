import AWS from './aws';
import config from '../config';
import { DeleteObjectRequest, CopyObjectRequest, GetObjectAclRequest } from 'aws-sdk/clients/s3';

const s3AWS = new AWS.S3();

export class S3 {
  public async uploadFile(filename: string, fileType?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const params = {
        Bucket: config.ASSETS_S3_BUCKET,
        Key: filename,
        ContentType: fileType,
        ACL: 'public-read',
      };

      s3AWS.getSignedUrl('putObject', params, (err, url) => {
        if (err) {
          console.log('S3 Error] Upload File: ', err);
          reject(err);
        } else {
          resolve(url);
        }
      });
    });
  }

  public async copyFile(oldFilename: string, newFilename: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const params: CopyObjectRequest = {
        Bucket: config.ASSETS_S3_BUCKET,
        CopySource: encodeURI(`${config.ASSETS_S3_BUCKET}/${oldFilename}`),
        Key: newFilename,
        ACL: 'public-read',
      };

      s3AWS.copyObject(params, (err, _data) => {
        if (err) {
          console.log('S3 Error] Copy File: ', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public async deleteFile(filename: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const params: DeleteObjectRequest = {
        Bucket: config.ASSETS_S3_BUCKET,
        Key: filename,
      };

      s3AWS.deleteObject(params, (err, _data) => {
        if (err) {
          console.log('S3 Error] Delete File: ', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public async renameFile(oldFilename: string, newFilename: string): Promise<void> {
    await this.copyFile(oldFilename, newFilename);
    await this.deleteFile(oldFilename);
  }

  public async fileExists(filename: string): Promise<boolean> {
    return new Promise((resolve, _reject) => {
      const params: GetObjectAclRequest = {
        Bucket: config.ASSETS_S3_BUCKET,
        Key: filename,
      };

      s3AWS.getObjectAcl(params, (err, _data) => {
        if (err) {
          console.log('S3 Error] Get Object ACL: ', err);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
}

export const s3 = new S3();
