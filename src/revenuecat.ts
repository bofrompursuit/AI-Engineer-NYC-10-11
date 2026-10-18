import type { JourneyId } from "./journeys"
import type { Package, Purchases } from "@revenuecat/purchases-js"

// Public Web Billing key (rcb_…). Safe to ship to the browser, unlike server keys.
const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY as string | undefined
export const PRO_ENTITLEMENT = "pro"
export const FREE_JOURNEYS: readonly JourneyId[] = ["physics"]
const USER_KEY = "unfold.rc-user"

// Without a key the paywall stays off so local demos keep every journey open.
export const paywallEnabled = Boolean(apiKey)
export const isPremium = (id: JourneyId) =>
  paywallEnabled && !FREE_JOURNEYS.includes(id)

let instance: Promise<Purchases> | null = null

function storedUserId(generate: () => string) {
  try {
    const saved = localStorage.getItem(USER_KEY)
    if (saved) return saved
    const created = generate()
    localStorage.setItem(USER_KEY, created)
    return created
  } catch {
    return generate()
  }
}

// The SDK loads lazily so free journeys never download it.
function purchases() {
  if (!apiKey) return Promise.reject(new Error("RevenueCat is not configured"))
  instance ??= import("@revenuecat/purchases-js").then(({ Purchases }) =>
    Purchases.isConfigured()
      ? Purchases.getSharedInstance()
      : Purchases.configure({
          apiKey,
          appUserId: storedUserId(Purchases.generateRevenueCatAnonymousAppUserId),
        }),
  )
  instance.catch(() => (instance = null))
  return instance
}

export async function hasPro() {
  if (!paywallEnabled) return true
  return (await purchases()).isEntitledTo(PRO_ENTITLEMENT)
}

export async function proPackages(): Promise<Package[]> {
  const offerings = await (await purchases()).getOfferings()
  return offerings.current?.availablePackages ?? []
}

// Resolves true when Pro is active, false when the learner closes checkout.
export async function buyPro(rcPackage: Package) {
  const [{ ErrorCode, PurchasesError }, sdk] = await Promise.all([
    import("@revenuecat/purchases-js"),
    purchases(),
  ])
  try {
    const { customerInfo } = await sdk.purchase({ rcPackage })
    return PRO_ENTITLEMENT in customerInfo.entitlements.active
  } catch (error) {
    if (error instanceof PurchasesError && error.errorCode === ErrorCode.UserCancelledError) return false
    throw error
  }
}
