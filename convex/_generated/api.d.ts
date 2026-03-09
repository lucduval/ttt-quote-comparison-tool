/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as claims from "../claims.js";
import type * as comparisons from "../comparisons.js";
import type * as contacts from "../contacts.js";
import type * as documents from "../documents.js";
import type * as lib_roles from "../lib/roles.js";
import type * as processClaim from "../processClaim.js";
import type * as processQuotes from "../processQuotes.js";
import type * as refineOutput from "../refineOutput.js";
import type * as sessions from "../sessions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  claims: typeof claims;
  comparisons: typeof comparisons;
  contacts: typeof contacts;
  documents: typeof documents;
  "lib/roles": typeof lib_roles;
  processClaim: typeof processClaim;
  processQuotes: typeof processQuotes;
  refineOutput: typeof refineOutput;
  sessions: typeof sessions;
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
