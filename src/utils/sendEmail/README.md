# Sending Email

```
Sending an email requires several items:
    * The name of an email template
        This email template lives in Contentful.
        It contains all fields required to fill in a Design template.
        These fields can reference values in Entities or Fields to be filled in such as { user.first.name }
        It also contains the name of the Design template from Klaviyo to use.
        Klaviyo design templates use template fields and calculated fields to genereate Email HTML. 

    * A design template
        Design templates live in Klaviyo.  
        There's only a handful.
        Notifications use Customer templates, other Emails use eWebinar templates
        Templates typically are:
            Title & Content 
            Title & Content & Button 
            Title & Content & 2 Buttons
            ...

    * Calculated Fields
        These are fields used to fill in the Design template
        This is typically a name/url pair for a button to show in the email

    * Email Entities
        These are subsets of backend Models that are passed to the worker 
        The worker uses these to fill in the fields in the Contentful Email Template
        Only required fields for use by templates should be passed through entities

Email Flow
    * Each email should have its own API
        Each API should require the set of Models and Fields the template needs 
        For each Model passed the API converts the Models to Entities
        The API passes in the template name, fields and entities to sendEmail
        sendEmail creates an SQS message and sends it to the worker
        Caller can assume the email got sent 

        The worker process picks up the message
        Grabs the template from Contentful
        Replaces the { entity.value } entries from Contentful fields
        Passes the result & any fields passed in to Klaviyo to generate HTML
        Passes the HTML to SES to send the email

Non-Production Email
    * Any email to @ewebinar.com addresses are sent via SES
    * Email to anybody else goes to the Google Group email-test@ewebinar.com
    
Production Email
    * All email is sent to the recepients AND the Google Group email-log@ewebinar.com

In backend tree: utils/sendEmail contains:
    * ChatEmails.ts, UserEmails.ts 
        Give examples of APIs for sending emails
    * EmailEntities.ts
        Has EMAIL_TEMPLATES which defines all email templates - add new ones here 
        Has conversion functions for converting Models to Entities
        Defines EmailEntities structure of all entities that can be passed in through SQS to worker
    
In worker tree:
    * Worker uses GraphQL schema to sync SQS sendEMail schema with backend
    * Run npm run refresh:schema to refresh schema from Backend

Adding a new Email
    * Add API in utils/sendEmail/XxxEmails.ts
    * In API use Email Template from EMAIL_TEMPLATES or talk to DD for new one
    * Have API require any fields the code needs to pass in to the Email Design Template
    * Have API require all Models your template will need
        i.e. New user email would require at least User entity and fields such as name but probably also Team entity as it might welcome the user to a team
    * Convert all Models to Entities 
        Create or add to an Entity if you need new fields for template passed in
    * Call sendMail
       
```