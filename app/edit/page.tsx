import { redirect } from 'next/navigation'

// /edit lands on the Overview dashboard — the "here's your card, here's your
// link, here's how it's doing" home. Content editing is one tab over.
export default function EditIndex() {
  redirect('/edit/overview')
}
