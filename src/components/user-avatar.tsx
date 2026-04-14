import Image from 'next/image'

/**
 * User avatar with graceful initials fallback.
 *
 * When `avatarUrl` is on a host that's configured in next.config.ts's
 * `remotePatterns`, we use next/image for automatic optimisation
 * (srcset + lazy loading). Anything else falls back to a plain <img>
 * so the component still works if Linear ever serves an avatar from a
 * host we haven't whitelisted.
 */

type UserAvatarProps = {
  name?: string
  avatarUrl?: string
  size?: 'sm' | 'md'
  className?: string
}

const SIZE_STYLES: Record<
  NonNullable<UserAvatarProps['size']>,
  { wrapper: string; text: string; px: number }
> = {
  sm: { wrapper: 'w-5 h-5', text: 'text-[10px]', px: 20 },
  md: { wrapper: 'w-7 h-7', text: 'text-xs', px: 28 },
}

// Keep this in sync with the remotePatterns entries in next.config.ts.
const OPTIMISABLE_HOST_PATTERNS: RegExp[] = [
  /^public\.linear\.app$/,
  /\.linear\.app$/,
  /^lh3\.googleusercontent\.com$/,
  /^(?:secure|www)\.gravatar\.com$/,
]

function isOptimisable(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return OPTIMISABLE_HOST_PATTERNS.some((re) => re.test(host))
  } catch {
    return false
  }
}

export function UserAvatar({ name, avatarUrl, size = 'sm', className = '' }: UserAvatarProps) {
  const { wrapper, text, px } = SIZE_STYLES[size]

  if (avatarUrl) {
    const imgClass = `${wrapper} rounded-full flex-shrink-0 object-cover ${className}`

    if (isOptimisable(avatarUrl)) {
      return (
        <Image
          src={avatarUrl}
          alt={name ?? ''}
          width={px}
          height={px}
          className={imgClass}
          unoptimized={false}
        />
      )
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatar host not whitelisted in next.config
      <img src={avatarUrl} alt={name ?? ''} className={imgClass} />
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
