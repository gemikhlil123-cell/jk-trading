import { redirect } from 'next/navigation'

// Redirect root to Arabic locale
export default function RootPage() {
  redirect('/ar')
}
