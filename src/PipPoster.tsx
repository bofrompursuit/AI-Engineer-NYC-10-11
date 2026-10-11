export default function PipPoster() {
  return <span className="pip-poster" aria-hidden="true"><img src="/images/pip-loading.png" alt="" width={512} height={512} /></span>
}

export function PipLoadingAvatar() {
  return <div className="pip-avatar" role="img" aria-label="Pip, your floating learning guide"><PipPoster /></div>
}
