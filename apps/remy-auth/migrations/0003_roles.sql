alter table "user" add column "role" text;

alter table "user" add column "banned" integer default 0;

alter table "user" add column "banReason" text;

alter table "user" add column "banExpires" date;

alter table "session" add column "impersonatedBy" text;