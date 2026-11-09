<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Admin role lives in user_roles ('admin'); role changes go through the admin_definir_papel DB function, never client-side checks — prevents privilege escalation.
- Store avatar option indices in profiles.avatar and normalize against a shared catalog; render the same layered SVG in the editor and account menu to keep identity consistent without image uploads.
- AI corrections are written only by the public.registrar_correcao_ia DB function (estimate, liberada=false) and only professors/admins may update correcoes; app code never inserts corrections directly — keeps a student from writing their own grade.
- Invoke registrar_correcao_ia only through the server privileged client after authenticated ownership is established; student-facing responses omit pending scores because browser-callable score RPCs allow grade forgery.
- Enforce teacher access with professor_do_aluno and pode_revisar_redacao in RLS; unassigned essays remain admin-only for staff access rather than becoming globally visible.
- Award new correction rewards atomically once on release via the database trigger; retain processed flags for legacy corrections to avoid duplicating historical balances.
