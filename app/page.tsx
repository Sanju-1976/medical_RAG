import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to the default chat page
  redirect('/chat')
}
