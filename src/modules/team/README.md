Team Flow

```
Team PAGE
    Shows all users and invites + status including First/Last name/Email/Role/Invite status

    I can change a role
        of a user or an invite's role from role drop-down.  Doing so pops modal to confirm operation w/ Save button.  On Save invite or user has new role

    I can delete a user or invite
        Deleting user 
            Shows modal that confirms deletion and requires designating replacement user
            Reassigns all assigned webinars to replacement user
            Reassigns all conversations with replacement user
            Removes them from that team and deletes TeamUserRelation
            It does NOT remove the User from the system
            Sends user removed_from_team email
        Deleting an invite removes the invite and its token

    I can create a new User including first/last name/email/role
        -- BACKEND: In TeamResolver... 
        createNewUserInTeam( firstname, lastname, email, role)
            if user with email already exists in system, by Users or Non-Rejected Invites, error "User already exists"
            Create Invite token and saves it (in Invite or TeamUserRelation object?)
            Send invite_to_team email with Accept URL & Reject URL

    I can edit the email of a User or of an Invite
        I can only change to an email not already in use by Users or Non-Rejected Invites
        If I change the email for a user
            The old and new addresses get an email that their account has changed.  Two templates: "login_changed_old_email" "login_changed_new_email"
        If I rename the email for an invite
            Email in Invite is changed
            Email template invite_to_team is sent to new email
---

/signup PAGE
    -- BACKEND: In TeamResolver
    createNewUserAndTeam()
        Check if user with same email exists
            If user is part of a team, fail w/ "Email in use"
            If user is NOT part of a team, reuse User, set role to Admin, create new Team and assign user to team
        Check if Invite with same email exists - if so send back "Invite conflict" error

    -- PAGE
    if "Invite conflict" error
        show modal stating invite is pending with "Resend Invite" button
        Resend invite button sends invite again w/ same invite token        
    if "Email in use" error, show error under email field
---
    
invite_to_team EMAIL
    Accept button is pressed (Accept URL)
        User goes to NEW /signup/profile page
        It verifies Invite code with back-end, grabs first/last name and fills in the form
        Shows user initial profile create page which asks for password
        On Continue button:
        --- BACKEND
            Deletes invite token
            Creates user and TeamUserRelation (there is already a create user repository method) but has no password yet.
    
    Reject button is pressed (Reject URL)
        Page calls backend
        Backend...
            Updates invite token to Rejected
            This invite token is never again used to check for used emails
        Page shows rejected (need Kye design) which allows user to go to /signup for their own account
---

/login PAGE
    If I try to login with an email used by an invite
        show modal stating invite is pending with "Resend Invite" button (same modal as on /signup page described above) 
```