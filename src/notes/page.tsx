import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { NotebookPenIcon } from 'lucide-react';
import { noteDraft, shareRoles, type Note, type NoteList } from '@joeblew999/remy-auth-contract/notes';
import { Allowed } from '@joeblew999/remy-ui/allowed';
import { AppShell } from '@joeblew999/remy-ui/app-shell';
import { Button, buttonVariants } from '@joeblew999/remy-ui/button';
import { Alert, AlertDescription } from '@joeblew999/remy-ui/components/alert';
import { Badge } from '@joeblew999/remy-ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@joeblew999/remy-ui/components/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@joeblew999/remy-ui/components/empty';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@joeblew999/remy-ui/components/field';
import { Input } from '@joeblew999/remy-ui/components/input';
import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { Intro } from '@joeblew999/remy-ui/shell';

// The notes demo's page (.plans/auth-service.md): relations decide who may do what, and the page
// decides nothing. Every control sits inside <Allowed>, which shows it only when the server's answer
// for this viewer and this note (`note.can`, sent with the note) allows the action; nothing here
// looks at who the viewer is. TanStack Form with shadcn's Field components, like the other forms.

/** What the page asks the app to do; each answers once the server has, and throws when it refused. */
export type NoteActions = {
  create: (draft: { title: string; body: string }) => Promise<unknown>;
  update: (edit: { id: string; title: string; body: string }) => Promise<unknown>;
  share: (share: { id: string; email: string; role: typeof shareRoles[number] }) => Promise<unknown>;
  remove: (note: { id: string }) => Promise<unknown>;
};

/** A note's words, for writing one and for changing one. */
function WordsForm({ locale, name, words = { title: '', body: '' }, onSave, onCancel }: { locale: Locale; name: string; words?: { title: string; body: string }; onSave: (words: { title: string; body: string }) => Promise<unknown>; onCancel?: () => void }) {
  const o = { locale };
  const form = useForm({
    defaultValues: words,
    validators: { onSubmit: noteDraft.extend({ title: z.string().trim().min(1, { error: m.notes_title_required({}, o) }).max(120, { error: m.notes_title_required({}, o) }) }) },
    onSubmit: async ({ value, formApi }) => {
      await onSave({ title: value.title.trim(), body: value.body });
      if (!onCancel) formApi.reset();
    },
  });
  return <form noValidate className="flex flex-col gap-6" data-form={name} onSubmit={event => { event.preventDefault(); void form.handleSubmit(); }}>
    <FieldGroup>
      <form.Field name="title" children={field => {
        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
        return <Field data-invalid={isInvalid || undefined}>
          <FieldLabel htmlFor={`${name}-title`}>{m.notes_title_label({}, o)}</FieldLabel>
          <Input id={`${name}-title`} name="title" dir="auto" autoComplete="off" value={field.state.value} onBlur={field.handleBlur}
            onChange={event => field.handleChange(event.target.value)} aria-invalid={isInvalid || undefined} aria-describedby={isInvalid ? `${name}-title-error` : undefined} />
          {isInvalid && <FieldError id={`${name}-title-error`} errors={field.state.meta.errors} />}
        </Field>;
      }} />
      <form.Field name="body" children={field => <Field>
        <FieldLabel htmlFor={`${name}-body`}>{m.notes_body_label({}, o)}</FieldLabel>
        <Input id={`${name}-body`} name="body" dir="auto" autoComplete="off" maxLength={4000} value={field.state.value} onBlur={field.handleBlur} onChange={event => field.handleChange(event.target.value)} />
      </Field>} />
    </FieldGroup>
    <form.Subscribe selector={state => state.isSubmitting} children={busy => <div className="flex flex-wrap gap-3">
      <Button type="submit" disabled={busy}>{m.notes_save({}, o)}</Button>
      {onCancel && <Button type="button" variant="outline" onClick={onCancel}>{m.notes_cancel({}, o)}</Button>}
    </div>} />
  </form>;
}

/** Sharing a note: the person's address, and the relation they get. */
function ShareForm({ locale, note, onShare, onCancel }: { locale: Locale; note: Note; onShare: NoteActions['share']; onCancel: () => void }) {
  const o = { locale };
  const name = `share-${note.id}`;
  const form = useForm({
    defaultValues: { email: '', role: 'reader' as typeof shareRoles[number] },
    validators: { onSubmit: z.object({ email: z.email({ error: m.account_email_invalid({}, o) }), role: z.enum(shareRoles) }) },
    onSubmit: ({ value }) => onShare({ id: note.id, email: value.email, role: value.role }),
  });
  return <form noValidate className="flex flex-col gap-6" data-form="share" onSubmit={event => { event.preventDefault(); void form.handleSubmit(); }}>
    <FieldGroup>
      <form.Field name="email" children={field => {
        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
        return <Field data-invalid={isInvalid || undefined}>
          <FieldLabel htmlFor={`${name}-email`}>{m.notes_share_email_label({}, o)}</FieldLabel>
          <Input id={`${name}-email`} name="email" type="email" dir="ltr" autoComplete="off" value={field.state.value} onBlur={field.handleBlur}
            onChange={event => field.handleChange(event.target.value)} aria-invalid={isInvalid || undefined} aria-describedby={isInvalid ? `${name}-email-error` : `${name}-email-hint`} />
          <FieldDescription id={`${name}-email-hint`}>{m.notes_share_hint({}, o)}</FieldDescription>
          {isInvalid && <FieldError id={`${name}-email-error`} errors={field.state.meta.errors} />}
        </Field>;
      }} />
    </FieldGroup>
    <form.Subscribe selector={state => state.isSubmitting} children={busy => <div className="flex flex-wrap gap-3">
      {/* The relation the person gets is the button pressed. */}
      <Button type="submit" disabled={busy} onClick={() => form.setFieldValue('role', 'reader')}>{m.notes_share_as_reader({}, o)}</Button>
      <Button type="submit" variant="outline" disabled={busy} onClick={() => form.setFieldValue('role', 'editor')}>{m.notes_share_as_editor({}, o)}</Button>
      <Button type="button" variant="ghost" onClick={onCancel}>{m.notes_cancel({}, o)}</Button>
    </div>} />
  </form>;
}

/** One note: its words, whose it is, and the controls the server allows this viewer. */
function NoteCard({ locale, note, actions }: { locale: Locale; note: Note; actions: NoteActions }) {
  const o = { locale };
  const [open, setOpen] = useState<'edit' | 'share'>();
  const [busy, setBusy] = useState(false);
  const close = () => setOpen(undefined);
  const offersNothing = !note.can.EDIT_NOTE && !note.can.SHARE_NOTE && !note.can.DELETE_NOTE;
  return <Card data-note={note.id}>
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
      <CardTitle dir="auto" data-note-field="title">{note.title}</CardTitle>
      <div className="flex flex-wrap gap-2">
        <Badge variant={note.mine ? 'default' : 'secondary'}>{note.mine ? m.notes_yours({}, o) : m.notes_shared_with_you({}, o)}</Badge>
        {note.sharedWith > 0 && <Badge variant="outline">{m.notes_shared_count({ count: note.sharedWith }, o)}</Badge>}
      </div>
    </CardHeader>
    <CardContent className="flex flex-col gap-6">
      {open === 'edit'
        ? <WordsForm locale={locale} name={`edit-${note.id}`} words={{ title: note.title, body: note.body }} onCancel={close} onSave={words => actions.update({ id: note.id, ...words }).then(close)} />
        : note.body && <p dir="auto" className="leading-relaxed" data-note-field="body">{note.body}</p>}
      {open === 'share' && <ShareForm locale={locale} note={note} onCancel={close} onShare={share => actions.share(share).then(close)} />}
      {!open && <div className="flex flex-wrap items-center gap-3">
        <Allowed can={note.can} action="EDIT_NOTE"><Button variant="outline" onClick={() => setOpen('edit')}>{m.notes_edit({}, o)}</Button></Allowed>
        <Allowed can={note.can} action="SHARE_NOTE"><Button variant="outline" onClick={() => setOpen('share')}>{m.notes_share({}, o)}</Button></Allowed>
        <Allowed can={note.can} action="DELETE_NOTE"><Button variant="outline" disabled={busy} onClick={() => { setBusy(true); void actions.remove({ id: note.id }).finally(() => setBusy(false)); }}>{m.notes_delete({}, o)}</Button></Allowed>
        {offersNothing && <p className="text-sm text-muted-foreground">{m.notes_read_only({}, o)}</p>}
      </div>}
    </CardContent>
  </Card>;
}

/** The notes page: `state` is the server's answer (null when nobody is signed in); `failed` says the last action was refused. */
export function NotesPage({ locale, state, actions, failed }: { locale: Locale; state: NoteList | null; actions: NoteActions; failed?: boolean }) {
  const o = { locale };
  return <AppShell locale={locale} path="/app/notes">
    <section className="flex flex-col gap-6">
      <Intro locale={locale} title={m.notes_title({}, o)} intro={m.notes_intro({}, o)} backTo="app" />
      {failed && <Alert variant="destructive"><AlertDescription>{m.notes_failed({}, o)}</AlertDescription></Alert>}
      {!state ? <Empty className="border" data-notes="signed-out">
        <EmptyHeader>
          <EmptyMedia variant="icon"><NotebookPenIcon /></EmptyMedia>
          <EmptyTitle>{m.notes_signed_out_title({}, o)}</EmptyTitle>
          <EmptyDescription>{m.notes_signed_out_description({}, o)}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Link className={buttonVariants({ variant: 'outline' })} to="/app/account" preload="intent">{m.nav_account({}, o)}</Link></EmptyContent>
      </Empty> : <>
        <Allowed can={state.can} action="CREATE_NOTE">
          <Card>
            <CardHeader><CardTitle>{m.notes_new_title({}, o)}</CardTitle></CardHeader>
            <CardContent><WordsForm locale={locale} name="new" onSave={actions.create} /></CardContent>
          </Card>
        </Allowed>
        {state.notes.length === 0 ? <Empty className="border" data-notes="none">
          <EmptyHeader>
            <EmptyMedia variant="icon"><NotebookPenIcon /></EmptyMedia>
            <EmptyTitle>{m.notes_empty_title({}, o)}</EmptyTitle>
            <EmptyDescription>{m.notes_empty_description({}, o)}</EmptyDescription>
          </EmptyHeader>
        </Empty> : state.notes.map(note => <NoteCard key={note.id} locale={locale} note={note} actions={actions} />)}
      </>}
    </section>
  </AppShell>;
}
