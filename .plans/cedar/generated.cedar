// Generated from grants
@id("notes-edit")
permit(principal, action == Notes::Action::"EDIT_NOTE", resource is Notes::NOTE)
when { resource.held.contains("NOTE_AUTHOR") || resource.held.contains("NOTE_EDITOR") };

@id("notes-read")
permit(principal, action == Notes::Action::"READ_NOTE", resource is Notes::NOTE)
when { resource.held.contains("NOTE_AUTHOR") || resource.held.contains("NOTE_EDITOR") || resource.held.contains("NOTE_READER") };

@id("notes-delete")
permit(principal, action == Notes::Action::"DELETE_NOTE", resource is Notes::NOTE)
when { resource.held.contains("NOTE_AUTHOR") };

@id("notes-platform-admin")
permit(principal in Notes::Role::"ADMIN", action, resource is Notes::NOTE);
