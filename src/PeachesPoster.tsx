export default function PeachesPoster() {
  return <span className="peaches-poster" aria-hidden="true"><img src="/images/peaches-loading.png" alt="" width={512} height={512} /></span>
}

export function PeachesLoadingAvatar() {
  return <div className="peaches-avatar" role="img" aria-label="Peaches, your floating learning guide"><PeachesPoster /></div>
}
