-- The showcase's notes demo (packages/contract/src/notes.ts holds its relation vocabulary, which names
-- these tables and columns; tests/notes.spec.ts fails when the two disagree). A person is only ever
-- an account ID here: this database knows nothing else about anybody.
create table "note" ("id" text not null primary key, "author_id" text not null, "title" text not null, "body" text not null, "created_at" text not null, "updated_at" text not null);

create index "note_author_idx" on "note" ("author_id");

-- A note shared with an address, as a reader or an editor. "user_id" is empty until the person signs
-- in with that address (a sign-in code proves it is theirs) and lists their notes; only then is it a relation.
create table "note_share" ("note_id" text not null references "note" ("id") on delete cascade, "email" text not null, "user_id" text, "role" text not null check ("role" in ('reader', 'editor')), "created_at" text not null, primary key ("note_id", "email"));

create index "note_share_user_idx" on "note_share" ("user_id");

create index "note_share_email_idx" on "note_share" ("email");
