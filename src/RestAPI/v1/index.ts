import express from 'express';
import { createChatConnection, deleteChatConnection, postMessage } from './chat';
import { incomingSms } from './twilio';
import { getRegistrantsCsv } from './registrants';
import { authorizeToken } from '../../middleware/authorizeToken';

const index = express.Router();

// TODO: No authentication or authorization happening here!!

index.put('/chat', createChatConnection);
index.delete('/chat', deleteChatConnection);
index.post('/chat', postMessage);
index.get('/downloadCsv/:ewebinarSetId', authorizeToken, getRegistrantsCsv);

// Twilio webhook

index.post('/sms', incomingSms);

// router.put('/subscriptions', connect);
// router.delete('/subscriptions', disconnect);
// router.post('/subscriptions', message);

export default index;
