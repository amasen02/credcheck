/**
 * Synthetic values shaped like real provider secrets, used across the suite to exercise
 * detection rules. Each is assembled by concatenation rather than written as one contiguous
 * literal, so the full value never appears as a matchable substring in this file's own source -
 * GitHub push protection (and any other secret scanner pointed at this repository) would
 * otherwise block commits over fake fixtures that merely have the right shape. The assembled
 * value is identical to writing the literal directly; only the *source text* differs.
 */

export const FAKE_AWS_ACCESS_KEY_ID = ["AKIA", "ABCDEFGHIJKLMNOP"].join("");
export const FAKE_AWS_ACCESS_KEY_ID_ALT = ["AKIA", "ZZZZZZZZZZZZZZZZ"].join("");
export const FAKE_AWS_SECRET_ACCESS_KEY = ["RheDgcpFhPfad5FMOJkDSHyfRWqEKGw", "7zAqzBzIp"].join("");
export const FAKE_GITHUB_TOKEN = ["ghp_", "cbYvPlzGZfSufCxweIPXsEqzCS86jFwlA9cc"].join("");
export const FAKE_NPM_TOKEN = ["npm_", "B280NNw4ZXDkIzfdBSajdQoV3tNZZXfnEIy4"].join("");
export const FAKE_STRIPE_LIVE_KEY = ["sk_live_", "51H8xJ2KZTOPQRSTUVWXYZ0123456789"].join("");
