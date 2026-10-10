@id("notes-locked")
@reason("This note is locked")
forbid(principal, action == Notes::Action::"EDIT_NOTE", resource is Notes::NOTE)
when { resource.locked };

@id("notes-excluded")
@reason("The author has removed your access to this note")
forbid(principal, action, resource is Notes::NOTE)
when { resource.held.contains("NOTE_EXCLUDED") };

@id("notes-delete-fresh")
@reason("Deleting needs a sign-in in the last 15 minutes")
forbid(principal, action == Notes::Action::"DELETE_NOTE", resource)
unless {
  context.auth has signedInAt &&
  context.auth.now < context.auth.signedInAt.offset(duration("15m"))
};
