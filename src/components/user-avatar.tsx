/**
 * User avatar with graceful initials fallback.
 *
 * Renders `avatarUrl` as an <img> when present, otherwise a circle with
 * up to two-letter initials from `name`. next/image is intentionally not
 * used here because avatar URLs come from Linear (an arbitrary external
 * host not whitelisted in next.config).
 */

type UserAvatarProps = {
  name?: string
  avatarUrl?: string
  size?: 'sm' | 'md'
  className?: string
}

const SIZE_STYLES: Record<NonNullable<UserAvatarProps['size']>, { wrapper: string; text: string }> = {
  sm: { wrapper: 'w-5 h-5', text: 'text-[10px]' },
  md: { wrapper: 'w-7 h-7', text: 'text-xs' },
}

export function UserAvatar({ name, avatarUrl, size = 'sm', className = '' }: UserAvatarProps) {
  const { wrapper, text } = SIZE_STYLES[size]

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Linear-hosted avatar, domain not whitelisted in next.config
      <img
        src={avatarUrl}
        alt={name ?? ''}
        className={`${wrapper} rounded-full flex-shrink-0 object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`${wrapper} rounded-full bg-primary/10 flex items-center justify-center ${text} font-medium text-primary flex-shrink-0 ${className}`}
      aria-label={name ?? 'Unknown user'}
    >
      {name ? getInitials(name) : '?'}
    </div>
  )
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}
