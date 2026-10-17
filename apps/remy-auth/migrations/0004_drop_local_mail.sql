-- Captured mail no longer lives in a table: the local environment keeps it in the Worker's own outbox
-- (@joeblew999/remy-ui/mail), as remy-sport does, so no table for it ships, always empty, to production.
drop table "local_mail";
