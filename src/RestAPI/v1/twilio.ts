import { Request, Response } from 'express';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';

export const incomingSms = async (req: Request, res: Response) => {
  console.log('INCOMING SMS: ', req.body);
  const twiml = new MessagingResponse();

  twiml.message('Oops! This number is just to remind you to not miss your eWebinar!');

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
};
