import { redirect } from 'next/navigation'

// /edit lands on Content by default — that's the most-edited surface area
// and matches users' expectation of "edit my card".
export default function EditIndex() {
  redirect('/edit/content')
}
