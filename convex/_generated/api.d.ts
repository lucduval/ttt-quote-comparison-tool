/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as claims from "../claims.js";
import type * as comparisons from "../comparisons.js";
import type * as contacts from "../contacts.js";
import type * as documents from "../documents.js";
import type * as processClaim from "../processClaim.js";
import type * as processQuotes from "../processQuotes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  claims: typeof claims;
  comparisons: typeof comparisons;
  contacts: typeof contacts;
  documents: typeof documents;
  processClaim: typeof processClaim;
  processQuotes: typeof processQuotes;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
