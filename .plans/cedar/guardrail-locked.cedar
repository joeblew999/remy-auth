// Guardrail, written as the region that must never be allowed: editing a locked note.
permit(principal, action == Notes::Action::"EDIT_NOTE", resource is Notes::NOTE)
when { resource.locked };
