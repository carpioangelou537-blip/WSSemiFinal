export default function LoadError({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900" role="alert">
      <p className="font-semibold">We couldn’t load this data</p>
      <p className="mt-1 break-words leading-6">{message}</p>
      <p className="mt-2 text-rose-800/80">Check your connection and Supabase Row Level Security policies, then try again.</p>
    </div>
  )
}
