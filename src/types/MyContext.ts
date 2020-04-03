import { Request, Response } from 'express';
import { UserRole } from '../modules/team/entities/TeamUserRelation';

export interface MyRequest extends Request {
  userId: string;
  role: UserRole;
  teamId: string;
}

export interface MyContext {
  req: MyRequest;
  res: Response;
}
