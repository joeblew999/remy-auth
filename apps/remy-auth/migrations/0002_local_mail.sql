-- remy-auth's own table, not Better Auth's: the sign-in codes a local environment captures instead of
-- mailing (src/auth/mail.server.ts; the environment policy in src/auth/environment.ts allows it for
-- "local" only, so this table stays empty everywhere else). /dev/mail reads it back, locally only.
create table "local_mail" ("id" integer primary key autoincrement, "recipient" text not null, "kind" text not null, "code" text not null, "createdAt" text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')));

create index "local_mail_recipient_idx" on "local_mail" ("recipient");
