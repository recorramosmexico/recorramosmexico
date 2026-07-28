import { useGoogleAuthEnabled } from '../../hooks/useGoogleAuthEnabled'
import { GoogleAuthButton } from './GoogleAuthButton'

interface OAuthDividerProps {
  label: string
}

export function OAuthSection({ label }: OAuthDividerProps) {
  const { enabled, loading } = useGoogleAuthEnabled()

  if (loading || !enabled) return null

  return (
    <>
      <GoogleAuthButton />
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
    </>
  )
}
