interface SkeletonProps {
  readonly width?: string
  readonly height?: string
  readonly borderRadius?: string
  readonly className?: string
}

export function Skeleton({ width = '100%', height = '16px', borderRadius = '8px', className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="card skeleton-card">
      <div className="skeleton-card__header">
        <Skeleton width="60%" height="18px" />
        <Skeleton width="40px" height="40px" borderRadius="50%" />
      </div>
      <div className="skeleton-card__body">
        <Skeleton width="80px" height="32px" />
        <Skeleton width="50px" height="14px" />
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="dashboard">
      <Skeleton width="120px" height="14px" className="skeleton-mb-12" />
      <div className="device-grid">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  )
}

export function DevicePageSkeleton() {
  return (
    <div className="controls">
      <div className="device-page-header">
        <Skeleton width="36px" height="36px" borderRadius="50%" />
        <Skeleton width="140px" height="22px" />
      </div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
          <Skeleton width="220px" height="220px" borderRadius="50%" />
          <Skeleton width="56px" height="56px" borderRadius="50%" />
        </div>
        <Skeleton width="100%" height="40px" className="skeleton-mt-12" />
      </div>
      <div className="card">
        <Skeleton width="100%" height="6px" />
      </div>
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          <Skeleton height="48px" borderRadius="12px" />
          <Skeleton height="48px" borderRadius="12px" />
          <Skeleton height="48px" borderRadius="12px" />
          <Skeleton height="48px" borderRadius="12px" />
        </div>
      </div>
    </div>
  )
}
