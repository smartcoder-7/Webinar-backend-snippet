## Running a local chat API Gateway service

Chat uses AWS API Gateway to scale websocket connections and make them look like 
regular backend HTTP calls.
  
To connect to local chat server, all you need to do is

#### On backend
1. Add `API_GATEWAY_ENDPOINT="http://localhost:3002"` to you .env file
2. Start the backend: `npm start` 
2. Start your chat server: `npm run serverless`

#### On frontend 
1. Add `GATSBY_CHAT_SERVER_URL="ws://localhost:3002"` to your .env
2. Start with: `npm start`

## Chat logic pseudo-code
```
connection table
    connectionId
    attendeeId?: aid
    webinarId
    userId?: (not attendee but ewebinar user)
    connectedOn: timestamp
messages table
    conversationId?
    message
    timeStamp: Actual time
    ewebinarId
    attendeeId
    fromAttendee: boolean
    userId <- moderator op webinar ID usually but could be someone else
    room: Waiting | Presentation | Exit
    timeAt: When message was sent in relation to room
    interactionId?: number | null <- Use this to state there was an interaction that happened (i.e. answered poll)
conversation table
    ewebinarId
    attendeeId
    isArchived
    inEmail <- did conversation to attendee move to email or not
    lastMessage: timestamp
    lastRead: timestamp  <- if lastMessage < lastRead conversation has no unread blue bubble
message json {
  ewebinarid: id
  attendee: aid
  moderator: uid
  fromAttendee: boolean
  fromName: string <- attendee or moderator depending on fromAttendee
  message: string
  isRead: boolean <- by receiver
}
UI
    Chat window for ewebinar
        - Conversations filetered by ewebinarId
    Master chat window for moderator
        - Conversations filtered by ALL ewebinarIds I'm assigned as the moderator to
Websocket Message Types:
    New Message Posted - POST /chat
    { message: { ... }}
    - from attendee
        if no conversation exists
        -   create conversation in conversation table
        if conversation isArchived == true
        -   mark conversation as isArchived = false
        save message in messages table
        query connection table for ewebinarId & userId != null
        loop through all connections with that webinar ID and forward the message to all connections
        - if moderator of webinar does not have connection
            send moderator email notification they have a new message
    - from moderator
        if no conversation exists
        -   create conversation in conversation table
        if conversation isArchived == true
        -   mark conversation as isArchived = false
        save message in messages table
        query connection table for attendee id
        loop through all connections found and forward the message to attendee
        - if no connections found
            send email to attendee email w/ message & thread
               email reply-to = moderator email & mark conversation as inEmail = true  <- FOR NOW
               OR
               email reply-to = {webinarId}@ewebinar.com -> webhook call, parse email body and treat as msg from attendee <- WANT THIS LATER
    - CAN DO LATER - Process loops through connection table for any connections where attendeeId != null & connectedOn is recent
        - Send "Private welcome message"
            query connection table for attendee id
            if no connections
                - exit
            query messages table for any messages to attendee id for this ewebinarId
            - if messages exist
                - exit
            save message in messages table <- Might skip this step if doesn't work well
            loop through all connections found and forward the message to attendee
    Conversation Updated (When lastRead or lastModified or isArchived changes)
    - Query connection table for all connections with conversation webinarId and attendee Id == null
        Loop through connections and send { conversation: { ...conversation }}
    New Conversation
    - Query connection table for all connections with conversation webinarId and attendee Id == null
              Loop through connections and send { conversation: { ...conversation }}
```