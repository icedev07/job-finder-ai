
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model ScrapedJob
 * 
 */
export type ScrapedJob = $Result.DefaultSelection<Prisma.$ScrapedJobPayload>
/**
 * Model AppConfig
 * 
 */
export type AppConfig = $Result.DefaultSelection<Prisma.$AppConfigPayload>
/**
 * Model SkipRule
 * 
 */
export type SkipRule = $Result.DefaultSelection<Prisma.$SkipRulePayload>
/**
 * Model ScanLog
 * 
 */
export type ScanLog = $Result.DefaultSelection<Prisma.$ScanLogPayload>
/**
 * Model AnalysisLog
 * 
 */
export type AnalysisLog = $Result.DefaultSelection<Prisma.$AnalysisLogPayload>
/**
 * Model Resume
 * 
 */
export type Resume = $Result.DefaultSelection<Prisma.$ResumePayload>
/**
 * Model SavedAnswer
 * 
 */
export type SavedAnswer = $Result.DefaultSelection<Prisma.$SavedAnswerPayload>
/**
 * Model AiUsage
 * 
 */
export type AiUsage = $Result.DefaultSelection<Prisma.$AiUsagePayload>
/**
 * Model ExtensionLog
 * 
 */
export type ExtensionLog = $Result.DefaultSelection<Prisma.$ExtensionLogPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const JobStatus: {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus]


export const SkipRuleType: {
  TITLE: 'TITLE',
  COMPANY: 'COMPANY',
  URL: 'URL'
};

export type SkipRuleType = (typeof SkipRuleType)[keyof typeof SkipRuleType]

}

export type JobStatus = $Enums.JobStatus

export const JobStatus: typeof $Enums.JobStatus

export type SkipRuleType = $Enums.SkipRuleType

export const SkipRuleType: typeof $Enums.SkipRuleType

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs>;

  /**
   * `prisma.scrapedJob`: Exposes CRUD operations for the **ScrapedJob** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ScrapedJobs
    * const scrapedJobs = await prisma.scrapedJob.findMany()
    * ```
    */
  get scrapedJob(): Prisma.ScrapedJobDelegate<ExtArgs>;

  /**
   * `prisma.appConfig`: Exposes CRUD operations for the **AppConfig** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AppConfigs
    * const appConfigs = await prisma.appConfig.findMany()
    * ```
    */
  get appConfig(): Prisma.AppConfigDelegate<ExtArgs>;

  /**
   * `prisma.skipRule`: Exposes CRUD operations for the **SkipRule** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SkipRules
    * const skipRules = await prisma.skipRule.findMany()
    * ```
    */
  get skipRule(): Prisma.SkipRuleDelegate<ExtArgs>;

  /**
   * `prisma.scanLog`: Exposes CRUD operations for the **ScanLog** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ScanLogs
    * const scanLogs = await prisma.scanLog.findMany()
    * ```
    */
  get scanLog(): Prisma.ScanLogDelegate<ExtArgs>;

  /**
   * `prisma.analysisLog`: Exposes CRUD operations for the **AnalysisLog** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AnalysisLogs
    * const analysisLogs = await prisma.analysisLog.findMany()
    * ```
    */
  get analysisLog(): Prisma.AnalysisLogDelegate<ExtArgs>;

  /**
   * `prisma.resume`: Exposes CRUD operations for the **Resume** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Resumes
    * const resumes = await prisma.resume.findMany()
    * ```
    */
  get resume(): Prisma.ResumeDelegate<ExtArgs>;

  /**
   * `prisma.savedAnswer`: Exposes CRUD operations for the **SavedAnswer** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SavedAnswers
    * const savedAnswers = await prisma.savedAnswer.findMany()
    * ```
    */
  get savedAnswer(): Prisma.SavedAnswerDelegate<ExtArgs>;

  /**
   * `prisma.aiUsage`: Exposes CRUD operations for the **AiUsage** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AiUsages
    * const aiUsages = await prisma.aiUsage.findMany()
    * ```
    */
  get aiUsage(): Prisma.AiUsageDelegate<ExtArgs>;

  /**
   * `prisma.extensionLog`: Exposes CRUD operations for the **ExtensionLog** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ExtensionLogs
    * const extensionLogs = await prisma.extensionLog.findMany()
    * ```
    */
  get extensionLog(): Prisma.ExtensionLogDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    ScrapedJob: 'ScrapedJob',
    AppConfig: 'AppConfig',
    SkipRule: 'SkipRule',
    ScanLog: 'ScanLog',
    AnalysisLog: 'AnalysisLog',
    Resume: 'Resume',
    SavedAnswer: 'SavedAnswer',
    AiUsage: 'AiUsage',
    ExtensionLog: 'ExtensionLog'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "user" | "scrapedJob" | "appConfig" | "skipRule" | "scanLog" | "analysisLog" | "resume" | "savedAnswer" | "aiUsage" | "extensionLog"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      ScrapedJob: {
        payload: Prisma.$ScrapedJobPayload<ExtArgs>
        fields: Prisma.ScrapedJobFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ScrapedJobFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScrapedJobPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ScrapedJobFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScrapedJobPayload>
          }
          findFirst: {
            args: Prisma.ScrapedJobFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScrapedJobPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ScrapedJobFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScrapedJobPayload>
          }
          findMany: {
            args: Prisma.ScrapedJobFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScrapedJobPayload>[]
          }
          create: {
            args: Prisma.ScrapedJobCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScrapedJobPayload>
          }
          createMany: {
            args: Prisma.ScrapedJobCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ScrapedJobCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScrapedJobPayload>[]
          }
          delete: {
            args: Prisma.ScrapedJobDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScrapedJobPayload>
          }
          update: {
            args: Prisma.ScrapedJobUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScrapedJobPayload>
          }
          deleteMany: {
            args: Prisma.ScrapedJobDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ScrapedJobUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ScrapedJobUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScrapedJobPayload>
          }
          aggregate: {
            args: Prisma.ScrapedJobAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateScrapedJob>
          }
          groupBy: {
            args: Prisma.ScrapedJobGroupByArgs<ExtArgs>
            result: $Utils.Optional<ScrapedJobGroupByOutputType>[]
          }
          count: {
            args: Prisma.ScrapedJobCountArgs<ExtArgs>
            result: $Utils.Optional<ScrapedJobCountAggregateOutputType> | number
          }
        }
      }
      AppConfig: {
        payload: Prisma.$AppConfigPayload<ExtArgs>
        fields: Prisma.AppConfigFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AppConfigFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AppConfigPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AppConfigFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AppConfigPayload>
          }
          findFirst: {
            args: Prisma.AppConfigFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AppConfigPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AppConfigFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AppConfigPayload>
          }
          findMany: {
            args: Prisma.AppConfigFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AppConfigPayload>[]
          }
          create: {
            args: Prisma.AppConfigCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AppConfigPayload>
          }
          createMany: {
            args: Prisma.AppConfigCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AppConfigCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AppConfigPayload>[]
          }
          delete: {
            args: Prisma.AppConfigDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AppConfigPayload>
          }
          update: {
            args: Prisma.AppConfigUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AppConfigPayload>
          }
          deleteMany: {
            args: Prisma.AppConfigDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AppConfigUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.AppConfigUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AppConfigPayload>
          }
          aggregate: {
            args: Prisma.AppConfigAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAppConfig>
          }
          groupBy: {
            args: Prisma.AppConfigGroupByArgs<ExtArgs>
            result: $Utils.Optional<AppConfigGroupByOutputType>[]
          }
          count: {
            args: Prisma.AppConfigCountArgs<ExtArgs>
            result: $Utils.Optional<AppConfigCountAggregateOutputType> | number
          }
        }
      }
      SkipRule: {
        payload: Prisma.$SkipRulePayload<ExtArgs>
        fields: Prisma.SkipRuleFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SkipRuleFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkipRulePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SkipRuleFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkipRulePayload>
          }
          findFirst: {
            args: Prisma.SkipRuleFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkipRulePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SkipRuleFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkipRulePayload>
          }
          findMany: {
            args: Prisma.SkipRuleFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkipRulePayload>[]
          }
          create: {
            args: Prisma.SkipRuleCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkipRulePayload>
          }
          createMany: {
            args: Prisma.SkipRuleCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SkipRuleCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkipRulePayload>[]
          }
          delete: {
            args: Prisma.SkipRuleDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkipRulePayload>
          }
          update: {
            args: Prisma.SkipRuleUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkipRulePayload>
          }
          deleteMany: {
            args: Prisma.SkipRuleDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SkipRuleUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.SkipRuleUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SkipRulePayload>
          }
          aggregate: {
            args: Prisma.SkipRuleAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSkipRule>
          }
          groupBy: {
            args: Prisma.SkipRuleGroupByArgs<ExtArgs>
            result: $Utils.Optional<SkipRuleGroupByOutputType>[]
          }
          count: {
            args: Prisma.SkipRuleCountArgs<ExtArgs>
            result: $Utils.Optional<SkipRuleCountAggregateOutputType> | number
          }
        }
      }
      ScanLog: {
        payload: Prisma.$ScanLogPayload<ExtArgs>
        fields: Prisma.ScanLogFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ScanLogFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanLogPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ScanLogFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanLogPayload>
          }
          findFirst: {
            args: Prisma.ScanLogFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanLogPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ScanLogFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanLogPayload>
          }
          findMany: {
            args: Prisma.ScanLogFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanLogPayload>[]
          }
          create: {
            args: Prisma.ScanLogCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanLogPayload>
          }
          createMany: {
            args: Prisma.ScanLogCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ScanLogCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanLogPayload>[]
          }
          delete: {
            args: Prisma.ScanLogDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanLogPayload>
          }
          update: {
            args: Prisma.ScanLogUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanLogPayload>
          }
          deleteMany: {
            args: Prisma.ScanLogDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ScanLogUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ScanLogUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScanLogPayload>
          }
          aggregate: {
            args: Prisma.ScanLogAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateScanLog>
          }
          groupBy: {
            args: Prisma.ScanLogGroupByArgs<ExtArgs>
            result: $Utils.Optional<ScanLogGroupByOutputType>[]
          }
          count: {
            args: Prisma.ScanLogCountArgs<ExtArgs>
            result: $Utils.Optional<ScanLogCountAggregateOutputType> | number
          }
        }
      }
      AnalysisLog: {
        payload: Prisma.$AnalysisLogPayload<ExtArgs>
        fields: Prisma.AnalysisLogFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AnalysisLogFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisLogPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AnalysisLogFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisLogPayload>
          }
          findFirst: {
            args: Prisma.AnalysisLogFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisLogPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AnalysisLogFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisLogPayload>
          }
          findMany: {
            args: Prisma.AnalysisLogFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisLogPayload>[]
          }
          create: {
            args: Prisma.AnalysisLogCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisLogPayload>
          }
          createMany: {
            args: Prisma.AnalysisLogCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AnalysisLogCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisLogPayload>[]
          }
          delete: {
            args: Prisma.AnalysisLogDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisLogPayload>
          }
          update: {
            args: Prisma.AnalysisLogUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisLogPayload>
          }
          deleteMany: {
            args: Prisma.AnalysisLogDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AnalysisLogUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.AnalysisLogUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisLogPayload>
          }
          aggregate: {
            args: Prisma.AnalysisLogAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAnalysisLog>
          }
          groupBy: {
            args: Prisma.AnalysisLogGroupByArgs<ExtArgs>
            result: $Utils.Optional<AnalysisLogGroupByOutputType>[]
          }
          count: {
            args: Prisma.AnalysisLogCountArgs<ExtArgs>
            result: $Utils.Optional<AnalysisLogCountAggregateOutputType> | number
          }
        }
      }
      Resume: {
        payload: Prisma.$ResumePayload<ExtArgs>
        fields: Prisma.ResumeFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ResumeFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ResumeFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumePayload>
          }
          findFirst: {
            args: Prisma.ResumeFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ResumeFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumePayload>
          }
          findMany: {
            args: Prisma.ResumeFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumePayload>[]
          }
          create: {
            args: Prisma.ResumeCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumePayload>
          }
          createMany: {
            args: Prisma.ResumeCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ResumeCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumePayload>[]
          }
          delete: {
            args: Prisma.ResumeDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumePayload>
          }
          update: {
            args: Prisma.ResumeUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumePayload>
          }
          deleteMany: {
            args: Prisma.ResumeDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ResumeUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ResumeUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumePayload>
          }
          aggregate: {
            args: Prisma.ResumeAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateResume>
          }
          groupBy: {
            args: Prisma.ResumeGroupByArgs<ExtArgs>
            result: $Utils.Optional<ResumeGroupByOutputType>[]
          }
          count: {
            args: Prisma.ResumeCountArgs<ExtArgs>
            result: $Utils.Optional<ResumeCountAggregateOutputType> | number
          }
        }
      }
      SavedAnswer: {
        payload: Prisma.$SavedAnswerPayload<ExtArgs>
        fields: Prisma.SavedAnswerFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SavedAnswerFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SavedAnswerPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SavedAnswerFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SavedAnswerPayload>
          }
          findFirst: {
            args: Prisma.SavedAnswerFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SavedAnswerPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SavedAnswerFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SavedAnswerPayload>
          }
          findMany: {
            args: Prisma.SavedAnswerFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SavedAnswerPayload>[]
          }
          create: {
            args: Prisma.SavedAnswerCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SavedAnswerPayload>
          }
          createMany: {
            args: Prisma.SavedAnswerCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SavedAnswerCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SavedAnswerPayload>[]
          }
          delete: {
            args: Prisma.SavedAnswerDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SavedAnswerPayload>
          }
          update: {
            args: Prisma.SavedAnswerUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SavedAnswerPayload>
          }
          deleteMany: {
            args: Prisma.SavedAnswerDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SavedAnswerUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.SavedAnswerUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SavedAnswerPayload>
          }
          aggregate: {
            args: Prisma.SavedAnswerAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSavedAnswer>
          }
          groupBy: {
            args: Prisma.SavedAnswerGroupByArgs<ExtArgs>
            result: $Utils.Optional<SavedAnswerGroupByOutputType>[]
          }
          count: {
            args: Prisma.SavedAnswerCountArgs<ExtArgs>
            result: $Utils.Optional<SavedAnswerCountAggregateOutputType> | number
          }
        }
      }
      AiUsage: {
        payload: Prisma.$AiUsagePayload<ExtArgs>
        fields: Prisma.AiUsageFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AiUsageFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiUsagePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AiUsageFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiUsagePayload>
          }
          findFirst: {
            args: Prisma.AiUsageFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiUsagePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AiUsageFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiUsagePayload>
          }
          findMany: {
            args: Prisma.AiUsageFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiUsagePayload>[]
          }
          create: {
            args: Prisma.AiUsageCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiUsagePayload>
          }
          createMany: {
            args: Prisma.AiUsageCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AiUsageCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiUsagePayload>[]
          }
          delete: {
            args: Prisma.AiUsageDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiUsagePayload>
          }
          update: {
            args: Prisma.AiUsageUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiUsagePayload>
          }
          deleteMany: {
            args: Prisma.AiUsageDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AiUsageUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.AiUsageUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiUsagePayload>
          }
          aggregate: {
            args: Prisma.AiUsageAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAiUsage>
          }
          groupBy: {
            args: Prisma.AiUsageGroupByArgs<ExtArgs>
            result: $Utils.Optional<AiUsageGroupByOutputType>[]
          }
          count: {
            args: Prisma.AiUsageCountArgs<ExtArgs>
            result: $Utils.Optional<AiUsageCountAggregateOutputType> | number
          }
        }
      }
      ExtensionLog: {
        payload: Prisma.$ExtensionLogPayload<ExtArgs>
        fields: Prisma.ExtensionLogFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ExtensionLogFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExtensionLogPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ExtensionLogFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExtensionLogPayload>
          }
          findFirst: {
            args: Prisma.ExtensionLogFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExtensionLogPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ExtensionLogFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExtensionLogPayload>
          }
          findMany: {
            args: Prisma.ExtensionLogFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExtensionLogPayload>[]
          }
          create: {
            args: Prisma.ExtensionLogCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExtensionLogPayload>
          }
          createMany: {
            args: Prisma.ExtensionLogCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ExtensionLogCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExtensionLogPayload>[]
          }
          delete: {
            args: Prisma.ExtensionLogDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExtensionLogPayload>
          }
          update: {
            args: Prisma.ExtensionLogUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExtensionLogPayload>
          }
          deleteMany: {
            args: Prisma.ExtensionLogDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ExtensionLogUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ExtensionLogUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExtensionLogPayload>
          }
          aggregate: {
            args: Prisma.ExtensionLogAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateExtensionLog>
          }
          groupBy: {
            args: Prisma.ExtensionLogGroupByArgs<ExtArgs>
            result: $Utils.Optional<ExtensionLogGroupByOutputType>[]
          }
          count: {
            args: Prisma.ExtensionLogCountArgs<ExtArgs>
            result: $Utils.Optional<ExtensionLogCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }


  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type ScrapedJobCountOutputType
   */

  export type ScrapedJobCountOutputType = {
    analysisLogs: number
  }

  export type ScrapedJobCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    analysisLogs?: boolean | ScrapedJobCountOutputTypeCountAnalysisLogsArgs
  }

  // Custom InputTypes
  /**
   * ScrapedJobCountOutputType without action
   */
  export type ScrapedJobCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScrapedJobCountOutputType
     */
    select?: ScrapedJobCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ScrapedJobCountOutputType without action
   */
  export type ScrapedJobCountOutputTypeCountAnalysisLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AnalysisLogWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserAvgAggregateOutputType = {
    id: number | null
    sessionVersion: number | null
  }

  export type UserSumAggregateOutputType = {
    id: number | null
    sessionVersion: number | null
  }

  export type UserMinAggregateOutputType = {
    id: number | null
    username: string | null
    name: string | null
    passwordHash: string | null
    role: string | null
    active: boolean | null
    sessionVersion: number | null
    lastLoginAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: number | null
    username: string | null
    name: string | null
    passwordHash: string | null
    role: string | null
    active: boolean | null
    sessionVersion: number | null
    lastLoginAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    username: number
    name: number
    passwordHash: number
    role: number
    active: number
    sessionVersion: number
    lastLoginAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserAvgAggregateInputType = {
    id?: true
    sessionVersion?: true
  }

  export type UserSumAggregateInputType = {
    id?: true
    sessionVersion?: true
  }

  export type UserMinAggregateInputType = {
    id?: true
    username?: true
    name?: true
    passwordHash?: true
    role?: true
    active?: true
    sessionVersion?: true
    lastLoginAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    username?: true
    name?: true
    passwordHash?: true
    role?: true
    active?: true
    sessionVersion?: true
    lastLoginAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    username?: true
    name?: true
    passwordHash?: true
    role?: true
    active?: true
    sessionVersion?: true
    lastLoginAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UserAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UserSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _avg?: UserAvgAggregateInputType
    _sum?: UserSumAggregateInputType
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: number
    username: string
    name: string
    passwordHash: string
    role: string
    active: boolean
    sessionVersion: number
    lastLoginAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    username?: boolean
    name?: boolean
    passwordHash?: boolean
    role?: boolean
    active?: boolean
    sessionVersion?: boolean
    lastLoginAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    username?: boolean
    name?: boolean
    passwordHash?: boolean
    role?: boolean
    active?: boolean
    sessionVersion?: boolean
    lastLoginAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    username?: boolean
    name?: boolean
    passwordHash?: boolean
    role?: boolean
    active?: boolean
    sessionVersion?: boolean
    lastLoginAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }


  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      username: string
      name: string
      passwordHash: string
      role: string
      active: boolean
      sessionVersion: number
      lastLoginAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */ 
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'Int'>
    readonly username: FieldRef<"User", 'String'>
    readonly name: FieldRef<"User", 'String'>
    readonly passwordHash: FieldRef<"User", 'String'>
    readonly role: FieldRef<"User", 'String'>
    readonly active: FieldRef<"User", 'Boolean'>
    readonly sessionVersion: FieldRef<"User", 'Int'>
    readonly lastLoginAt: FieldRef<"User", 'DateTime'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
  }


  /**
   * Model ScrapedJob
   */

  export type AggregateScrapedJob = {
    _count: ScrapedJobCountAggregateOutputType | null
    _avg: ScrapedJobAvgAggregateOutputType | null
    _sum: ScrapedJobSumAggregateOutputType | null
    _min: ScrapedJobMinAggregateOutputType | null
    _max: ScrapedJobMaxAggregateOutputType | null
  }

  export type ScrapedJobAvgAggregateOutputType = {
    id: number | null
    aiScore: number | null
    resumeId: number | null
    feedback: number | null
  }

  export type ScrapedJobSumAggregateOutputType = {
    id: number | null
    aiScore: number | null
    resumeId: number | null
    feedback: number | null
  }

  export type ScrapedJobMinAggregateOutputType = {
    id: number | null
    platform: string | null
    title: string | null
    company: string | null
    location: string | null
    url: string | null
    manualApplyUrl: string | null
    applyMethod: string | null
    description: string | null
    salary: string | null
    techStack: string | null
    status: $Enums.JobStatus | null
    aiScore: number | null
    aiReason: string | null
    sheetSynced: boolean | null
    createdAt: Date | null
    stage: string | null
    stageUpdatedAt: Date | null
    appliedAt: Date | null
    followUpAt: Date | null
    notes: string | null
    resumeId: number | null
    applicationData: string | null
    feedback: number | null
    feedbackAt: Date | null
    eligibility: string | null
    signals: string | null
  }

  export type ScrapedJobMaxAggregateOutputType = {
    id: number | null
    platform: string | null
    title: string | null
    company: string | null
    location: string | null
    url: string | null
    manualApplyUrl: string | null
    applyMethod: string | null
    description: string | null
    salary: string | null
    techStack: string | null
    status: $Enums.JobStatus | null
    aiScore: number | null
    aiReason: string | null
    sheetSynced: boolean | null
    createdAt: Date | null
    stage: string | null
    stageUpdatedAt: Date | null
    appliedAt: Date | null
    followUpAt: Date | null
    notes: string | null
    resumeId: number | null
    applicationData: string | null
    feedback: number | null
    feedbackAt: Date | null
    eligibility: string | null
    signals: string | null
  }

  export type ScrapedJobCountAggregateOutputType = {
    id: number
    platform: number
    title: number
    company: number
    location: number
    url: number
    manualApplyUrl: number
    applyMethod: number
    description: number
    salary: number
    techStack: number
    status: number
    aiScore: number
    aiReason: number
    sheetSynced: number
    createdAt: number
    stage: number
    stageUpdatedAt: number
    appliedAt: number
    followUpAt: number
    notes: number
    resumeId: number
    applicationData: number
    feedback: number
    feedbackAt: number
    eligibility: number
    signals: number
    _all: number
  }


  export type ScrapedJobAvgAggregateInputType = {
    id?: true
    aiScore?: true
    resumeId?: true
    feedback?: true
  }

  export type ScrapedJobSumAggregateInputType = {
    id?: true
    aiScore?: true
    resumeId?: true
    feedback?: true
  }

  export type ScrapedJobMinAggregateInputType = {
    id?: true
    platform?: true
    title?: true
    company?: true
    location?: true
    url?: true
    manualApplyUrl?: true
    applyMethod?: true
    description?: true
    salary?: true
    techStack?: true
    status?: true
    aiScore?: true
    aiReason?: true
    sheetSynced?: true
    createdAt?: true
    stage?: true
    stageUpdatedAt?: true
    appliedAt?: true
    followUpAt?: true
    notes?: true
    resumeId?: true
    applicationData?: true
    feedback?: true
    feedbackAt?: true
    eligibility?: true
    signals?: true
  }

  export type ScrapedJobMaxAggregateInputType = {
    id?: true
    platform?: true
    title?: true
    company?: true
    location?: true
    url?: true
    manualApplyUrl?: true
    applyMethod?: true
    description?: true
    salary?: true
    techStack?: true
    status?: true
    aiScore?: true
    aiReason?: true
    sheetSynced?: true
    createdAt?: true
    stage?: true
    stageUpdatedAt?: true
    appliedAt?: true
    followUpAt?: true
    notes?: true
    resumeId?: true
    applicationData?: true
    feedback?: true
    feedbackAt?: true
    eligibility?: true
    signals?: true
  }

  export type ScrapedJobCountAggregateInputType = {
    id?: true
    platform?: true
    title?: true
    company?: true
    location?: true
    url?: true
    manualApplyUrl?: true
    applyMethod?: true
    description?: true
    salary?: true
    techStack?: true
    status?: true
    aiScore?: true
    aiReason?: true
    sheetSynced?: true
    createdAt?: true
    stage?: true
    stageUpdatedAt?: true
    appliedAt?: true
    followUpAt?: true
    notes?: true
    resumeId?: true
    applicationData?: true
    feedback?: true
    feedbackAt?: true
    eligibility?: true
    signals?: true
    _all?: true
  }

  export type ScrapedJobAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ScrapedJob to aggregate.
     */
    where?: ScrapedJobWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScrapedJobs to fetch.
     */
    orderBy?: ScrapedJobOrderByWithRelationInput | ScrapedJobOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ScrapedJobWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScrapedJobs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScrapedJobs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ScrapedJobs
    **/
    _count?: true | ScrapedJobCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ScrapedJobAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ScrapedJobSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ScrapedJobMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ScrapedJobMaxAggregateInputType
  }

  export type GetScrapedJobAggregateType<T extends ScrapedJobAggregateArgs> = {
        [P in keyof T & keyof AggregateScrapedJob]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateScrapedJob[P]>
      : GetScalarType<T[P], AggregateScrapedJob[P]>
  }




  export type ScrapedJobGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ScrapedJobWhereInput
    orderBy?: ScrapedJobOrderByWithAggregationInput | ScrapedJobOrderByWithAggregationInput[]
    by: ScrapedJobScalarFieldEnum[] | ScrapedJobScalarFieldEnum
    having?: ScrapedJobScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ScrapedJobCountAggregateInputType | true
    _avg?: ScrapedJobAvgAggregateInputType
    _sum?: ScrapedJobSumAggregateInputType
    _min?: ScrapedJobMinAggregateInputType
    _max?: ScrapedJobMaxAggregateInputType
  }

  export type ScrapedJobGroupByOutputType = {
    id: number
    platform: string
    title: string
    company: string
    location: string | null
    url: string
    manualApplyUrl: string | null
    applyMethod: string | null
    description: string | null
    salary: string | null
    techStack: string | null
    status: $Enums.JobStatus
    aiScore: number | null
    aiReason: string | null
    sheetSynced: boolean
    createdAt: Date
    stage: string | null
    stageUpdatedAt: Date | null
    appliedAt: Date | null
    followUpAt: Date | null
    notes: string | null
    resumeId: number | null
    applicationData: string | null
    feedback: number | null
    feedbackAt: Date | null
    eligibility: string | null
    signals: string | null
    _count: ScrapedJobCountAggregateOutputType | null
    _avg: ScrapedJobAvgAggregateOutputType | null
    _sum: ScrapedJobSumAggregateOutputType | null
    _min: ScrapedJobMinAggregateOutputType | null
    _max: ScrapedJobMaxAggregateOutputType | null
  }

  type GetScrapedJobGroupByPayload<T extends ScrapedJobGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ScrapedJobGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ScrapedJobGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ScrapedJobGroupByOutputType[P]>
            : GetScalarType<T[P], ScrapedJobGroupByOutputType[P]>
        }
      >
    >


  export type ScrapedJobSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    platform?: boolean
    title?: boolean
    company?: boolean
    location?: boolean
    url?: boolean
    manualApplyUrl?: boolean
    applyMethod?: boolean
    description?: boolean
    salary?: boolean
    techStack?: boolean
    status?: boolean
    aiScore?: boolean
    aiReason?: boolean
    sheetSynced?: boolean
    createdAt?: boolean
    stage?: boolean
    stageUpdatedAt?: boolean
    appliedAt?: boolean
    followUpAt?: boolean
    notes?: boolean
    resumeId?: boolean
    applicationData?: boolean
    feedback?: boolean
    feedbackAt?: boolean
    eligibility?: boolean
    signals?: boolean
    analysisLogs?: boolean | ScrapedJob$analysisLogsArgs<ExtArgs>
    _count?: boolean | ScrapedJobCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["scrapedJob"]>

  export type ScrapedJobSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    platform?: boolean
    title?: boolean
    company?: boolean
    location?: boolean
    url?: boolean
    manualApplyUrl?: boolean
    applyMethod?: boolean
    description?: boolean
    salary?: boolean
    techStack?: boolean
    status?: boolean
    aiScore?: boolean
    aiReason?: boolean
    sheetSynced?: boolean
    createdAt?: boolean
    stage?: boolean
    stageUpdatedAt?: boolean
    appliedAt?: boolean
    followUpAt?: boolean
    notes?: boolean
    resumeId?: boolean
    applicationData?: boolean
    feedback?: boolean
    feedbackAt?: boolean
    eligibility?: boolean
    signals?: boolean
  }, ExtArgs["result"]["scrapedJob"]>

  export type ScrapedJobSelectScalar = {
    id?: boolean
    platform?: boolean
    title?: boolean
    company?: boolean
    location?: boolean
    url?: boolean
    manualApplyUrl?: boolean
    applyMethod?: boolean
    description?: boolean
    salary?: boolean
    techStack?: boolean
    status?: boolean
    aiScore?: boolean
    aiReason?: boolean
    sheetSynced?: boolean
    createdAt?: boolean
    stage?: boolean
    stageUpdatedAt?: boolean
    appliedAt?: boolean
    followUpAt?: boolean
    notes?: boolean
    resumeId?: boolean
    applicationData?: boolean
    feedback?: boolean
    feedbackAt?: boolean
    eligibility?: boolean
    signals?: boolean
  }

  export type ScrapedJobInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    analysisLogs?: boolean | ScrapedJob$analysisLogsArgs<ExtArgs>
    _count?: boolean | ScrapedJobCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ScrapedJobIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $ScrapedJobPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ScrapedJob"
    objects: {
      analysisLogs: Prisma.$AnalysisLogPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      platform: string
      title: string
      company: string
      location: string | null
      url: string
      manualApplyUrl: string | null
      applyMethod: string | null
      description: string | null
      salary: string | null
      techStack: string | null
      status: $Enums.JobStatus
      aiScore: number | null
      aiReason: string | null
      sheetSynced: boolean
      createdAt: Date
      stage: string | null
      stageUpdatedAt: Date | null
      appliedAt: Date | null
      followUpAt: Date | null
      notes: string | null
      resumeId: number | null
      applicationData: string | null
      feedback: number | null
      feedbackAt: Date | null
      eligibility: string | null
      signals: string | null
    }, ExtArgs["result"]["scrapedJob"]>
    composites: {}
  }

  type ScrapedJobGetPayload<S extends boolean | null | undefined | ScrapedJobDefaultArgs> = $Result.GetResult<Prisma.$ScrapedJobPayload, S>

  type ScrapedJobCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ScrapedJobFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ScrapedJobCountAggregateInputType | true
    }

  export interface ScrapedJobDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ScrapedJob'], meta: { name: 'ScrapedJob' } }
    /**
     * Find zero or one ScrapedJob that matches the filter.
     * @param {ScrapedJobFindUniqueArgs} args - Arguments to find a ScrapedJob
     * @example
     * // Get one ScrapedJob
     * const scrapedJob = await prisma.scrapedJob.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ScrapedJobFindUniqueArgs>(args: SelectSubset<T, ScrapedJobFindUniqueArgs<ExtArgs>>): Prisma__ScrapedJobClient<$Result.GetResult<Prisma.$ScrapedJobPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ScrapedJob that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ScrapedJobFindUniqueOrThrowArgs} args - Arguments to find a ScrapedJob
     * @example
     * // Get one ScrapedJob
     * const scrapedJob = await prisma.scrapedJob.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ScrapedJobFindUniqueOrThrowArgs>(args: SelectSubset<T, ScrapedJobFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ScrapedJobClient<$Result.GetResult<Prisma.$ScrapedJobPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ScrapedJob that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScrapedJobFindFirstArgs} args - Arguments to find a ScrapedJob
     * @example
     * // Get one ScrapedJob
     * const scrapedJob = await prisma.scrapedJob.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ScrapedJobFindFirstArgs>(args?: SelectSubset<T, ScrapedJobFindFirstArgs<ExtArgs>>): Prisma__ScrapedJobClient<$Result.GetResult<Prisma.$ScrapedJobPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ScrapedJob that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScrapedJobFindFirstOrThrowArgs} args - Arguments to find a ScrapedJob
     * @example
     * // Get one ScrapedJob
     * const scrapedJob = await prisma.scrapedJob.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ScrapedJobFindFirstOrThrowArgs>(args?: SelectSubset<T, ScrapedJobFindFirstOrThrowArgs<ExtArgs>>): Prisma__ScrapedJobClient<$Result.GetResult<Prisma.$ScrapedJobPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ScrapedJobs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScrapedJobFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ScrapedJobs
     * const scrapedJobs = await prisma.scrapedJob.findMany()
     * 
     * // Get first 10 ScrapedJobs
     * const scrapedJobs = await prisma.scrapedJob.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const scrapedJobWithIdOnly = await prisma.scrapedJob.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ScrapedJobFindManyArgs>(args?: SelectSubset<T, ScrapedJobFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScrapedJobPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ScrapedJob.
     * @param {ScrapedJobCreateArgs} args - Arguments to create a ScrapedJob.
     * @example
     * // Create one ScrapedJob
     * const ScrapedJob = await prisma.scrapedJob.create({
     *   data: {
     *     // ... data to create a ScrapedJob
     *   }
     * })
     * 
     */
    create<T extends ScrapedJobCreateArgs>(args: SelectSubset<T, ScrapedJobCreateArgs<ExtArgs>>): Prisma__ScrapedJobClient<$Result.GetResult<Prisma.$ScrapedJobPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ScrapedJobs.
     * @param {ScrapedJobCreateManyArgs} args - Arguments to create many ScrapedJobs.
     * @example
     * // Create many ScrapedJobs
     * const scrapedJob = await prisma.scrapedJob.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ScrapedJobCreateManyArgs>(args?: SelectSubset<T, ScrapedJobCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ScrapedJobs and returns the data saved in the database.
     * @param {ScrapedJobCreateManyAndReturnArgs} args - Arguments to create many ScrapedJobs.
     * @example
     * // Create many ScrapedJobs
     * const scrapedJob = await prisma.scrapedJob.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ScrapedJobs and only return the `id`
     * const scrapedJobWithIdOnly = await prisma.scrapedJob.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ScrapedJobCreateManyAndReturnArgs>(args?: SelectSubset<T, ScrapedJobCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScrapedJobPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ScrapedJob.
     * @param {ScrapedJobDeleteArgs} args - Arguments to delete one ScrapedJob.
     * @example
     * // Delete one ScrapedJob
     * const ScrapedJob = await prisma.scrapedJob.delete({
     *   where: {
     *     // ... filter to delete one ScrapedJob
     *   }
     * })
     * 
     */
    delete<T extends ScrapedJobDeleteArgs>(args: SelectSubset<T, ScrapedJobDeleteArgs<ExtArgs>>): Prisma__ScrapedJobClient<$Result.GetResult<Prisma.$ScrapedJobPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ScrapedJob.
     * @param {ScrapedJobUpdateArgs} args - Arguments to update one ScrapedJob.
     * @example
     * // Update one ScrapedJob
     * const scrapedJob = await prisma.scrapedJob.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ScrapedJobUpdateArgs>(args: SelectSubset<T, ScrapedJobUpdateArgs<ExtArgs>>): Prisma__ScrapedJobClient<$Result.GetResult<Prisma.$ScrapedJobPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ScrapedJobs.
     * @param {ScrapedJobDeleteManyArgs} args - Arguments to filter ScrapedJobs to delete.
     * @example
     * // Delete a few ScrapedJobs
     * const { count } = await prisma.scrapedJob.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ScrapedJobDeleteManyArgs>(args?: SelectSubset<T, ScrapedJobDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ScrapedJobs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScrapedJobUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ScrapedJobs
     * const scrapedJob = await prisma.scrapedJob.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ScrapedJobUpdateManyArgs>(args: SelectSubset<T, ScrapedJobUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ScrapedJob.
     * @param {ScrapedJobUpsertArgs} args - Arguments to update or create a ScrapedJob.
     * @example
     * // Update or create a ScrapedJob
     * const scrapedJob = await prisma.scrapedJob.upsert({
     *   create: {
     *     // ... data to create a ScrapedJob
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ScrapedJob we want to update
     *   }
     * })
     */
    upsert<T extends ScrapedJobUpsertArgs>(args: SelectSubset<T, ScrapedJobUpsertArgs<ExtArgs>>): Prisma__ScrapedJobClient<$Result.GetResult<Prisma.$ScrapedJobPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ScrapedJobs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScrapedJobCountArgs} args - Arguments to filter ScrapedJobs to count.
     * @example
     * // Count the number of ScrapedJobs
     * const count = await prisma.scrapedJob.count({
     *   where: {
     *     // ... the filter for the ScrapedJobs we want to count
     *   }
     * })
    **/
    count<T extends ScrapedJobCountArgs>(
      args?: Subset<T, ScrapedJobCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ScrapedJobCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ScrapedJob.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScrapedJobAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ScrapedJobAggregateArgs>(args: Subset<T, ScrapedJobAggregateArgs>): Prisma.PrismaPromise<GetScrapedJobAggregateType<T>>

    /**
     * Group by ScrapedJob.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScrapedJobGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ScrapedJobGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ScrapedJobGroupByArgs['orderBy'] }
        : { orderBy?: ScrapedJobGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ScrapedJobGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetScrapedJobGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ScrapedJob model
   */
  readonly fields: ScrapedJobFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ScrapedJob.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ScrapedJobClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    analysisLogs<T extends ScrapedJob$analysisLogsArgs<ExtArgs> = {}>(args?: Subset<T, ScrapedJob$analysisLogsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AnalysisLogPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ScrapedJob model
   */ 
  interface ScrapedJobFieldRefs {
    readonly id: FieldRef<"ScrapedJob", 'Int'>
    readonly platform: FieldRef<"ScrapedJob", 'String'>
    readonly title: FieldRef<"ScrapedJob", 'String'>
    readonly company: FieldRef<"ScrapedJob", 'String'>
    readonly location: FieldRef<"ScrapedJob", 'String'>
    readonly url: FieldRef<"ScrapedJob", 'String'>
    readonly manualApplyUrl: FieldRef<"ScrapedJob", 'String'>
    readonly applyMethod: FieldRef<"ScrapedJob", 'String'>
    readonly description: FieldRef<"ScrapedJob", 'String'>
    readonly salary: FieldRef<"ScrapedJob", 'String'>
    readonly techStack: FieldRef<"ScrapedJob", 'String'>
    readonly status: FieldRef<"ScrapedJob", 'JobStatus'>
    readonly aiScore: FieldRef<"ScrapedJob", 'Int'>
    readonly aiReason: FieldRef<"ScrapedJob", 'String'>
    readonly sheetSynced: FieldRef<"ScrapedJob", 'Boolean'>
    readonly createdAt: FieldRef<"ScrapedJob", 'DateTime'>
    readonly stage: FieldRef<"ScrapedJob", 'String'>
    readonly stageUpdatedAt: FieldRef<"ScrapedJob", 'DateTime'>
    readonly appliedAt: FieldRef<"ScrapedJob", 'DateTime'>
    readonly followUpAt: FieldRef<"ScrapedJob", 'DateTime'>
    readonly notes: FieldRef<"ScrapedJob", 'String'>
    readonly resumeId: FieldRef<"ScrapedJob", 'Int'>
    readonly applicationData: FieldRef<"ScrapedJob", 'String'>
    readonly feedback: FieldRef<"ScrapedJob", 'Int'>
    readonly feedbackAt: FieldRef<"ScrapedJob", 'DateTime'>
    readonly eligibility: FieldRef<"ScrapedJob", 'String'>
    readonly signals: FieldRef<"ScrapedJob", 'String'>
  }
    

  // Custom InputTypes
  /**
   * ScrapedJob findUnique
   */
  export type ScrapedJobFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScrapedJob
     */
    select?: ScrapedJobSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScrapedJobInclude<ExtArgs> | null
    /**
     * Filter, which ScrapedJob to fetch.
     */
    where: ScrapedJobWhereUniqueInput
  }

  /**
   * ScrapedJob findUniqueOrThrow
   */
  export type ScrapedJobFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScrapedJob
     */
    select?: ScrapedJobSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScrapedJobInclude<ExtArgs> | null
    /**
     * Filter, which ScrapedJob to fetch.
     */
    where: ScrapedJobWhereUniqueInput
  }

  /**
   * ScrapedJob findFirst
   */
  export type ScrapedJobFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScrapedJob
     */
    select?: ScrapedJobSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScrapedJobInclude<ExtArgs> | null
    /**
     * Filter, which ScrapedJob to fetch.
     */
    where?: ScrapedJobWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScrapedJobs to fetch.
     */
    orderBy?: ScrapedJobOrderByWithRelationInput | ScrapedJobOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ScrapedJobs.
     */
    cursor?: ScrapedJobWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScrapedJobs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScrapedJobs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ScrapedJobs.
     */
    distinct?: ScrapedJobScalarFieldEnum | ScrapedJobScalarFieldEnum[]
  }

  /**
   * ScrapedJob findFirstOrThrow
   */
  export type ScrapedJobFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScrapedJob
     */
    select?: ScrapedJobSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScrapedJobInclude<ExtArgs> | null
    /**
     * Filter, which ScrapedJob to fetch.
     */
    where?: ScrapedJobWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScrapedJobs to fetch.
     */
    orderBy?: ScrapedJobOrderByWithRelationInput | ScrapedJobOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ScrapedJobs.
     */
    cursor?: ScrapedJobWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScrapedJobs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScrapedJobs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ScrapedJobs.
     */
    distinct?: ScrapedJobScalarFieldEnum | ScrapedJobScalarFieldEnum[]
  }

  /**
   * ScrapedJob findMany
   */
  export type ScrapedJobFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScrapedJob
     */
    select?: ScrapedJobSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScrapedJobInclude<ExtArgs> | null
    /**
     * Filter, which ScrapedJobs to fetch.
     */
    where?: ScrapedJobWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScrapedJobs to fetch.
     */
    orderBy?: ScrapedJobOrderByWithRelationInput | ScrapedJobOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ScrapedJobs.
     */
    cursor?: ScrapedJobWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScrapedJobs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScrapedJobs.
     */
    skip?: number
    distinct?: ScrapedJobScalarFieldEnum | ScrapedJobScalarFieldEnum[]
  }

  /**
   * ScrapedJob create
   */
  export type ScrapedJobCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScrapedJob
     */
    select?: ScrapedJobSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScrapedJobInclude<ExtArgs> | null
    /**
     * The data needed to create a ScrapedJob.
     */
    data: XOR<ScrapedJobCreateInput, ScrapedJobUncheckedCreateInput>
  }

  /**
   * ScrapedJob createMany
   */
  export type ScrapedJobCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ScrapedJobs.
     */
    data: ScrapedJobCreateManyInput | ScrapedJobCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ScrapedJob createManyAndReturn
   */
  export type ScrapedJobCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScrapedJob
     */
    select?: ScrapedJobSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ScrapedJobs.
     */
    data: ScrapedJobCreateManyInput | ScrapedJobCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ScrapedJob update
   */
  export type ScrapedJobUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScrapedJob
     */
    select?: ScrapedJobSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScrapedJobInclude<ExtArgs> | null
    /**
     * The data needed to update a ScrapedJob.
     */
    data: XOR<ScrapedJobUpdateInput, ScrapedJobUncheckedUpdateInput>
    /**
     * Choose, which ScrapedJob to update.
     */
    where: ScrapedJobWhereUniqueInput
  }

  /**
   * ScrapedJob updateMany
   */
  export type ScrapedJobUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ScrapedJobs.
     */
    data: XOR<ScrapedJobUpdateManyMutationInput, ScrapedJobUncheckedUpdateManyInput>
    /**
     * Filter which ScrapedJobs to update
     */
    where?: ScrapedJobWhereInput
  }

  /**
   * ScrapedJob upsert
   */
  export type ScrapedJobUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScrapedJob
     */
    select?: ScrapedJobSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScrapedJobInclude<ExtArgs> | null
    /**
     * The filter to search for the ScrapedJob to update in case it exists.
     */
    where: ScrapedJobWhereUniqueInput
    /**
     * In case the ScrapedJob found by the `where` argument doesn't exist, create a new ScrapedJob with this data.
     */
    create: XOR<ScrapedJobCreateInput, ScrapedJobUncheckedCreateInput>
    /**
     * In case the ScrapedJob was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ScrapedJobUpdateInput, ScrapedJobUncheckedUpdateInput>
  }

  /**
   * ScrapedJob delete
   */
  export type ScrapedJobDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScrapedJob
     */
    select?: ScrapedJobSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScrapedJobInclude<ExtArgs> | null
    /**
     * Filter which ScrapedJob to delete.
     */
    where: ScrapedJobWhereUniqueInput
  }

  /**
   * ScrapedJob deleteMany
   */
  export type ScrapedJobDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ScrapedJobs to delete
     */
    where?: ScrapedJobWhereInput
  }

  /**
   * ScrapedJob.analysisLogs
   */
  export type ScrapedJob$analysisLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalysisLog
     */
    select?: AnalysisLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisLogInclude<ExtArgs> | null
    where?: AnalysisLogWhereInput
    orderBy?: AnalysisLogOrderByWithRelationInput | AnalysisLogOrderByWithRelationInput[]
    cursor?: AnalysisLogWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AnalysisLogScalarFieldEnum | AnalysisLogScalarFieldEnum[]
  }

  /**
   * ScrapedJob without action
   */
  export type ScrapedJobDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScrapedJob
     */
    select?: ScrapedJobSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScrapedJobInclude<ExtArgs> | null
  }


  /**
   * Model AppConfig
   */

  export type AggregateAppConfig = {
    _count: AppConfigCountAggregateOutputType | null
    _min: AppConfigMinAggregateOutputType | null
    _max: AppConfigMaxAggregateOutputType | null
  }

  export type AppConfigMinAggregateOutputType = {
    key: string | null
    value: string | null
    updatedAt: Date | null
  }

  export type AppConfigMaxAggregateOutputType = {
    key: string | null
    value: string | null
    updatedAt: Date | null
  }

  export type AppConfigCountAggregateOutputType = {
    key: number
    value: number
    updatedAt: number
    _all: number
  }


  export type AppConfigMinAggregateInputType = {
    key?: true
    value?: true
    updatedAt?: true
  }

  export type AppConfigMaxAggregateInputType = {
    key?: true
    value?: true
    updatedAt?: true
  }

  export type AppConfigCountAggregateInputType = {
    key?: true
    value?: true
    updatedAt?: true
    _all?: true
  }

  export type AppConfigAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AppConfig to aggregate.
     */
    where?: AppConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AppConfigs to fetch.
     */
    orderBy?: AppConfigOrderByWithRelationInput | AppConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AppConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AppConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AppConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AppConfigs
    **/
    _count?: true | AppConfigCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AppConfigMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AppConfigMaxAggregateInputType
  }

  export type GetAppConfigAggregateType<T extends AppConfigAggregateArgs> = {
        [P in keyof T & keyof AggregateAppConfig]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAppConfig[P]>
      : GetScalarType<T[P], AggregateAppConfig[P]>
  }




  export type AppConfigGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AppConfigWhereInput
    orderBy?: AppConfigOrderByWithAggregationInput | AppConfigOrderByWithAggregationInput[]
    by: AppConfigScalarFieldEnum[] | AppConfigScalarFieldEnum
    having?: AppConfigScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AppConfigCountAggregateInputType | true
    _min?: AppConfigMinAggregateInputType
    _max?: AppConfigMaxAggregateInputType
  }

  export type AppConfigGroupByOutputType = {
    key: string
    value: string
    updatedAt: Date
    _count: AppConfigCountAggregateOutputType | null
    _min: AppConfigMinAggregateOutputType | null
    _max: AppConfigMaxAggregateOutputType | null
  }

  type GetAppConfigGroupByPayload<T extends AppConfigGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AppConfigGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AppConfigGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AppConfigGroupByOutputType[P]>
            : GetScalarType<T[P], AppConfigGroupByOutputType[P]>
        }
      >
    >


  export type AppConfigSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["appConfig"]>

  export type AppConfigSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["appConfig"]>

  export type AppConfigSelectScalar = {
    key?: boolean
    value?: boolean
    updatedAt?: boolean
  }


  export type $AppConfigPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AppConfig"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      key: string
      value: string
      updatedAt: Date
    }, ExtArgs["result"]["appConfig"]>
    composites: {}
  }

  type AppConfigGetPayload<S extends boolean | null | undefined | AppConfigDefaultArgs> = $Result.GetResult<Prisma.$AppConfigPayload, S>

  type AppConfigCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<AppConfigFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: AppConfigCountAggregateInputType | true
    }

  export interface AppConfigDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AppConfig'], meta: { name: 'AppConfig' } }
    /**
     * Find zero or one AppConfig that matches the filter.
     * @param {AppConfigFindUniqueArgs} args - Arguments to find a AppConfig
     * @example
     * // Get one AppConfig
     * const appConfig = await prisma.appConfig.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AppConfigFindUniqueArgs>(args: SelectSubset<T, AppConfigFindUniqueArgs<ExtArgs>>): Prisma__AppConfigClient<$Result.GetResult<Prisma.$AppConfigPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one AppConfig that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {AppConfigFindUniqueOrThrowArgs} args - Arguments to find a AppConfig
     * @example
     * // Get one AppConfig
     * const appConfig = await prisma.appConfig.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AppConfigFindUniqueOrThrowArgs>(args: SelectSubset<T, AppConfigFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AppConfigClient<$Result.GetResult<Prisma.$AppConfigPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first AppConfig that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AppConfigFindFirstArgs} args - Arguments to find a AppConfig
     * @example
     * // Get one AppConfig
     * const appConfig = await prisma.appConfig.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AppConfigFindFirstArgs>(args?: SelectSubset<T, AppConfigFindFirstArgs<ExtArgs>>): Prisma__AppConfigClient<$Result.GetResult<Prisma.$AppConfigPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first AppConfig that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AppConfigFindFirstOrThrowArgs} args - Arguments to find a AppConfig
     * @example
     * // Get one AppConfig
     * const appConfig = await prisma.appConfig.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AppConfigFindFirstOrThrowArgs>(args?: SelectSubset<T, AppConfigFindFirstOrThrowArgs<ExtArgs>>): Prisma__AppConfigClient<$Result.GetResult<Prisma.$AppConfigPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more AppConfigs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AppConfigFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AppConfigs
     * const appConfigs = await prisma.appConfig.findMany()
     * 
     * // Get first 10 AppConfigs
     * const appConfigs = await prisma.appConfig.findMany({ take: 10 })
     * 
     * // Only select the `key`
     * const appConfigWithKeyOnly = await prisma.appConfig.findMany({ select: { key: true } })
     * 
     */
    findMany<T extends AppConfigFindManyArgs>(args?: SelectSubset<T, AppConfigFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AppConfigPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a AppConfig.
     * @param {AppConfigCreateArgs} args - Arguments to create a AppConfig.
     * @example
     * // Create one AppConfig
     * const AppConfig = await prisma.appConfig.create({
     *   data: {
     *     // ... data to create a AppConfig
     *   }
     * })
     * 
     */
    create<T extends AppConfigCreateArgs>(args: SelectSubset<T, AppConfigCreateArgs<ExtArgs>>): Prisma__AppConfigClient<$Result.GetResult<Prisma.$AppConfigPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many AppConfigs.
     * @param {AppConfigCreateManyArgs} args - Arguments to create many AppConfigs.
     * @example
     * // Create many AppConfigs
     * const appConfig = await prisma.appConfig.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AppConfigCreateManyArgs>(args?: SelectSubset<T, AppConfigCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AppConfigs and returns the data saved in the database.
     * @param {AppConfigCreateManyAndReturnArgs} args - Arguments to create many AppConfigs.
     * @example
     * // Create many AppConfigs
     * const appConfig = await prisma.appConfig.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AppConfigs and only return the `key`
     * const appConfigWithKeyOnly = await prisma.appConfig.createManyAndReturn({ 
     *   select: { key: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AppConfigCreateManyAndReturnArgs>(args?: SelectSubset<T, AppConfigCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AppConfigPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a AppConfig.
     * @param {AppConfigDeleteArgs} args - Arguments to delete one AppConfig.
     * @example
     * // Delete one AppConfig
     * const AppConfig = await prisma.appConfig.delete({
     *   where: {
     *     // ... filter to delete one AppConfig
     *   }
     * })
     * 
     */
    delete<T extends AppConfigDeleteArgs>(args: SelectSubset<T, AppConfigDeleteArgs<ExtArgs>>): Prisma__AppConfigClient<$Result.GetResult<Prisma.$AppConfigPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one AppConfig.
     * @param {AppConfigUpdateArgs} args - Arguments to update one AppConfig.
     * @example
     * // Update one AppConfig
     * const appConfig = await prisma.appConfig.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AppConfigUpdateArgs>(args: SelectSubset<T, AppConfigUpdateArgs<ExtArgs>>): Prisma__AppConfigClient<$Result.GetResult<Prisma.$AppConfigPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more AppConfigs.
     * @param {AppConfigDeleteManyArgs} args - Arguments to filter AppConfigs to delete.
     * @example
     * // Delete a few AppConfigs
     * const { count } = await prisma.appConfig.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AppConfigDeleteManyArgs>(args?: SelectSubset<T, AppConfigDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AppConfigs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AppConfigUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AppConfigs
     * const appConfig = await prisma.appConfig.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AppConfigUpdateManyArgs>(args: SelectSubset<T, AppConfigUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one AppConfig.
     * @param {AppConfigUpsertArgs} args - Arguments to update or create a AppConfig.
     * @example
     * // Update or create a AppConfig
     * const appConfig = await prisma.appConfig.upsert({
     *   create: {
     *     // ... data to create a AppConfig
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AppConfig we want to update
     *   }
     * })
     */
    upsert<T extends AppConfigUpsertArgs>(args: SelectSubset<T, AppConfigUpsertArgs<ExtArgs>>): Prisma__AppConfigClient<$Result.GetResult<Prisma.$AppConfigPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of AppConfigs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AppConfigCountArgs} args - Arguments to filter AppConfigs to count.
     * @example
     * // Count the number of AppConfigs
     * const count = await prisma.appConfig.count({
     *   where: {
     *     // ... the filter for the AppConfigs we want to count
     *   }
     * })
    **/
    count<T extends AppConfigCountArgs>(
      args?: Subset<T, AppConfigCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AppConfigCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AppConfig.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AppConfigAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AppConfigAggregateArgs>(args: Subset<T, AppConfigAggregateArgs>): Prisma.PrismaPromise<GetAppConfigAggregateType<T>>

    /**
     * Group by AppConfig.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AppConfigGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AppConfigGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AppConfigGroupByArgs['orderBy'] }
        : { orderBy?: AppConfigGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AppConfigGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAppConfigGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AppConfig model
   */
  readonly fields: AppConfigFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AppConfig.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AppConfigClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AppConfig model
   */ 
  interface AppConfigFieldRefs {
    readonly key: FieldRef<"AppConfig", 'String'>
    readonly value: FieldRef<"AppConfig", 'String'>
    readonly updatedAt: FieldRef<"AppConfig", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AppConfig findUnique
   */
  export type AppConfigFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AppConfig
     */
    select?: AppConfigSelect<ExtArgs> | null
    /**
     * Filter, which AppConfig to fetch.
     */
    where: AppConfigWhereUniqueInput
  }

  /**
   * AppConfig findUniqueOrThrow
   */
  export type AppConfigFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AppConfig
     */
    select?: AppConfigSelect<ExtArgs> | null
    /**
     * Filter, which AppConfig to fetch.
     */
    where: AppConfigWhereUniqueInput
  }

  /**
   * AppConfig findFirst
   */
  export type AppConfigFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AppConfig
     */
    select?: AppConfigSelect<ExtArgs> | null
    /**
     * Filter, which AppConfig to fetch.
     */
    where?: AppConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AppConfigs to fetch.
     */
    orderBy?: AppConfigOrderByWithRelationInput | AppConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AppConfigs.
     */
    cursor?: AppConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AppConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AppConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AppConfigs.
     */
    distinct?: AppConfigScalarFieldEnum | AppConfigScalarFieldEnum[]
  }

  /**
   * AppConfig findFirstOrThrow
   */
  export type AppConfigFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AppConfig
     */
    select?: AppConfigSelect<ExtArgs> | null
    /**
     * Filter, which AppConfig to fetch.
     */
    where?: AppConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AppConfigs to fetch.
     */
    orderBy?: AppConfigOrderByWithRelationInput | AppConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AppConfigs.
     */
    cursor?: AppConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AppConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AppConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AppConfigs.
     */
    distinct?: AppConfigScalarFieldEnum | AppConfigScalarFieldEnum[]
  }

  /**
   * AppConfig findMany
   */
  export type AppConfigFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AppConfig
     */
    select?: AppConfigSelect<ExtArgs> | null
    /**
     * Filter, which AppConfigs to fetch.
     */
    where?: AppConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AppConfigs to fetch.
     */
    orderBy?: AppConfigOrderByWithRelationInput | AppConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AppConfigs.
     */
    cursor?: AppConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AppConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AppConfigs.
     */
    skip?: number
    distinct?: AppConfigScalarFieldEnum | AppConfigScalarFieldEnum[]
  }

  /**
   * AppConfig create
   */
  export type AppConfigCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AppConfig
     */
    select?: AppConfigSelect<ExtArgs> | null
    /**
     * The data needed to create a AppConfig.
     */
    data: XOR<AppConfigCreateInput, AppConfigUncheckedCreateInput>
  }

  /**
   * AppConfig createMany
   */
  export type AppConfigCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AppConfigs.
     */
    data: AppConfigCreateManyInput | AppConfigCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AppConfig createManyAndReturn
   */
  export type AppConfigCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AppConfig
     */
    select?: AppConfigSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many AppConfigs.
     */
    data: AppConfigCreateManyInput | AppConfigCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AppConfig update
   */
  export type AppConfigUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AppConfig
     */
    select?: AppConfigSelect<ExtArgs> | null
    /**
     * The data needed to update a AppConfig.
     */
    data: XOR<AppConfigUpdateInput, AppConfigUncheckedUpdateInput>
    /**
     * Choose, which AppConfig to update.
     */
    where: AppConfigWhereUniqueInput
  }

  /**
   * AppConfig updateMany
   */
  export type AppConfigUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AppConfigs.
     */
    data: XOR<AppConfigUpdateManyMutationInput, AppConfigUncheckedUpdateManyInput>
    /**
     * Filter which AppConfigs to update
     */
    where?: AppConfigWhereInput
  }

  /**
   * AppConfig upsert
   */
  export type AppConfigUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AppConfig
     */
    select?: AppConfigSelect<ExtArgs> | null
    /**
     * The filter to search for the AppConfig to update in case it exists.
     */
    where: AppConfigWhereUniqueInput
    /**
     * In case the AppConfig found by the `where` argument doesn't exist, create a new AppConfig with this data.
     */
    create: XOR<AppConfigCreateInput, AppConfigUncheckedCreateInput>
    /**
     * In case the AppConfig was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AppConfigUpdateInput, AppConfigUncheckedUpdateInput>
  }

  /**
   * AppConfig delete
   */
  export type AppConfigDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AppConfig
     */
    select?: AppConfigSelect<ExtArgs> | null
    /**
     * Filter which AppConfig to delete.
     */
    where: AppConfigWhereUniqueInput
  }

  /**
   * AppConfig deleteMany
   */
  export type AppConfigDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AppConfigs to delete
     */
    where?: AppConfigWhereInput
  }

  /**
   * AppConfig without action
   */
  export type AppConfigDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AppConfig
     */
    select?: AppConfigSelect<ExtArgs> | null
  }


  /**
   * Model SkipRule
   */

  export type AggregateSkipRule = {
    _count: SkipRuleCountAggregateOutputType | null
    _avg: SkipRuleAvgAggregateOutputType | null
    _sum: SkipRuleSumAggregateOutputType | null
    _min: SkipRuleMinAggregateOutputType | null
    _max: SkipRuleMaxAggregateOutputType | null
  }

  export type SkipRuleAvgAggregateOutputType = {
    id: number | null
  }

  export type SkipRuleSumAggregateOutputType = {
    id: number | null
  }

  export type SkipRuleMinAggregateOutputType = {
    id: number | null
    type: $Enums.SkipRuleType | null
    pattern: string | null
    active: boolean | null
    createdAt: Date | null
  }

  export type SkipRuleMaxAggregateOutputType = {
    id: number | null
    type: $Enums.SkipRuleType | null
    pattern: string | null
    active: boolean | null
    createdAt: Date | null
  }

  export type SkipRuleCountAggregateOutputType = {
    id: number
    type: number
    pattern: number
    active: number
    createdAt: number
    _all: number
  }


  export type SkipRuleAvgAggregateInputType = {
    id?: true
  }

  export type SkipRuleSumAggregateInputType = {
    id?: true
  }

  export type SkipRuleMinAggregateInputType = {
    id?: true
    type?: true
    pattern?: true
    active?: true
    createdAt?: true
  }

  export type SkipRuleMaxAggregateInputType = {
    id?: true
    type?: true
    pattern?: true
    active?: true
    createdAt?: true
  }

  export type SkipRuleCountAggregateInputType = {
    id?: true
    type?: true
    pattern?: true
    active?: true
    createdAt?: true
    _all?: true
  }

  export type SkipRuleAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SkipRule to aggregate.
     */
    where?: SkipRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SkipRules to fetch.
     */
    orderBy?: SkipRuleOrderByWithRelationInput | SkipRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SkipRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SkipRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SkipRules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SkipRules
    **/
    _count?: true | SkipRuleCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SkipRuleAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SkipRuleSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SkipRuleMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SkipRuleMaxAggregateInputType
  }

  export type GetSkipRuleAggregateType<T extends SkipRuleAggregateArgs> = {
        [P in keyof T & keyof AggregateSkipRule]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSkipRule[P]>
      : GetScalarType<T[P], AggregateSkipRule[P]>
  }




  export type SkipRuleGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SkipRuleWhereInput
    orderBy?: SkipRuleOrderByWithAggregationInput | SkipRuleOrderByWithAggregationInput[]
    by: SkipRuleScalarFieldEnum[] | SkipRuleScalarFieldEnum
    having?: SkipRuleScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SkipRuleCountAggregateInputType | true
    _avg?: SkipRuleAvgAggregateInputType
    _sum?: SkipRuleSumAggregateInputType
    _min?: SkipRuleMinAggregateInputType
    _max?: SkipRuleMaxAggregateInputType
  }

  export type SkipRuleGroupByOutputType = {
    id: number
    type: $Enums.SkipRuleType
    pattern: string
    active: boolean
    createdAt: Date
    _count: SkipRuleCountAggregateOutputType | null
    _avg: SkipRuleAvgAggregateOutputType | null
    _sum: SkipRuleSumAggregateOutputType | null
    _min: SkipRuleMinAggregateOutputType | null
    _max: SkipRuleMaxAggregateOutputType | null
  }

  type GetSkipRuleGroupByPayload<T extends SkipRuleGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SkipRuleGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SkipRuleGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SkipRuleGroupByOutputType[P]>
            : GetScalarType<T[P], SkipRuleGroupByOutputType[P]>
        }
      >
    >


  export type SkipRuleSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    type?: boolean
    pattern?: boolean
    active?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["skipRule"]>

  export type SkipRuleSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    type?: boolean
    pattern?: boolean
    active?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["skipRule"]>

  export type SkipRuleSelectScalar = {
    id?: boolean
    type?: boolean
    pattern?: boolean
    active?: boolean
    createdAt?: boolean
  }


  export type $SkipRulePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SkipRule"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      type: $Enums.SkipRuleType
      pattern: string
      active: boolean
      createdAt: Date
    }, ExtArgs["result"]["skipRule"]>
    composites: {}
  }

  type SkipRuleGetPayload<S extends boolean | null | undefined | SkipRuleDefaultArgs> = $Result.GetResult<Prisma.$SkipRulePayload, S>

  type SkipRuleCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<SkipRuleFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: SkipRuleCountAggregateInputType | true
    }

  export interface SkipRuleDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SkipRule'], meta: { name: 'SkipRule' } }
    /**
     * Find zero or one SkipRule that matches the filter.
     * @param {SkipRuleFindUniqueArgs} args - Arguments to find a SkipRule
     * @example
     * // Get one SkipRule
     * const skipRule = await prisma.skipRule.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SkipRuleFindUniqueArgs>(args: SelectSubset<T, SkipRuleFindUniqueArgs<ExtArgs>>): Prisma__SkipRuleClient<$Result.GetResult<Prisma.$SkipRulePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one SkipRule that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {SkipRuleFindUniqueOrThrowArgs} args - Arguments to find a SkipRule
     * @example
     * // Get one SkipRule
     * const skipRule = await prisma.skipRule.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SkipRuleFindUniqueOrThrowArgs>(args: SelectSubset<T, SkipRuleFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SkipRuleClient<$Result.GetResult<Prisma.$SkipRulePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first SkipRule that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SkipRuleFindFirstArgs} args - Arguments to find a SkipRule
     * @example
     * // Get one SkipRule
     * const skipRule = await prisma.skipRule.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SkipRuleFindFirstArgs>(args?: SelectSubset<T, SkipRuleFindFirstArgs<ExtArgs>>): Prisma__SkipRuleClient<$Result.GetResult<Prisma.$SkipRulePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first SkipRule that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SkipRuleFindFirstOrThrowArgs} args - Arguments to find a SkipRule
     * @example
     * // Get one SkipRule
     * const skipRule = await prisma.skipRule.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SkipRuleFindFirstOrThrowArgs>(args?: SelectSubset<T, SkipRuleFindFirstOrThrowArgs<ExtArgs>>): Prisma__SkipRuleClient<$Result.GetResult<Prisma.$SkipRulePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more SkipRules that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SkipRuleFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SkipRules
     * const skipRules = await prisma.skipRule.findMany()
     * 
     * // Get first 10 SkipRules
     * const skipRules = await prisma.skipRule.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const skipRuleWithIdOnly = await prisma.skipRule.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SkipRuleFindManyArgs>(args?: SelectSubset<T, SkipRuleFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SkipRulePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a SkipRule.
     * @param {SkipRuleCreateArgs} args - Arguments to create a SkipRule.
     * @example
     * // Create one SkipRule
     * const SkipRule = await prisma.skipRule.create({
     *   data: {
     *     // ... data to create a SkipRule
     *   }
     * })
     * 
     */
    create<T extends SkipRuleCreateArgs>(args: SelectSubset<T, SkipRuleCreateArgs<ExtArgs>>): Prisma__SkipRuleClient<$Result.GetResult<Prisma.$SkipRulePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many SkipRules.
     * @param {SkipRuleCreateManyArgs} args - Arguments to create many SkipRules.
     * @example
     * // Create many SkipRules
     * const skipRule = await prisma.skipRule.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SkipRuleCreateManyArgs>(args?: SelectSubset<T, SkipRuleCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SkipRules and returns the data saved in the database.
     * @param {SkipRuleCreateManyAndReturnArgs} args - Arguments to create many SkipRules.
     * @example
     * // Create many SkipRules
     * const skipRule = await prisma.skipRule.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SkipRules and only return the `id`
     * const skipRuleWithIdOnly = await prisma.skipRule.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SkipRuleCreateManyAndReturnArgs>(args?: SelectSubset<T, SkipRuleCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SkipRulePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a SkipRule.
     * @param {SkipRuleDeleteArgs} args - Arguments to delete one SkipRule.
     * @example
     * // Delete one SkipRule
     * const SkipRule = await prisma.skipRule.delete({
     *   where: {
     *     // ... filter to delete one SkipRule
     *   }
     * })
     * 
     */
    delete<T extends SkipRuleDeleteArgs>(args: SelectSubset<T, SkipRuleDeleteArgs<ExtArgs>>): Prisma__SkipRuleClient<$Result.GetResult<Prisma.$SkipRulePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one SkipRule.
     * @param {SkipRuleUpdateArgs} args - Arguments to update one SkipRule.
     * @example
     * // Update one SkipRule
     * const skipRule = await prisma.skipRule.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SkipRuleUpdateArgs>(args: SelectSubset<T, SkipRuleUpdateArgs<ExtArgs>>): Prisma__SkipRuleClient<$Result.GetResult<Prisma.$SkipRulePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more SkipRules.
     * @param {SkipRuleDeleteManyArgs} args - Arguments to filter SkipRules to delete.
     * @example
     * // Delete a few SkipRules
     * const { count } = await prisma.skipRule.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SkipRuleDeleteManyArgs>(args?: SelectSubset<T, SkipRuleDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SkipRules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SkipRuleUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SkipRules
     * const skipRule = await prisma.skipRule.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SkipRuleUpdateManyArgs>(args: SelectSubset<T, SkipRuleUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one SkipRule.
     * @param {SkipRuleUpsertArgs} args - Arguments to update or create a SkipRule.
     * @example
     * // Update or create a SkipRule
     * const skipRule = await prisma.skipRule.upsert({
     *   create: {
     *     // ... data to create a SkipRule
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SkipRule we want to update
     *   }
     * })
     */
    upsert<T extends SkipRuleUpsertArgs>(args: SelectSubset<T, SkipRuleUpsertArgs<ExtArgs>>): Prisma__SkipRuleClient<$Result.GetResult<Prisma.$SkipRulePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of SkipRules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SkipRuleCountArgs} args - Arguments to filter SkipRules to count.
     * @example
     * // Count the number of SkipRules
     * const count = await prisma.skipRule.count({
     *   where: {
     *     // ... the filter for the SkipRules we want to count
     *   }
     * })
    **/
    count<T extends SkipRuleCountArgs>(
      args?: Subset<T, SkipRuleCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SkipRuleCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SkipRule.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SkipRuleAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SkipRuleAggregateArgs>(args: Subset<T, SkipRuleAggregateArgs>): Prisma.PrismaPromise<GetSkipRuleAggregateType<T>>

    /**
     * Group by SkipRule.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SkipRuleGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SkipRuleGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SkipRuleGroupByArgs['orderBy'] }
        : { orderBy?: SkipRuleGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SkipRuleGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSkipRuleGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SkipRule model
   */
  readonly fields: SkipRuleFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SkipRule.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SkipRuleClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SkipRule model
   */ 
  interface SkipRuleFieldRefs {
    readonly id: FieldRef<"SkipRule", 'Int'>
    readonly type: FieldRef<"SkipRule", 'SkipRuleType'>
    readonly pattern: FieldRef<"SkipRule", 'String'>
    readonly active: FieldRef<"SkipRule", 'Boolean'>
    readonly createdAt: FieldRef<"SkipRule", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * SkipRule findUnique
   */
  export type SkipRuleFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkipRule
     */
    select?: SkipRuleSelect<ExtArgs> | null
    /**
     * Filter, which SkipRule to fetch.
     */
    where: SkipRuleWhereUniqueInput
  }

  /**
   * SkipRule findUniqueOrThrow
   */
  export type SkipRuleFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkipRule
     */
    select?: SkipRuleSelect<ExtArgs> | null
    /**
     * Filter, which SkipRule to fetch.
     */
    where: SkipRuleWhereUniqueInput
  }

  /**
   * SkipRule findFirst
   */
  export type SkipRuleFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkipRule
     */
    select?: SkipRuleSelect<ExtArgs> | null
    /**
     * Filter, which SkipRule to fetch.
     */
    where?: SkipRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SkipRules to fetch.
     */
    orderBy?: SkipRuleOrderByWithRelationInput | SkipRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SkipRules.
     */
    cursor?: SkipRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SkipRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SkipRules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SkipRules.
     */
    distinct?: SkipRuleScalarFieldEnum | SkipRuleScalarFieldEnum[]
  }

  /**
   * SkipRule findFirstOrThrow
   */
  export type SkipRuleFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkipRule
     */
    select?: SkipRuleSelect<ExtArgs> | null
    /**
     * Filter, which SkipRule to fetch.
     */
    where?: SkipRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SkipRules to fetch.
     */
    orderBy?: SkipRuleOrderByWithRelationInput | SkipRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SkipRules.
     */
    cursor?: SkipRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SkipRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SkipRules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SkipRules.
     */
    distinct?: SkipRuleScalarFieldEnum | SkipRuleScalarFieldEnum[]
  }

  /**
   * SkipRule findMany
   */
  export type SkipRuleFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkipRule
     */
    select?: SkipRuleSelect<ExtArgs> | null
    /**
     * Filter, which SkipRules to fetch.
     */
    where?: SkipRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SkipRules to fetch.
     */
    orderBy?: SkipRuleOrderByWithRelationInput | SkipRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SkipRules.
     */
    cursor?: SkipRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SkipRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SkipRules.
     */
    skip?: number
    distinct?: SkipRuleScalarFieldEnum | SkipRuleScalarFieldEnum[]
  }

  /**
   * SkipRule create
   */
  export type SkipRuleCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkipRule
     */
    select?: SkipRuleSelect<ExtArgs> | null
    /**
     * The data needed to create a SkipRule.
     */
    data: XOR<SkipRuleCreateInput, SkipRuleUncheckedCreateInput>
  }

  /**
   * SkipRule createMany
   */
  export type SkipRuleCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SkipRules.
     */
    data: SkipRuleCreateManyInput | SkipRuleCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SkipRule createManyAndReturn
   */
  export type SkipRuleCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkipRule
     */
    select?: SkipRuleSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many SkipRules.
     */
    data: SkipRuleCreateManyInput | SkipRuleCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SkipRule update
   */
  export type SkipRuleUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkipRule
     */
    select?: SkipRuleSelect<ExtArgs> | null
    /**
     * The data needed to update a SkipRule.
     */
    data: XOR<SkipRuleUpdateInput, SkipRuleUncheckedUpdateInput>
    /**
     * Choose, which SkipRule to update.
     */
    where: SkipRuleWhereUniqueInput
  }

  /**
   * SkipRule updateMany
   */
  export type SkipRuleUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SkipRules.
     */
    data: XOR<SkipRuleUpdateManyMutationInput, SkipRuleUncheckedUpdateManyInput>
    /**
     * Filter which SkipRules to update
     */
    where?: SkipRuleWhereInput
  }

  /**
   * SkipRule upsert
   */
  export type SkipRuleUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkipRule
     */
    select?: SkipRuleSelect<ExtArgs> | null
    /**
     * The filter to search for the SkipRule to update in case it exists.
     */
    where: SkipRuleWhereUniqueInput
    /**
     * In case the SkipRule found by the `where` argument doesn't exist, create a new SkipRule with this data.
     */
    create: XOR<SkipRuleCreateInput, SkipRuleUncheckedCreateInput>
    /**
     * In case the SkipRule was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SkipRuleUpdateInput, SkipRuleUncheckedUpdateInput>
  }

  /**
   * SkipRule delete
   */
  export type SkipRuleDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkipRule
     */
    select?: SkipRuleSelect<ExtArgs> | null
    /**
     * Filter which SkipRule to delete.
     */
    where: SkipRuleWhereUniqueInput
  }

  /**
   * SkipRule deleteMany
   */
  export type SkipRuleDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SkipRules to delete
     */
    where?: SkipRuleWhereInput
  }

  /**
   * SkipRule without action
   */
  export type SkipRuleDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SkipRule
     */
    select?: SkipRuleSelect<ExtArgs> | null
  }


  /**
   * Model ScanLog
   */

  export type AggregateScanLog = {
    _count: ScanLogCountAggregateOutputType | null
    _avg: ScanLogAvgAggregateOutputType | null
    _sum: ScanLogSumAggregateOutputType | null
    _min: ScanLogMinAggregateOutputType | null
    _max: ScanLogMaxAggregateOutputType | null
  }

  export type ScanLogAvgAggregateOutputType = {
    id: number | null
    jobsFound: number | null
    jobsSaved: number | null
    durationMs: number | null
  }

  export type ScanLogSumAggregateOutputType = {
    id: number | null
    jobsFound: number | null
    jobsSaved: number | null
    durationMs: number | null
  }

  export type ScanLogMinAggregateOutputType = {
    id: number | null
    board: string | null
    jobsFound: number | null
    jobsSaved: number | null
    errors: string | null
    durationMs: number | null
    createdAt: Date | null
  }

  export type ScanLogMaxAggregateOutputType = {
    id: number | null
    board: string | null
    jobsFound: number | null
    jobsSaved: number | null
    errors: string | null
    durationMs: number | null
    createdAt: Date | null
  }

  export type ScanLogCountAggregateOutputType = {
    id: number
    board: number
    jobsFound: number
    jobsSaved: number
    errors: number
    durationMs: number
    createdAt: number
    _all: number
  }


  export type ScanLogAvgAggregateInputType = {
    id?: true
    jobsFound?: true
    jobsSaved?: true
    durationMs?: true
  }

  export type ScanLogSumAggregateInputType = {
    id?: true
    jobsFound?: true
    jobsSaved?: true
    durationMs?: true
  }

  export type ScanLogMinAggregateInputType = {
    id?: true
    board?: true
    jobsFound?: true
    jobsSaved?: true
    errors?: true
    durationMs?: true
    createdAt?: true
  }

  export type ScanLogMaxAggregateInputType = {
    id?: true
    board?: true
    jobsFound?: true
    jobsSaved?: true
    errors?: true
    durationMs?: true
    createdAt?: true
  }

  export type ScanLogCountAggregateInputType = {
    id?: true
    board?: true
    jobsFound?: true
    jobsSaved?: true
    errors?: true
    durationMs?: true
    createdAt?: true
    _all?: true
  }

  export type ScanLogAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ScanLog to aggregate.
     */
    where?: ScanLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanLogs to fetch.
     */
    orderBy?: ScanLogOrderByWithRelationInput | ScanLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ScanLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ScanLogs
    **/
    _count?: true | ScanLogCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ScanLogAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ScanLogSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ScanLogMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ScanLogMaxAggregateInputType
  }

  export type GetScanLogAggregateType<T extends ScanLogAggregateArgs> = {
        [P in keyof T & keyof AggregateScanLog]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateScanLog[P]>
      : GetScalarType<T[P], AggregateScanLog[P]>
  }




  export type ScanLogGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ScanLogWhereInput
    orderBy?: ScanLogOrderByWithAggregationInput | ScanLogOrderByWithAggregationInput[]
    by: ScanLogScalarFieldEnum[] | ScanLogScalarFieldEnum
    having?: ScanLogScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ScanLogCountAggregateInputType | true
    _avg?: ScanLogAvgAggregateInputType
    _sum?: ScanLogSumAggregateInputType
    _min?: ScanLogMinAggregateInputType
    _max?: ScanLogMaxAggregateInputType
  }

  export type ScanLogGroupByOutputType = {
    id: number
    board: string
    jobsFound: number
    jobsSaved: number
    errors: string | null
    durationMs: number | null
    createdAt: Date
    _count: ScanLogCountAggregateOutputType | null
    _avg: ScanLogAvgAggregateOutputType | null
    _sum: ScanLogSumAggregateOutputType | null
    _min: ScanLogMinAggregateOutputType | null
    _max: ScanLogMaxAggregateOutputType | null
  }

  type GetScanLogGroupByPayload<T extends ScanLogGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ScanLogGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ScanLogGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ScanLogGroupByOutputType[P]>
            : GetScalarType<T[P], ScanLogGroupByOutputType[P]>
        }
      >
    >


  export type ScanLogSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    board?: boolean
    jobsFound?: boolean
    jobsSaved?: boolean
    errors?: boolean
    durationMs?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["scanLog"]>

  export type ScanLogSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    board?: boolean
    jobsFound?: boolean
    jobsSaved?: boolean
    errors?: boolean
    durationMs?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["scanLog"]>

  export type ScanLogSelectScalar = {
    id?: boolean
    board?: boolean
    jobsFound?: boolean
    jobsSaved?: boolean
    errors?: boolean
    durationMs?: boolean
    createdAt?: boolean
  }


  export type $ScanLogPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ScanLog"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      board: string
      jobsFound: number
      jobsSaved: number
      errors: string | null
      durationMs: number | null
      createdAt: Date
    }, ExtArgs["result"]["scanLog"]>
    composites: {}
  }

  type ScanLogGetPayload<S extends boolean | null | undefined | ScanLogDefaultArgs> = $Result.GetResult<Prisma.$ScanLogPayload, S>

  type ScanLogCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ScanLogFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ScanLogCountAggregateInputType | true
    }

  export interface ScanLogDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ScanLog'], meta: { name: 'ScanLog' } }
    /**
     * Find zero or one ScanLog that matches the filter.
     * @param {ScanLogFindUniqueArgs} args - Arguments to find a ScanLog
     * @example
     * // Get one ScanLog
     * const scanLog = await prisma.scanLog.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ScanLogFindUniqueArgs>(args: SelectSubset<T, ScanLogFindUniqueArgs<ExtArgs>>): Prisma__ScanLogClient<$Result.GetResult<Prisma.$ScanLogPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ScanLog that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ScanLogFindUniqueOrThrowArgs} args - Arguments to find a ScanLog
     * @example
     * // Get one ScanLog
     * const scanLog = await prisma.scanLog.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ScanLogFindUniqueOrThrowArgs>(args: SelectSubset<T, ScanLogFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ScanLogClient<$Result.GetResult<Prisma.$ScanLogPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ScanLog that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanLogFindFirstArgs} args - Arguments to find a ScanLog
     * @example
     * // Get one ScanLog
     * const scanLog = await prisma.scanLog.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ScanLogFindFirstArgs>(args?: SelectSubset<T, ScanLogFindFirstArgs<ExtArgs>>): Prisma__ScanLogClient<$Result.GetResult<Prisma.$ScanLogPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ScanLog that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanLogFindFirstOrThrowArgs} args - Arguments to find a ScanLog
     * @example
     * // Get one ScanLog
     * const scanLog = await prisma.scanLog.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ScanLogFindFirstOrThrowArgs>(args?: SelectSubset<T, ScanLogFindFirstOrThrowArgs<ExtArgs>>): Prisma__ScanLogClient<$Result.GetResult<Prisma.$ScanLogPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ScanLogs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanLogFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ScanLogs
     * const scanLogs = await prisma.scanLog.findMany()
     * 
     * // Get first 10 ScanLogs
     * const scanLogs = await prisma.scanLog.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const scanLogWithIdOnly = await prisma.scanLog.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ScanLogFindManyArgs>(args?: SelectSubset<T, ScanLogFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanLogPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ScanLog.
     * @param {ScanLogCreateArgs} args - Arguments to create a ScanLog.
     * @example
     * // Create one ScanLog
     * const ScanLog = await prisma.scanLog.create({
     *   data: {
     *     // ... data to create a ScanLog
     *   }
     * })
     * 
     */
    create<T extends ScanLogCreateArgs>(args: SelectSubset<T, ScanLogCreateArgs<ExtArgs>>): Prisma__ScanLogClient<$Result.GetResult<Prisma.$ScanLogPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ScanLogs.
     * @param {ScanLogCreateManyArgs} args - Arguments to create many ScanLogs.
     * @example
     * // Create many ScanLogs
     * const scanLog = await prisma.scanLog.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ScanLogCreateManyArgs>(args?: SelectSubset<T, ScanLogCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ScanLogs and returns the data saved in the database.
     * @param {ScanLogCreateManyAndReturnArgs} args - Arguments to create many ScanLogs.
     * @example
     * // Create many ScanLogs
     * const scanLog = await prisma.scanLog.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ScanLogs and only return the `id`
     * const scanLogWithIdOnly = await prisma.scanLog.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ScanLogCreateManyAndReturnArgs>(args?: SelectSubset<T, ScanLogCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScanLogPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ScanLog.
     * @param {ScanLogDeleteArgs} args - Arguments to delete one ScanLog.
     * @example
     * // Delete one ScanLog
     * const ScanLog = await prisma.scanLog.delete({
     *   where: {
     *     // ... filter to delete one ScanLog
     *   }
     * })
     * 
     */
    delete<T extends ScanLogDeleteArgs>(args: SelectSubset<T, ScanLogDeleteArgs<ExtArgs>>): Prisma__ScanLogClient<$Result.GetResult<Prisma.$ScanLogPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ScanLog.
     * @param {ScanLogUpdateArgs} args - Arguments to update one ScanLog.
     * @example
     * // Update one ScanLog
     * const scanLog = await prisma.scanLog.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ScanLogUpdateArgs>(args: SelectSubset<T, ScanLogUpdateArgs<ExtArgs>>): Prisma__ScanLogClient<$Result.GetResult<Prisma.$ScanLogPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ScanLogs.
     * @param {ScanLogDeleteManyArgs} args - Arguments to filter ScanLogs to delete.
     * @example
     * // Delete a few ScanLogs
     * const { count } = await prisma.scanLog.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ScanLogDeleteManyArgs>(args?: SelectSubset<T, ScanLogDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ScanLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanLogUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ScanLogs
     * const scanLog = await prisma.scanLog.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ScanLogUpdateManyArgs>(args: SelectSubset<T, ScanLogUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ScanLog.
     * @param {ScanLogUpsertArgs} args - Arguments to update or create a ScanLog.
     * @example
     * // Update or create a ScanLog
     * const scanLog = await prisma.scanLog.upsert({
     *   create: {
     *     // ... data to create a ScanLog
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ScanLog we want to update
     *   }
     * })
     */
    upsert<T extends ScanLogUpsertArgs>(args: SelectSubset<T, ScanLogUpsertArgs<ExtArgs>>): Prisma__ScanLogClient<$Result.GetResult<Prisma.$ScanLogPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ScanLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanLogCountArgs} args - Arguments to filter ScanLogs to count.
     * @example
     * // Count the number of ScanLogs
     * const count = await prisma.scanLog.count({
     *   where: {
     *     // ... the filter for the ScanLogs we want to count
     *   }
     * })
    **/
    count<T extends ScanLogCountArgs>(
      args?: Subset<T, ScanLogCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ScanLogCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ScanLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanLogAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ScanLogAggregateArgs>(args: Subset<T, ScanLogAggregateArgs>): Prisma.PrismaPromise<GetScanLogAggregateType<T>>

    /**
     * Group by ScanLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScanLogGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ScanLogGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ScanLogGroupByArgs['orderBy'] }
        : { orderBy?: ScanLogGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ScanLogGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetScanLogGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ScanLog model
   */
  readonly fields: ScanLogFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ScanLog.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ScanLogClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ScanLog model
   */ 
  interface ScanLogFieldRefs {
    readonly id: FieldRef<"ScanLog", 'Int'>
    readonly board: FieldRef<"ScanLog", 'String'>
    readonly jobsFound: FieldRef<"ScanLog", 'Int'>
    readonly jobsSaved: FieldRef<"ScanLog", 'Int'>
    readonly errors: FieldRef<"ScanLog", 'String'>
    readonly durationMs: FieldRef<"ScanLog", 'Int'>
    readonly createdAt: FieldRef<"ScanLog", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ScanLog findUnique
   */
  export type ScanLogFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanLog
     */
    select?: ScanLogSelect<ExtArgs> | null
    /**
     * Filter, which ScanLog to fetch.
     */
    where: ScanLogWhereUniqueInput
  }

  /**
   * ScanLog findUniqueOrThrow
   */
  export type ScanLogFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanLog
     */
    select?: ScanLogSelect<ExtArgs> | null
    /**
     * Filter, which ScanLog to fetch.
     */
    where: ScanLogWhereUniqueInput
  }

  /**
   * ScanLog findFirst
   */
  export type ScanLogFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanLog
     */
    select?: ScanLogSelect<ExtArgs> | null
    /**
     * Filter, which ScanLog to fetch.
     */
    where?: ScanLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanLogs to fetch.
     */
    orderBy?: ScanLogOrderByWithRelationInput | ScanLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ScanLogs.
     */
    cursor?: ScanLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ScanLogs.
     */
    distinct?: ScanLogScalarFieldEnum | ScanLogScalarFieldEnum[]
  }

  /**
   * ScanLog findFirstOrThrow
   */
  export type ScanLogFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanLog
     */
    select?: ScanLogSelect<ExtArgs> | null
    /**
     * Filter, which ScanLog to fetch.
     */
    where?: ScanLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanLogs to fetch.
     */
    orderBy?: ScanLogOrderByWithRelationInput | ScanLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ScanLogs.
     */
    cursor?: ScanLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ScanLogs.
     */
    distinct?: ScanLogScalarFieldEnum | ScanLogScalarFieldEnum[]
  }

  /**
   * ScanLog findMany
   */
  export type ScanLogFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanLog
     */
    select?: ScanLogSelect<ExtArgs> | null
    /**
     * Filter, which ScanLogs to fetch.
     */
    where?: ScanLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScanLogs to fetch.
     */
    orderBy?: ScanLogOrderByWithRelationInput | ScanLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ScanLogs.
     */
    cursor?: ScanLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScanLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScanLogs.
     */
    skip?: number
    distinct?: ScanLogScalarFieldEnum | ScanLogScalarFieldEnum[]
  }

  /**
   * ScanLog create
   */
  export type ScanLogCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanLog
     */
    select?: ScanLogSelect<ExtArgs> | null
    /**
     * The data needed to create a ScanLog.
     */
    data: XOR<ScanLogCreateInput, ScanLogUncheckedCreateInput>
  }

  /**
   * ScanLog createMany
   */
  export type ScanLogCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ScanLogs.
     */
    data: ScanLogCreateManyInput | ScanLogCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ScanLog createManyAndReturn
   */
  export type ScanLogCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanLog
     */
    select?: ScanLogSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ScanLogs.
     */
    data: ScanLogCreateManyInput | ScanLogCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ScanLog update
   */
  export type ScanLogUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanLog
     */
    select?: ScanLogSelect<ExtArgs> | null
    /**
     * The data needed to update a ScanLog.
     */
    data: XOR<ScanLogUpdateInput, ScanLogUncheckedUpdateInput>
    /**
     * Choose, which ScanLog to update.
     */
    where: ScanLogWhereUniqueInput
  }

  /**
   * ScanLog updateMany
   */
  export type ScanLogUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ScanLogs.
     */
    data: XOR<ScanLogUpdateManyMutationInput, ScanLogUncheckedUpdateManyInput>
    /**
     * Filter which ScanLogs to update
     */
    where?: ScanLogWhereInput
  }

  /**
   * ScanLog upsert
   */
  export type ScanLogUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanLog
     */
    select?: ScanLogSelect<ExtArgs> | null
    /**
     * The filter to search for the ScanLog to update in case it exists.
     */
    where: ScanLogWhereUniqueInput
    /**
     * In case the ScanLog found by the `where` argument doesn't exist, create a new ScanLog with this data.
     */
    create: XOR<ScanLogCreateInput, ScanLogUncheckedCreateInput>
    /**
     * In case the ScanLog was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ScanLogUpdateInput, ScanLogUncheckedUpdateInput>
  }

  /**
   * ScanLog delete
   */
  export type ScanLogDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanLog
     */
    select?: ScanLogSelect<ExtArgs> | null
    /**
     * Filter which ScanLog to delete.
     */
    where: ScanLogWhereUniqueInput
  }

  /**
   * ScanLog deleteMany
   */
  export type ScanLogDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ScanLogs to delete
     */
    where?: ScanLogWhereInput
  }

  /**
   * ScanLog without action
   */
  export type ScanLogDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScanLog
     */
    select?: ScanLogSelect<ExtArgs> | null
  }


  /**
   * Model AnalysisLog
   */

  export type AggregateAnalysisLog = {
    _count: AnalysisLogCountAggregateOutputType | null
    _avg: AnalysisLogAvgAggregateOutputType | null
    _sum: AnalysisLogSumAggregateOutputType | null
    _min: AnalysisLogMinAggregateOutputType | null
    _max: AnalysisLogMaxAggregateOutputType | null
  }

  export type AnalysisLogAvgAggregateOutputType = {
    id: number | null
    scrapedJobId: number | null
    score: number | null
    tokensUsed: number | null
    durationMs: number | null
  }

  export type AnalysisLogSumAggregateOutputType = {
    id: number | null
    scrapedJobId: number | null
    score: number | null
    tokensUsed: number | null
    durationMs: number | null
  }

  export type AnalysisLogMinAggregateOutputType = {
    id: number | null
    scrapedJobId: number | null
    model: string | null
    approved: boolean | null
    score: number | null
    reason: string | null
    tokensUsed: number | null
    durationMs: number | null
    createdAt: Date | null
  }

  export type AnalysisLogMaxAggregateOutputType = {
    id: number | null
    scrapedJobId: number | null
    model: string | null
    approved: boolean | null
    score: number | null
    reason: string | null
    tokensUsed: number | null
    durationMs: number | null
    createdAt: Date | null
  }

  export type AnalysisLogCountAggregateOutputType = {
    id: number
    scrapedJobId: number
    model: number
    approved: number
    score: number
    reason: number
    tokensUsed: number
    durationMs: number
    createdAt: number
    _all: number
  }


  export type AnalysisLogAvgAggregateInputType = {
    id?: true
    scrapedJobId?: true
    score?: true
    tokensUsed?: true
    durationMs?: true
  }

  export type AnalysisLogSumAggregateInputType = {
    id?: true
    scrapedJobId?: true
    score?: true
    tokensUsed?: true
    durationMs?: true
  }

  export type AnalysisLogMinAggregateInputType = {
    id?: true
    scrapedJobId?: true
    model?: true
    approved?: true
    score?: true
    reason?: true
    tokensUsed?: true
    durationMs?: true
    createdAt?: true
  }

  export type AnalysisLogMaxAggregateInputType = {
    id?: true
    scrapedJobId?: true
    model?: true
    approved?: true
    score?: true
    reason?: true
    tokensUsed?: true
    durationMs?: true
    createdAt?: true
  }

  export type AnalysisLogCountAggregateInputType = {
    id?: true
    scrapedJobId?: true
    model?: true
    approved?: true
    score?: true
    reason?: true
    tokensUsed?: true
    durationMs?: true
    createdAt?: true
    _all?: true
  }

  export type AnalysisLogAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AnalysisLog to aggregate.
     */
    where?: AnalysisLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AnalysisLogs to fetch.
     */
    orderBy?: AnalysisLogOrderByWithRelationInput | AnalysisLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AnalysisLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AnalysisLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AnalysisLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AnalysisLogs
    **/
    _count?: true | AnalysisLogCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AnalysisLogAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AnalysisLogSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AnalysisLogMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AnalysisLogMaxAggregateInputType
  }

  export type GetAnalysisLogAggregateType<T extends AnalysisLogAggregateArgs> = {
        [P in keyof T & keyof AggregateAnalysisLog]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAnalysisLog[P]>
      : GetScalarType<T[P], AggregateAnalysisLog[P]>
  }




  export type AnalysisLogGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AnalysisLogWhereInput
    orderBy?: AnalysisLogOrderByWithAggregationInput | AnalysisLogOrderByWithAggregationInput[]
    by: AnalysisLogScalarFieldEnum[] | AnalysisLogScalarFieldEnum
    having?: AnalysisLogScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AnalysisLogCountAggregateInputType | true
    _avg?: AnalysisLogAvgAggregateInputType
    _sum?: AnalysisLogSumAggregateInputType
    _min?: AnalysisLogMinAggregateInputType
    _max?: AnalysisLogMaxAggregateInputType
  }

  export type AnalysisLogGroupByOutputType = {
    id: number
    scrapedJobId: number
    model: string
    approved: boolean
    score: number | null
    reason: string | null
    tokensUsed: number | null
    durationMs: number | null
    createdAt: Date
    _count: AnalysisLogCountAggregateOutputType | null
    _avg: AnalysisLogAvgAggregateOutputType | null
    _sum: AnalysisLogSumAggregateOutputType | null
    _min: AnalysisLogMinAggregateOutputType | null
    _max: AnalysisLogMaxAggregateOutputType | null
  }

  type GetAnalysisLogGroupByPayload<T extends AnalysisLogGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AnalysisLogGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AnalysisLogGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AnalysisLogGroupByOutputType[P]>
            : GetScalarType<T[P], AnalysisLogGroupByOutputType[P]>
        }
      >
    >


  export type AnalysisLogSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    scrapedJobId?: boolean
    model?: boolean
    approved?: boolean
    score?: boolean
    reason?: boolean
    tokensUsed?: boolean
    durationMs?: boolean
    createdAt?: boolean
    scrapedJob?: boolean | ScrapedJobDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["analysisLog"]>

  export type AnalysisLogSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    scrapedJobId?: boolean
    model?: boolean
    approved?: boolean
    score?: boolean
    reason?: boolean
    tokensUsed?: boolean
    durationMs?: boolean
    createdAt?: boolean
    scrapedJob?: boolean | ScrapedJobDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["analysisLog"]>

  export type AnalysisLogSelectScalar = {
    id?: boolean
    scrapedJobId?: boolean
    model?: boolean
    approved?: boolean
    score?: boolean
    reason?: boolean
    tokensUsed?: boolean
    durationMs?: boolean
    createdAt?: boolean
  }

  export type AnalysisLogInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    scrapedJob?: boolean | ScrapedJobDefaultArgs<ExtArgs>
  }
  export type AnalysisLogIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    scrapedJob?: boolean | ScrapedJobDefaultArgs<ExtArgs>
  }

  export type $AnalysisLogPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AnalysisLog"
    objects: {
      scrapedJob: Prisma.$ScrapedJobPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      scrapedJobId: number
      model: string
      approved: boolean
      score: number | null
      reason: string | null
      tokensUsed: number | null
      durationMs: number | null
      createdAt: Date
    }, ExtArgs["result"]["analysisLog"]>
    composites: {}
  }

  type AnalysisLogGetPayload<S extends boolean | null | undefined | AnalysisLogDefaultArgs> = $Result.GetResult<Prisma.$AnalysisLogPayload, S>

  type AnalysisLogCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<AnalysisLogFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: AnalysisLogCountAggregateInputType | true
    }

  export interface AnalysisLogDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AnalysisLog'], meta: { name: 'AnalysisLog' } }
    /**
     * Find zero or one AnalysisLog that matches the filter.
     * @param {AnalysisLogFindUniqueArgs} args - Arguments to find a AnalysisLog
     * @example
     * // Get one AnalysisLog
     * const analysisLog = await prisma.analysisLog.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AnalysisLogFindUniqueArgs>(args: SelectSubset<T, AnalysisLogFindUniqueArgs<ExtArgs>>): Prisma__AnalysisLogClient<$Result.GetResult<Prisma.$AnalysisLogPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one AnalysisLog that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {AnalysisLogFindUniqueOrThrowArgs} args - Arguments to find a AnalysisLog
     * @example
     * // Get one AnalysisLog
     * const analysisLog = await prisma.analysisLog.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AnalysisLogFindUniqueOrThrowArgs>(args: SelectSubset<T, AnalysisLogFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AnalysisLogClient<$Result.GetResult<Prisma.$AnalysisLogPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first AnalysisLog that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalysisLogFindFirstArgs} args - Arguments to find a AnalysisLog
     * @example
     * // Get one AnalysisLog
     * const analysisLog = await prisma.analysisLog.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AnalysisLogFindFirstArgs>(args?: SelectSubset<T, AnalysisLogFindFirstArgs<ExtArgs>>): Prisma__AnalysisLogClient<$Result.GetResult<Prisma.$AnalysisLogPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first AnalysisLog that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalysisLogFindFirstOrThrowArgs} args - Arguments to find a AnalysisLog
     * @example
     * // Get one AnalysisLog
     * const analysisLog = await prisma.analysisLog.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AnalysisLogFindFirstOrThrowArgs>(args?: SelectSubset<T, AnalysisLogFindFirstOrThrowArgs<ExtArgs>>): Prisma__AnalysisLogClient<$Result.GetResult<Prisma.$AnalysisLogPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more AnalysisLogs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalysisLogFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AnalysisLogs
     * const analysisLogs = await prisma.analysisLog.findMany()
     * 
     * // Get first 10 AnalysisLogs
     * const analysisLogs = await prisma.analysisLog.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const analysisLogWithIdOnly = await prisma.analysisLog.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AnalysisLogFindManyArgs>(args?: SelectSubset<T, AnalysisLogFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AnalysisLogPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a AnalysisLog.
     * @param {AnalysisLogCreateArgs} args - Arguments to create a AnalysisLog.
     * @example
     * // Create one AnalysisLog
     * const AnalysisLog = await prisma.analysisLog.create({
     *   data: {
     *     // ... data to create a AnalysisLog
     *   }
     * })
     * 
     */
    create<T extends AnalysisLogCreateArgs>(args: SelectSubset<T, AnalysisLogCreateArgs<ExtArgs>>): Prisma__AnalysisLogClient<$Result.GetResult<Prisma.$AnalysisLogPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many AnalysisLogs.
     * @param {AnalysisLogCreateManyArgs} args - Arguments to create many AnalysisLogs.
     * @example
     * // Create many AnalysisLogs
     * const analysisLog = await prisma.analysisLog.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AnalysisLogCreateManyArgs>(args?: SelectSubset<T, AnalysisLogCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AnalysisLogs and returns the data saved in the database.
     * @param {AnalysisLogCreateManyAndReturnArgs} args - Arguments to create many AnalysisLogs.
     * @example
     * // Create many AnalysisLogs
     * const analysisLog = await prisma.analysisLog.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AnalysisLogs and only return the `id`
     * const analysisLogWithIdOnly = await prisma.analysisLog.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AnalysisLogCreateManyAndReturnArgs>(args?: SelectSubset<T, AnalysisLogCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AnalysisLogPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a AnalysisLog.
     * @param {AnalysisLogDeleteArgs} args - Arguments to delete one AnalysisLog.
     * @example
     * // Delete one AnalysisLog
     * const AnalysisLog = await prisma.analysisLog.delete({
     *   where: {
     *     // ... filter to delete one AnalysisLog
     *   }
     * })
     * 
     */
    delete<T extends AnalysisLogDeleteArgs>(args: SelectSubset<T, AnalysisLogDeleteArgs<ExtArgs>>): Prisma__AnalysisLogClient<$Result.GetResult<Prisma.$AnalysisLogPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one AnalysisLog.
     * @param {AnalysisLogUpdateArgs} args - Arguments to update one AnalysisLog.
     * @example
     * // Update one AnalysisLog
     * const analysisLog = await prisma.analysisLog.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AnalysisLogUpdateArgs>(args: SelectSubset<T, AnalysisLogUpdateArgs<ExtArgs>>): Prisma__AnalysisLogClient<$Result.GetResult<Prisma.$AnalysisLogPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more AnalysisLogs.
     * @param {AnalysisLogDeleteManyArgs} args - Arguments to filter AnalysisLogs to delete.
     * @example
     * // Delete a few AnalysisLogs
     * const { count } = await prisma.analysisLog.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AnalysisLogDeleteManyArgs>(args?: SelectSubset<T, AnalysisLogDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AnalysisLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalysisLogUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AnalysisLogs
     * const analysisLog = await prisma.analysisLog.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AnalysisLogUpdateManyArgs>(args: SelectSubset<T, AnalysisLogUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one AnalysisLog.
     * @param {AnalysisLogUpsertArgs} args - Arguments to update or create a AnalysisLog.
     * @example
     * // Update or create a AnalysisLog
     * const analysisLog = await prisma.analysisLog.upsert({
     *   create: {
     *     // ... data to create a AnalysisLog
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AnalysisLog we want to update
     *   }
     * })
     */
    upsert<T extends AnalysisLogUpsertArgs>(args: SelectSubset<T, AnalysisLogUpsertArgs<ExtArgs>>): Prisma__AnalysisLogClient<$Result.GetResult<Prisma.$AnalysisLogPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of AnalysisLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalysisLogCountArgs} args - Arguments to filter AnalysisLogs to count.
     * @example
     * // Count the number of AnalysisLogs
     * const count = await prisma.analysisLog.count({
     *   where: {
     *     // ... the filter for the AnalysisLogs we want to count
     *   }
     * })
    **/
    count<T extends AnalysisLogCountArgs>(
      args?: Subset<T, AnalysisLogCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AnalysisLogCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AnalysisLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalysisLogAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AnalysisLogAggregateArgs>(args: Subset<T, AnalysisLogAggregateArgs>): Prisma.PrismaPromise<GetAnalysisLogAggregateType<T>>

    /**
     * Group by AnalysisLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalysisLogGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AnalysisLogGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AnalysisLogGroupByArgs['orderBy'] }
        : { orderBy?: AnalysisLogGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AnalysisLogGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAnalysisLogGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AnalysisLog model
   */
  readonly fields: AnalysisLogFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AnalysisLog.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AnalysisLogClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    scrapedJob<T extends ScrapedJobDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ScrapedJobDefaultArgs<ExtArgs>>): Prisma__ScrapedJobClient<$Result.GetResult<Prisma.$ScrapedJobPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AnalysisLog model
   */ 
  interface AnalysisLogFieldRefs {
    readonly id: FieldRef<"AnalysisLog", 'Int'>
    readonly scrapedJobId: FieldRef<"AnalysisLog", 'Int'>
    readonly model: FieldRef<"AnalysisLog", 'String'>
    readonly approved: FieldRef<"AnalysisLog", 'Boolean'>
    readonly score: FieldRef<"AnalysisLog", 'Int'>
    readonly reason: FieldRef<"AnalysisLog", 'String'>
    readonly tokensUsed: FieldRef<"AnalysisLog", 'Int'>
    readonly durationMs: FieldRef<"AnalysisLog", 'Int'>
    readonly createdAt: FieldRef<"AnalysisLog", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AnalysisLog findUnique
   */
  export type AnalysisLogFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalysisLog
     */
    select?: AnalysisLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisLogInclude<ExtArgs> | null
    /**
     * Filter, which AnalysisLog to fetch.
     */
    where: AnalysisLogWhereUniqueInput
  }

  /**
   * AnalysisLog findUniqueOrThrow
   */
  export type AnalysisLogFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalysisLog
     */
    select?: AnalysisLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisLogInclude<ExtArgs> | null
    /**
     * Filter, which AnalysisLog to fetch.
     */
    where: AnalysisLogWhereUniqueInput
  }

  /**
   * AnalysisLog findFirst
   */
  export type AnalysisLogFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalysisLog
     */
    select?: AnalysisLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisLogInclude<ExtArgs> | null
    /**
     * Filter, which AnalysisLog to fetch.
     */
    where?: AnalysisLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AnalysisLogs to fetch.
     */
    orderBy?: AnalysisLogOrderByWithRelationInput | AnalysisLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AnalysisLogs.
     */
    cursor?: AnalysisLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AnalysisLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AnalysisLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AnalysisLogs.
     */
    distinct?: AnalysisLogScalarFieldEnum | AnalysisLogScalarFieldEnum[]
  }

  /**
   * AnalysisLog findFirstOrThrow
   */
  export type AnalysisLogFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalysisLog
     */
    select?: AnalysisLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisLogInclude<ExtArgs> | null
    /**
     * Filter, which AnalysisLog to fetch.
     */
    where?: AnalysisLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AnalysisLogs to fetch.
     */
    orderBy?: AnalysisLogOrderByWithRelationInput | AnalysisLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AnalysisLogs.
     */
    cursor?: AnalysisLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AnalysisLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AnalysisLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AnalysisLogs.
     */
    distinct?: AnalysisLogScalarFieldEnum | AnalysisLogScalarFieldEnum[]
  }

  /**
   * AnalysisLog findMany
   */
  export type AnalysisLogFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalysisLog
     */
    select?: AnalysisLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisLogInclude<ExtArgs> | null
    /**
     * Filter, which AnalysisLogs to fetch.
     */
    where?: AnalysisLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AnalysisLogs to fetch.
     */
    orderBy?: AnalysisLogOrderByWithRelationInput | AnalysisLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AnalysisLogs.
     */
    cursor?: AnalysisLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AnalysisLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AnalysisLogs.
     */
    skip?: number
    distinct?: AnalysisLogScalarFieldEnum | AnalysisLogScalarFieldEnum[]
  }

  /**
   * AnalysisLog create
   */
  export type AnalysisLogCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalysisLog
     */
    select?: AnalysisLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisLogInclude<ExtArgs> | null
    /**
     * The data needed to create a AnalysisLog.
     */
    data: XOR<AnalysisLogCreateInput, AnalysisLogUncheckedCreateInput>
  }

  /**
   * AnalysisLog createMany
   */
  export type AnalysisLogCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AnalysisLogs.
     */
    data: AnalysisLogCreateManyInput | AnalysisLogCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AnalysisLog createManyAndReturn
   */
  export type AnalysisLogCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalysisLog
     */
    select?: AnalysisLogSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many AnalysisLogs.
     */
    data: AnalysisLogCreateManyInput | AnalysisLogCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisLogIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AnalysisLog update
   */
  export type AnalysisLogUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalysisLog
     */
    select?: AnalysisLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisLogInclude<ExtArgs> | null
    /**
     * The data needed to update a AnalysisLog.
     */
    data: XOR<AnalysisLogUpdateInput, AnalysisLogUncheckedUpdateInput>
    /**
     * Choose, which AnalysisLog to update.
     */
    where: AnalysisLogWhereUniqueInput
  }

  /**
   * AnalysisLog updateMany
   */
  export type AnalysisLogUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AnalysisLogs.
     */
    data: XOR<AnalysisLogUpdateManyMutationInput, AnalysisLogUncheckedUpdateManyInput>
    /**
     * Filter which AnalysisLogs to update
     */
    where?: AnalysisLogWhereInput
  }

  /**
   * AnalysisLog upsert
   */
  export type AnalysisLogUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalysisLog
     */
    select?: AnalysisLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisLogInclude<ExtArgs> | null
    /**
     * The filter to search for the AnalysisLog to update in case it exists.
     */
    where: AnalysisLogWhereUniqueInput
    /**
     * In case the AnalysisLog found by the `where` argument doesn't exist, create a new AnalysisLog with this data.
     */
    create: XOR<AnalysisLogCreateInput, AnalysisLogUncheckedCreateInput>
    /**
     * In case the AnalysisLog was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AnalysisLogUpdateInput, AnalysisLogUncheckedUpdateInput>
  }

  /**
   * AnalysisLog delete
   */
  export type AnalysisLogDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalysisLog
     */
    select?: AnalysisLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisLogInclude<ExtArgs> | null
    /**
     * Filter which AnalysisLog to delete.
     */
    where: AnalysisLogWhereUniqueInput
  }

  /**
   * AnalysisLog deleteMany
   */
  export type AnalysisLogDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AnalysisLogs to delete
     */
    where?: AnalysisLogWhereInput
  }

  /**
   * AnalysisLog without action
   */
  export type AnalysisLogDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalysisLog
     */
    select?: AnalysisLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisLogInclude<ExtArgs> | null
  }


  /**
   * Model Resume
   */

  export type AggregateResume = {
    _count: ResumeCountAggregateOutputType | null
    _avg: ResumeAvgAggregateOutputType | null
    _sum: ResumeSumAggregateOutputType | null
    _min: ResumeMinAggregateOutputType | null
    _max: ResumeMaxAggregateOutputType | null
  }

  export type ResumeAvgAggregateOutputType = {
    id: number | null
    sizeBytes: number | null
  }

  export type ResumeSumAggregateOutputType = {
    id: number | null
    sizeBytes: number | null
  }

  export type ResumeMinAggregateOutputType = {
    id: number | null
    name: string | null
    fileName: string | null
    mimeType: string | null
    sizeBytes: number | null
    data: Buffer | null
    textContent: string | null
    parsed: string | null
    tags: string | null
    isDefault: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ResumeMaxAggregateOutputType = {
    id: number | null
    name: string | null
    fileName: string | null
    mimeType: string | null
    sizeBytes: number | null
    data: Buffer | null
    textContent: string | null
    parsed: string | null
    tags: string | null
    isDefault: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ResumeCountAggregateOutputType = {
    id: number
    name: number
    fileName: number
    mimeType: number
    sizeBytes: number
    data: number
    textContent: number
    parsed: number
    tags: number
    isDefault: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ResumeAvgAggregateInputType = {
    id?: true
    sizeBytes?: true
  }

  export type ResumeSumAggregateInputType = {
    id?: true
    sizeBytes?: true
  }

  export type ResumeMinAggregateInputType = {
    id?: true
    name?: true
    fileName?: true
    mimeType?: true
    sizeBytes?: true
    data?: true
    textContent?: true
    parsed?: true
    tags?: true
    isDefault?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ResumeMaxAggregateInputType = {
    id?: true
    name?: true
    fileName?: true
    mimeType?: true
    sizeBytes?: true
    data?: true
    textContent?: true
    parsed?: true
    tags?: true
    isDefault?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ResumeCountAggregateInputType = {
    id?: true
    name?: true
    fileName?: true
    mimeType?: true
    sizeBytes?: true
    data?: true
    textContent?: true
    parsed?: true
    tags?: true
    isDefault?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ResumeAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Resume to aggregate.
     */
    where?: ResumeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Resumes to fetch.
     */
    orderBy?: ResumeOrderByWithRelationInput | ResumeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ResumeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Resumes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Resumes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Resumes
    **/
    _count?: true | ResumeCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ResumeAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ResumeSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ResumeMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ResumeMaxAggregateInputType
  }

  export type GetResumeAggregateType<T extends ResumeAggregateArgs> = {
        [P in keyof T & keyof AggregateResume]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateResume[P]>
      : GetScalarType<T[P], AggregateResume[P]>
  }




  export type ResumeGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ResumeWhereInput
    orderBy?: ResumeOrderByWithAggregationInput | ResumeOrderByWithAggregationInput[]
    by: ResumeScalarFieldEnum[] | ResumeScalarFieldEnum
    having?: ResumeScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ResumeCountAggregateInputType | true
    _avg?: ResumeAvgAggregateInputType
    _sum?: ResumeSumAggregateInputType
    _min?: ResumeMinAggregateInputType
    _max?: ResumeMaxAggregateInputType
  }

  export type ResumeGroupByOutputType = {
    id: number
    name: string
    fileName: string
    mimeType: string
    sizeBytes: number
    data: Buffer
    textContent: string | null
    parsed: string | null
    tags: string | null
    isDefault: boolean
    createdAt: Date
    updatedAt: Date
    _count: ResumeCountAggregateOutputType | null
    _avg: ResumeAvgAggregateOutputType | null
    _sum: ResumeSumAggregateOutputType | null
    _min: ResumeMinAggregateOutputType | null
    _max: ResumeMaxAggregateOutputType | null
  }

  type GetResumeGroupByPayload<T extends ResumeGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ResumeGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ResumeGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ResumeGroupByOutputType[P]>
            : GetScalarType<T[P], ResumeGroupByOutputType[P]>
        }
      >
    >


  export type ResumeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    fileName?: boolean
    mimeType?: boolean
    sizeBytes?: boolean
    data?: boolean
    textContent?: boolean
    parsed?: boolean
    tags?: boolean
    isDefault?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["resume"]>

  export type ResumeSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    fileName?: boolean
    mimeType?: boolean
    sizeBytes?: boolean
    data?: boolean
    textContent?: boolean
    parsed?: boolean
    tags?: boolean
    isDefault?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["resume"]>

  export type ResumeSelectScalar = {
    id?: boolean
    name?: boolean
    fileName?: boolean
    mimeType?: boolean
    sizeBytes?: boolean
    data?: boolean
    textContent?: boolean
    parsed?: boolean
    tags?: boolean
    isDefault?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }


  export type $ResumePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Resume"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      name: string
      fileName: string
      mimeType: string
      sizeBytes: number
      data: Buffer
      textContent: string | null
      parsed: string | null
      tags: string | null
      isDefault: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["resume"]>
    composites: {}
  }

  type ResumeGetPayload<S extends boolean | null | undefined | ResumeDefaultArgs> = $Result.GetResult<Prisma.$ResumePayload, S>

  type ResumeCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ResumeFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ResumeCountAggregateInputType | true
    }

  export interface ResumeDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Resume'], meta: { name: 'Resume' } }
    /**
     * Find zero or one Resume that matches the filter.
     * @param {ResumeFindUniqueArgs} args - Arguments to find a Resume
     * @example
     * // Get one Resume
     * const resume = await prisma.resume.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ResumeFindUniqueArgs>(args: SelectSubset<T, ResumeFindUniqueArgs<ExtArgs>>): Prisma__ResumeClient<$Result.GetResult<Prisma.$ResumePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Resume that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ResumeFindUniqueOrThrowArgs} args - Arguments to find a Resume
     * @example
     * // Get one Resume
     * const resume = await prisma.resume.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ResumeFindUniqueOrThrowArgs>(args: SelectSubset<T, ResumeFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ResumeClient<$Result.GetResult<Prisma.$ResumePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Resume that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResumeFindFirstArgs} args - Arguments to find a Resume
     * @example
     * // Get one Resume
     * const resume = await prisma.resume.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ResumeFindFirstArgs>(args?: SelectSubset<T, ResumeFindFirstArgs<ExtArgs>>): Prisma__ResumeClient<$Result.GetResult<Prisma.$ResumePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Resume that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResumeFindFirstOrThrowArgs} args - Arguments to find a Resume
     * @example
     * // Get one Resume
     * const resume = await prisma.resume.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ResumeFindFirstOrThrowArgs>(args?: SelectSubset<T, ResumeFindFirstOrThrowArgs<ExtArgs>>): Prisma__ResumeClient<$Result.GetResult<Prisma.$ResumePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Resumes that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResumeFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Resumes
     * const resumes = await prisma.resume.findMany()
     * 
     * // Get first 10 Resumes
     * const resumes = await prisma.resume.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const resumeWithIdOnly = await prisma.resume.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ResumeFindManyArgs>(args?: SelectSubset<T, ResumeFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ResumePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Resume.
     * @param {ResumeCreateArgs} args - Arguments to create a Resume.
     * @example
     * // Create one Resume
     * const Resume = await prisma.resume.create({
     *   data: {
     *     // ... data to create a Resume
     *   }
     * })
     * 
     */
    create<T extends ResumeCreateArgs>(args: SelectSubset<T, ResumeCreateArgs<ExtArgs>>): Prisma__ResumeClient<$Result.GetResult<Prisma.$ResumePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Resumes.
     * @param {ResumeCreateManyArgs} args - Arguments to create many Resumes.
     * @example
     * // Create many Resumes
     * const resume = await prisma.resume.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ResumeCreateManyArgs>(args?: SelectSubset<T, ResumeCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Resumes and returns the data saved in the database.
     * @param {ResumeCreateManyAndReturnArgs} args - Arguments to create many Resumes.
     * @example
     * // Create many Resumes
     * const resume = await prisma.resume.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Resumes and only return the `id`
     * const resumeWithIdOnly = await prisma.resume.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ResumeCreateManyAndReturnArgs>(args?: SelectSubset<T, ResumeCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ResumePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Resume.
     * @param {ResumeDeleteArgs} args - Arguments to delete one Resume.
     * @example
     * // Delete one Resume
     * const Resume = await prisma.resume.delete({
     *   where: {
     *     // ... filter to delete one Resume
     *   }
     * })
     * 
     */
    delete<T extends ResumeDeleteArgs>(args: SelectSubset<T, ResumeDeleteArgs<ExtArgs>>): Prisma__ResumeClient<$Result.GetResult<Prisma.$ResumePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Resume.
     * @param {ResumeUpdateArgs} args - Arguments to update one Resume.
     * @example
     * // Update one Resume
     * const resume = await prisma.resume.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ResumeUpdateArgs>(args: SelectSubset<T, ResumeUpdateArgs<ExtArgs>>): Prisma__ResumeClient<$Result.GetResult<Prisma.$ResumePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Resumes.
     * @param {ResumeDeleteManyArgs} args - Arguments to filter Resumes to delete.
     * @example
     * // Delete a few Resumes
     * const { count } = await prisma.resume.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ResumeDeleteManyArgs>(args?: SelectSubset<T, ResumeDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Resumes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResumeUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Resumes
     * const resume = await prisma.resume.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ResumeUpdateManyArgs>(args: SelectSubset<T, ResumeUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Resume.
     * @param {ResumeUpsertArgs} args - Arguments to update or create a Resume.
     * @example
     * // Update or create a Resume
     * const resume = await prisma.resume.upsert({
     *   create: {
     *     // ... data to create a Resume
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Resume we want to update
     *   }
     * })
     */
    upsert<T extends ResumeUpsertArgs>(args: SelectSubset<T, ResumeUpsertArgs<ExtArgs>>): Prisma__ResumeClient<$Result.GetResult<Prisma.$ResumePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Resumes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResumeCountArgs} args - Arguments to filter Resumes to count.
     * @example
     * // Count the number of Resumes
     * const count = await prisma.resume.count({
     *   where: {
     *     // ... the filter for the Resumes we want to count
     *   }
     * })
    **/
    count<T extends ResumeCountArgs>(
      args?: Subset<T, ResumeCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ResumeCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Resume.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResumeAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ResumeAggregateArgs>(args: Subset<T, ResumeAggregateArgs>): Prisma.PrismaPromise<GetResumeAggregateType<T>>

    /**
     * Group by Resume.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResumeGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ResumeGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ResumeGroupByArgs['orderBy'] }
        : { orderBy?: ResumeGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ResumeGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetResumeGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Resume model
   */
  readonly fields: ResumeFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Resume.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ResumeClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Resume model
   */ 
  interface ResumeFieldRefs {
    readonly id: FieldRef<"Resume", 'Int'>
    readonly name: FieldRef<"Resume", 'String'>
    readonly fileName: FieldRef<"Resume", 'String'>
    readonly mimeType: FieldRef<"Resume", 'String'>
    readonly sizeBytes: FieldRef<"Resume", 'Int'>
    readonly data: FieldRef<"Resume", 'Bytes'>
    readonly textContent: FieldRef<"Resume", 'String'>
    readonly parsed: FieldRef<"Resume", 'String'>
    readonly tags: FieldRef<"Resume", 'String'>
    readonly isDefault: FieldRef<"Resume", 'Boolean'>
    readonly createdAt: FieldRef<"Resume", 'DateTime'>
    readonly updatedAt: FieldRef<"Resume", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Resume findUnique
   */
  export type ResumeFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Resume
     */
    select?: ResumeSelect<ExtArgs> | null
    /**
     * Filter, which Resume to fetch.
     */
    where: ResumeWhereUniqueInput
  }

  /**
   * Resume findUniqueOrThrow
   */
  export type ResumeFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Resume
     */
    select?: ResumeSelect<ExtArgs> | null
    /**
     * Filter, which Resume to fetch.
     */
    where: ResumeWhereUniqueInput
  }

  /**
   * Resume findFirst
   */
  export type ResumeFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Resume
     */
    select?: ResumeSelect<ExtArgs> | null
    /**
     * Filter, which Resume to fetch.
     */
    where?: ResumeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Resumes to fetch.
     */
    orderBy?: ResumeOrderByWithRelationInput | ResumeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Resumes.
     */
    cursor?: ResumeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Resumes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Resumes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Resumes.
     */
    distinct?: ResumeScalarFieldEnum | ResumeScalarFieldEnum[]
  }

  /**
   * Resume findFirstOrThrow
   */
  export type ResumeFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Resume
     */
    select?: ResumeSelect<ExtArgs> | null
    /**
     * Filter, which Resume to fetch.
     */
    where?: ResumeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Resumes to fetch.
     */
    orderBy?: ResumeOrderByWithRelationInput | ResumeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Resumes.
     */
    cursor?: ResumeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Resumes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Resumes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Resumes.
     */
    distinct?: ResumeScalarFieldEnum | ResumeScalarFieldEnum[]
  }

  /**
   * Resume findMany
   */
  export type ResumeFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Resume
     */
    select?: ResumeSelect<ExtArgs> | null
    /**
     * Filter, which Resumes to fetch.
     */
    where?: ResumeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Resumes to fetch.
     */
    orderBy?: ResumeOrderByWithRelationInput | ResumeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Resumes.
     */
    cursor?: ResumeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Resumes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Resumes.
     */
    skip?: number
    distinct?: ResumeScalarFieldEnum | ResumeScalarFieldEnum[]
  }

  /**
   * Resume create
   */
  export type ResumeCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Resume
     */
    select?: ResumeSelect<ExtArgs> | null
    /**
     * The data needed to create a Resume.
     */
    data: XOR<ResumeCreateInput, ResumeUncheckedCreateInput>
  }

  /**
   * Resume createMany
   */
  export type ResumeCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Resumes.
     */
    data: ResumeCreateManyInput | ResumeCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Resume createManyAndReturn
   */
  export type ResumeCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Resume
     */
    select?: ResumeSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Resumes.
     */
    data: ResumeCreateManyInput | ResumeCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Resume update
   */
  export type ResumeUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Resume
     */
    select?: ResumeSelect<ExtArgs> | null
    /**
     * The data needed to update a Resume.
     */
    data: XOR<ResumeUpdateInput, ResumeUncheckedUpdateInput>
    /**
     * Choose, which Resume to update.
     */
    where: ResumeWhereUniqueInput
  }

  /**
   * Resume updateMany
   */
  export type ResumeUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Resumes.
     */
    data: XOR<ResumeUpdateManyMutationInput, ResumeUncheckedUpdateManyInput>
    /**
     * Filter which Resumes to update
     */
    where?: ResumeWhereInput
  }

  /**
   * Resume upsert
   */
  export type ResumeUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Resume
     */
    select?: ResumeSelect<ExtArgs> | null
    /**
     * The filter to search for the Resume to update in case it exists.
     */
    where: ResumeWhereUniqueInput
    /**
     * In case the Resume found by the `where` argument doesn't exist, create a new Resume with this data.
     */
    create: XOR<ResumeCreateInput, ResumeUncheckedCreateInput>
    /**
     * In case the Resume was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ResumeUpdateInput, ResumeUncheckedUpdateInput>
  }

  /**
   * Resume delete
   */
  export type ResumeDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Resume
     */
    select?: ResumeSelect<ExtArgs> | null
    /**
     * Filter which Resume to delete.
     */
    where: ResumeWhereUniqueInput
  }

  /**
   * Resume deleteMany
   */
  export type ResumeDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Resumes to delete
     */
    where?: ResumeWhereInput
  }

  /**
   * Resume without action
   */
  export type ResumeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Resume
     */
    select?: ResumeSelect<ExtArgs> | null
  }


  /**
   * Model SavedAnswer
   */

  export type AggregateSavedAnswer = {
    _count: SavedAnswerCountAggregateOutputType | null
    _avg: SavedAnswerAvgAggregateOutputType | null
    _sum: SavedAnswerSumAggregateOutputType | null
    _min: SavedAnswerMinAggregateOutputType | null
    _max: SavedAnswerMaxAggregateOutputType | null
  }

  export type SavedAnswerAvgAggregateOutputType = {
    id: number | null
    uses: number | null
  }

  export type SavedAnswerSumAggregateOutputType = {
    id: number | null
    uses: number | null
  }

  export type SavedAnswerMinAggregateOutputType = {
    id: number | null
    question: string | null
    answer: string | null
    tags: string | null
    uses: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SavedAnswerMaxAggregateOutputType = {
    id: number | null
    question: string | null
    answer: string | null
    tags: string | null
    uses: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SavedAnswerCountAggregateOutputType = {
    id: number
    question: number
    answer: number
    tags: number
    uses: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type SavedAnswerAvgAggregateInputType = {
    id?: true
    uses?: true
  }

  export type SavedAnswerSumAggregateInputType = {
    id?: true
    uses?: true
  }

  export type SavedAnswerMinAggregateInputType = {
    id?: true
    question?: true
    answer?: true
    tags?: true
    uses?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SavedAnswerMaxAggregateInputType = {
    id?: true
    question?: true
    answer?: true
    tags?: true
    uses?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SavedAnswerCountAggregateInputType = {
    id?: true
    question?: true
    answer?: true
    tags?: true
    uses?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type SavedAnswerAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SavedAnswer to aggregate.
     */
    where?: SavedAnswerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SavedAnswers to fetch.
     */
    orderBy?: SavedAnswerOrderByWithRelationInput | SavedAnswerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SavedAnswerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SavedAnswers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SavedAnswers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SavedAnswers
    **/
    _count?: true | SavedAnswerCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SavedAnswerAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SavedAnswerSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SavedAnswerMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SavedAnswerMaxAggregateInputType
  }

  export type GetSavedAnswerAggregateType<T extends SavedAnswerAggregateArgs> = {
        [P in keyof T & keyof AggregateSavedAnswer]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSavedAnswer[P]>
      : GetScalarType<T[P], AggregateSavedAnswer[P]>
  }




  export type SavedAnswerGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SavedAnswerWhereInput
    orderBy?: SavedAnswerOrderByWithAggregationInput | SavedAnswerOrderByWithAggregationInput[]
    by: SavedAnswerScalarFieldEnum[] | SavedAnswerScalarFieldEnum
    having?: SavedAnswerScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SavedAnswerCountAggregateInputType | true
    _avg?: SavedAnswerAvgAggregateInputType
    _sum?: SavedAnswerSumAggregateInputType
    _min?: SavedAnswerMinAggregateInputType
    _max?: SavedAnswerMaxAggregateInputType
  }

  export type SavedAnswerGroupByOutputType = {
    id: number
    question: string
    answer: string
    tags: string | null
    uses: number
    createdAt: Date
    updatedAt: Date
    _count: SavedAnswerCountAggregateOutputType | null
    _avg: SavedAnswerAvgAggregateOutputType | null
    _sum: SavedAnswerSumAggregateOutputType | null
    _min: SavedAnswerMinAggregateOutputType | null
    _max: SavedAnswerMaxAggregateOutputType | null
  }

  type GetSavedAnswerGroupByPayload<T extends SavedAnswerGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SavedAnswerGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SavedAnswerGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SavedAnswerGroupByOutputType[P]>
            : GetScalarType<T[P], SavedAnswerGroupByOutputType[P]>
        }
      >
    >


  export type SavedAnswerSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    question?: boolean
    answer?: boolean
    tags?: boolean
    uses?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["savedAnswer"]>

  export type SavedAnswerSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    question?: boolean
    answer?: boolean
    tags?: boolean
    uses?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["savedAnswer"]>

  export type SavedAnswerSelectScalar = {
    id?: boolean
    question?: boolean
    answer?: boolean
    tags?: boolean
    uses?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }


  export type $SavedAnswerPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SavedAnswer"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      question: string
      answer: string
      tags: string | null
      uses: number
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["savedAnswer"]>
    composites: {}
  }

  type SavedAnswerGetPayload<S extends boolean | null | undefined | SavedAnswerDefaultArgs> = $Result.GetResult<Prisma.$SavedAnswerPayload, S>

  type SavedAnswerCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<SavedAnswerFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: SavedAnswerCountAggregateInputType | true
    }

  export interface SavedAnswerDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SavedAnswer'], meta: { name: 'SavedAnswer' } }
    /**
     * Find zero or one SavedAnswer that matches the filter.
     * @param {SavedAnswerFindUniqueArgs} args - Arguments to find a SavedAnswer
     * @example
     * // Get one SavedAnswer
     * const savedAnswer = await prisma.savedAnswer.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SavedAnswerFindUniqueArgs>(args: SelectSubset<T, SavedAnswerFindUniqueArgs<ExtArgs>>): Prisma__SavedAnswerClient<$Result.GetResult<Prisma.$SavedAnswerPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one SavedAnswer that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {SavedAnswerFindUniqueOrThrowArgs} args - Arguments to find a SavedAnswer
     * @example
     * // Get one SavedAnswer
     * const savedAnswer = await prisma.savedAnswer.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SavedAnswerFindUniqueOrThrowArgs>(args: SelectSubset<T, SavedAnswerFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SavedAnswerClient<$Result.GetResult<Prisma.$SavedAnswerPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first SavedAnswer that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SavedAnswerFindFirstArgs} args - Arguments to find a SavedAnswer
     * @example
     * // Get one SavedAnswer
     * const savedAnswer = await prisma.savedAnswer.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SavedAnswerFindFirstArgs>(args?: SelectSubset<T, SavedAnswerFindFirstArgs<ExtArgs>>): Prisma__SavedAnswerClient<$Result.GetResult<Prisma.$SavedAnswerPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first SavedAnswer that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SavedAnswerFindFirstOrThrowArgs} args - Arguments to find a SavedAnswer
     * @example
     * // Get one SavedAnswer
     * const savedAnswer = await prisma.savedAnswer.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SavedAnswerFindFirstOrThrowArgs>(args?: SelectSubset<T, SavedAnswerFindFirstOrThrowArgs<ExtArgs>>): Prisma__SavedAnswerClient<$Result.GetResult<Prisma.$SavedAnswerPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more SavedAnswers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SavedAnswerFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SavedAnswers
     * const savedAnswers = await prisma.savedAnswer.findMany()
     * 
     * // Get first 10 SavedAnswers
     * const savedAnswers = await prisma.savedAnswer.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const savedAnswerWithIdOnly = await prisma.savedAnswer.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SavedAnswerFindManyArgs>(args?: SelectSubset<T, SavedAnswerFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SavedAnswerPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a SavedAnswer.
     * @param {SavedAnswerCreateArgs} args - Arguments to create a SavedAnswer.
     * @example
     * // Create one SavedAnswer
     * const SavedAnswer = await prisma.savedAnswer.create({
     *   data: {
     *     // ... data to create a SavedAnswer
     *   }
     * })
     * 
     */
    create<T extends SavedAnswerCreateArgs>(args: SelectSubset<T, SavedAnswerCreateArgs<ExtArgs>>): Prisma__SavedAnswerClient<$Result.GetResult<Prisma.$SavedAnswerPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many SavedAnswers.
     * @param {SavedAnswerCreateManyArgs} args - Arguments to create many SavedAnswers.
     * @example
     * // Create many SavedAnswers
     * const savedAnswer = await prisma.savedAnswer.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SavedAnswerCreateManyArgs>(args?: SelectSubset<T, SavedAnswerCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SavedAnswers and returns the data saved in the database.
     * @param {SavedAnswerCreateManyAndReturnArgs} args - Arguments to create many SavedAnswers.
     * @example
     * // Create many SavedAnswers
     * const savedAnswer = await prisma.savedAnswer.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SavedAnswers and only return the `id`
     * const savedAnswerWithIdOnly = await prisma.savedAnswer.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SavedAnswerCreateManyAndReturnArgs>(args?: SelectSubset<T, SavedAnswerCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SavedAnswerPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a SavedAnswer.
     * @param {SavedAnswerDeleteArgs} args - Arguments to delete one SavedAnswer.
     * @example
     * // Delete one SavedAnswer
     * const SavedAnswer = await prisma.savedAnswer.delete({
     *   where: {
     *     // ... filter to delete one SavedAnswer
     *   }
     * })
     * 
     */
    delete<T extends SavedAnswerDeleteArgs>(args: SelectSubset<T, SavedAnswerDeleteArgs<ExtArgs>>): Prisma__SavedAnswerClient<$Result.GetResult<Prisma.$SavedAnswerPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one SavedAnswer.
     * @param {SavedAnswerUpdateArgs} args - Arguments to update one SavedAnswer.
     * @example
     * // Update one SavedAnswer
     * const savedAnswer = await prisma.savedAnswer.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SavedAnswerUpdateArgs>(args: SelectSubset<T, SavedAnswerUpdateArgs<ExtArgs>>): Prisma__SavedAnswerClient<$Result.GetResult<Prisma.$SavedAnswerPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more SavedAnswers.
     * @param {SavedAnswerDeleteManyArgs} args - Arguments to filter SavedAnswers to delete.
     * @example
     * // Delete a few SavedAnswers
     * const { count } = await prisma.savedAnswer.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SavedAnswerDeleteManyArgs>(args?: SelectSubset<T, SavedAnswerDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SavedAnswers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SavedAnswerUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SavedAnswers
     * const savedAnswer = await prisma.savedAnswer.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SavedAnswerUpdateManyArgs>(args: SelectSubset<T, SavedAnswerUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one SavedAnswer.
     * @param {SavedAnswerUpsertArgs} args - Arguments to update or create a SavedAnswer.
     * @example
     * // Update or create a SavedAnswer
     * const savedAnswer = await prisma.savedAnswer.upsert({
     *   create: {
     *     // ... data to create a SavedAnswer
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SavedAnswer we want to update
     *   }
     * })
     */
    upsert<T extends SavedAnswerUpsertArgs>(args: SelectSubset<T, SavedAnswerUpsertArgs<ExtArgs>>): Prisma__SavedAnswerClient<$Result.GetResult<Prisma.$SavedAnswerPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of SavedAnswers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SavedAnswerCountArgs} args - Arguments to filter SavedAnswers to count.
     * @example
     * // Count the number of SavedAnswers
     * const count = await prisma.savedAnswer.count({
     *   where: {
     *     // ... the filter for the SavedAnswers we want to count
     *   }
     * })
    **/
    count<T extends SavedAnswerCountArgs>(
      args?: Subset<T, SavedAnswerCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SavedAnswerCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SavedAnswer.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SavedAnswerAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SavedAnswerAggregateArgs>(args: Subset<T, SavedAnswerAggregateArgs>): Prisma.PrismaPromise<GetSavedAnswerAggregateType<T>>

    /**
     * Group by SavedAnswer.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SavedAnswerGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SavedAnswerGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SavedAnswerGroupByArgs['orderBy'] }
        : { orderBy?: SavedAnswerGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SavedAnswerGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSavedAnswerGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SavedAnswer model
   */
  readonly fields: SavedAnswerFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SavedAnswer.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SavedAnswerClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SavedAnswer model
   */ 
  interface SavedAnswerFieldRefs {
    readonly id: FieldRef<"SavedAnswer", 'Int'>
    readonly question: FieldRef<"SavedAnswer", 'String'>
    readonly answer: FieldRef<"SavedAnswer", 'String'>
    readonly tags: FieldRef<"SavedAnswer", 'String'>
    readonly uses: FieldRef<"SavedAnswer", 'Int'>
    readonly createdAt: FieldRef<"SavedAnswer", 'DateTime'>
    readonly updatedAt: FieldRef<"SavedAnswer", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * SavedAnswer findUnique
   */
  export type SavedAnswerFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SavedAnswer
     */
    select?: SavedAnswerSelect<ExtArgs> | null
    /**
     * Filter, which SavedAnswer to fetch.
     */
    where: SavedAnswerWhereUniqueInput
  }

  /**
   * SavedAnswer findUniqueOrThrow
   */
  export type SavedAnswerFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SavedAnswer
     */
    select?: SavedAnswerSelect<ExtArgs> | null
    /**
     * Filter, which SavedAnswer to fetch.
     */
    where: SavedAnswerWhereUniqueInput
  }

  /**
   * SavedAnswer findFirst
   */
  export type SavedAnswerFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SavedAnswer
     */
    select?: SavedAnswerSelect<ExtArgs> | null
    /**
     * Filter, which SavedAnswer to fetch.
     */
    where?: SavedAnswerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SavedAnswers to fetch.
     */
    orderBy?: SavedAnswerOrderByWithRelationInput | SavedAnswerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SavedAnswers.
     */
    cursor?: SavedAnswerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SavedAnswers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SavedAnswers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SavedAnswers.
     */
    distinct?: SavedAnswerScalarFieldEnum | SavedAnswerScalarFieldEnum[]
  }

  /**
   * SavedAnswer findFirstOrThrow
   */
  export type SavedAnswerFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SavedAnswer
     */
    select?: SavedAnswerSelect<ExtArgs> | null
    /**
     * Filter, which SavedAnswer to fetch.
     */
    where?: SavedAnswerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SavedAnswers to fetch.
     */
    orderBy?: SavedAnswerOrderByWithRelationInput | SavedAnswerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SavedAnswers.
     */
    cursor?: SavedAnswerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SavedAnswers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SavedAnswers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SavedAnswers.
     */
    distinct?: SavedAnswerScalarFieldEnum | SavedAnswerScalarFieldEnum[]
  }

  /**
   * SavedAnswer findMany
   */
  export type SavedAnswerFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SavedAnswer
     */
    select?: SavedAnswerSelect<ExtArgs> | null
    /**
     * Filter, which SavedAnswers to fetch.
     */
    where?: SavedAnswerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SavedAnswers to fetch.
     */
    orderBy?: SavedAnswerOrderByWithRelationInput | SavedAnswerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SavedAnswers.
     */
    cursor?: SavedAnswerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SavedAnswers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SavedAnswers.
     */
    skip?: number
    distinct?: SavedAnswerScalarFieldEnum | SavedAnswerScalarFieldEnum[]
  }

  /**
   * SavedAnswer create
   */
  export type SavedAnswerCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SavedAnswer
     */
    select?: SavedAnswerSelect<ExtArgs> | null
    /**
     * The data needed to create a SavedAnswer.
     */
    data: XOR<SavedAnswerCreateInput, SavedAnswerUncheckedCreateInput>
  }

  /**
   * SavedAnswer createMany
   */
  export type SavedAnswerCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SavedAnswers.
     */
    data: SavedAnswerCreateManyInput | SavedAnswerCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SavedAnswer createManyAndReturn
   */
  export type SavedAnswerCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SavedAnswer
     */
    select?: SavedAnswerSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many SavedAnswers.
     */
    data: SavedAnswerCreateManyInput | SavedAnswerCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SavedAnswer update
   */
  export type SavedAnswerUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SavedAnswer
     */
    select?: SavedAnswerSelect<ExtArgs> | null
    /**
     * The data needed to update a SavedAnswer.
     */
    data: XOR<SavedAnswerUpdateInput, SavedAnswerUncheckedUpdateInput>
    /**
     * Choose, which SavedAnswer to update.
     */
    where: SavedAnswerWhereUniqueInput
  }

  /**
   * SavedAnswer updateMany
   */
  export type SavedAnswerUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SavedAnswers.
     */
    data: XOR<SavedAnswerUpdateManyMutationInput, SavedAnswerUncheckedUpdateManyInput>
    /**
     * Filter which SavedAnswers to update
     */
    where?: SavedAnswerWhereInput
  }

  /**
   * SavedAnswer upsert
   */
  export type SavedAnswerUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SavedAnswer
     */
    select?: SavedAnswerSelect<ExtArgs> | null
    /**
     * The filter to search for the SavedAnswer to update in case it exists.
     */
    where: SavedAnswerWhereUniqueInput
    /**
     * In case the SavedAnswer found by the `where` argument doesn't exist, create a new SavedAnswer with this data.
     */
    create: XOR<SavedAnswerCreateInput, SavedAnswerUncheckedCreateInput>
    /**
     * In case the SavedAnswer was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SavedAnswerUpdateInput, SavedAnswerUncheckedUpdateInput>
  }

  /**
   * SavedAnswer delete
   */
  export type SavedAnswerDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SavedAnswer
     */
    select?: SavedAnswerSelect<ExtArgs> | null
    /**
     * Filter which SavedAnswer to delete.
     */
    where: SavedAnswerWhereUniqueInput
  }

  /**
   * SavedAnswer deleteMany
   */
  export type SavedAnswerDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SavedAnswers to delete
     */
    where?: SavedAnswerWhereInput
  }

  /**
   * SavedAnswer without action
   */
  export type SavedAnswerDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SavedAnswer
     */
    select?: SavedAnswerSelect<ExtArgs> | null
  }


  /**
   * Model AiUsage
   */

  export type AggregateAiUsage = {
    _count: AiUsageCountAggregateOutputType | null
    _avg: AiUsageAvgAggregateOutputType | null
    _sum: AiUsageSumAggregateOutputType | null
    _min: AiUsageMinAggregateOutputType | null
    _max: AiUsageMaxAggregateOutputType | null
  }

  export type AiUsageAvgAggregateOutputType = {
    id: number | null
    inputTokens: number | null
    outputTokens: number | null
    cacheReadTokens: number | null
    cacheWriteTokens: number | null
    costUsd: number | null
    durationMs: number | null
  }

  export type AiUsageSumAggregateOutputType = {
    id: number | null
    inputTokens: number | null
    outputTokens: number | null
    cacheReadTokens: number | null
    cacheWriteTokens: number | null
    costUsd: number | null
    durationMs: number | null
  }

  export type AiUsageMinAggregateOutputType = {
    id: number | null
    task: string | null
    provider: string | null
    model: string | null
    ok: boolean | null
    inputTokens: number | null
    outputTokens: number | null
    cacheReadTokens: number | null
    cacheWriteTokens: number | null
    costUsd: number | null
    durationMs: number | null
    error: string | null
    createdAt: Date | null
  }

  export type AiUsageMaxAggregateOutputType = {
    id: number | null
    task: string | null
    provider: string | null
    model: string | null
    ok: boolean | null
    inputTokens: number | null
    outputTokens: number | null
    cacheReadTokens: number | null
    cacheWriteTokens: number | null
    costUsd: number | null
    durationMs: number | null
    error: string | null
    createdAt: Date | null
  }

  export type AiUsageCountAggregateOutputType = {
    id: number
    task: number
    provider: number
    model: number
    ok: number
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheWriteTokens: number
    costUsd: number
    durationMs: number
    error: number
    createdAt: number
    _all: number
  }


  export type AiUsageAvgAggregateInputType = {
    id?: true
    inputTokens?: true
    outputTokens?: true
    cacheReadTokens?: true
    cacheWriteTokens?: true
    costUsd?: true
    durationMs?: true
  }

  export type AiUsageSumAggregateInputType = {
    id?: true
    inputTokens?: true
    outputTokens?: true
    cacheReadTokens?: true
    cacheWriteTokens?: true
    costUsd?: true
    durationMs?: true
  }

  export type AiUsageMinAggregateInputType = {
    id?: true
    task?: true
    provider?: true
    model?: true
    ok?: true
    inputTokens?: true
    outputTokens?: true
    cacheReadTokens?: true
    cacheWriteTokens?: true
    costUsd?: true
    durationMs?: true
    error?: true
    createdAt?: true
  }

  export type AiUsageMaxAggregateInputType = {
    id?: true
    task?: true
    provider?: true
    model?: true
    ok?: true
    inputTokens?: true
    outputTokens?: true
    cacheReadTokens?: true
    cacheWriteTokens?: true
    costUsd?: true
    durationMs?: true
    error?: true
    createdAt?: true
  }

  export type AiUsageCountAggregateInputType = {
    id?: true
    task?: true
    provider?: true
    model?: true
    ok?: true
    inputTokens?: true
    outputTokens?: true
    cacheReadTokens?: true
    cacheWriteTokens?: true
    costUsd?: true
    durationMs?: true
    error?: true
    createdAt?: true
    _all?: true
  }

  export type AiUsageAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AiUsage to aggregate.
     */
    where?: AiUsageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiUsages to fetch.
     */
    orderBy?: AiUsageOrderByWithRelationInput | AiUsageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AiUsageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiUsages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiUsages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AiUsages
    **/
    _count?: true | AiUsageCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AiUsageAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AiUsageSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AiUsageMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AiUsageMaxAggregateInputType
  }

  export type GetAiUsageAggregateType<T extends AiUsageAggregateArgs> = {
        [P in keyof T & keyof AggregateAiUsage]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAiUsage[P]>
      : GetScalarType<T[P], AggregateAiUsage[P]>
  }




  export type AiUsageGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AiUsageWhereInput
    orderBy?: AiUsageOrderByWithAggregationInput | AiUsageOrderByWithAggregationInput[]
    by: AiUsageScalarFieldEnum[] | AiUsageScalarFieldEnum
    having?: AiUsageScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AiUsageCountAggregateInputType | true
    _avg?: AiUsageAvgAggregateInputType
    _sum?: AiUsageSumAggregateInputType
    _min?: AiUsageMinAggregateInputType
    _max?: AiUsageMaxAggregateInputType
  }

  export type AiUsageGroupByOutputType = {
    id: number
    task: string
    provider: string
    model: string
    ok: boolean
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheWriteTokens: number
    costUsd: number
    durationMs: number | null
    error: string | null
    createdAt: Date
    _count: AiUsageCountAggregateOutputType | null
    _avg: AiUsageAvgAggregateOutputType | null
    _sum: AiUsageSumAggregateOutputType | null
    _min: AiUsageMinAggregateOutputType | null
    _max: AiUsageMaxAggregateOutputType | null
  }

  type GetAiUsageGroupByPayload<T extends AiUsageGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AiUsageGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AiUsageGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AiUsageGroupByOutputType[P]>
            : GetScalarType<T[P], AiUsageGroupByOutputType[P]>
        }
      >
    >


  export type AiUsageSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    task?: boolean
    provider?: boolean
    model?: boolean
    ok?: boolean
    inputTokens?: boolean
    outputTokens?: boolean
    cacheReadTokens?: boolean
    cacheWriteTokens?: boolean
    costUsd?: boolean
    durationMs?: boolean
    error?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["aiUsage"]>

  export type AiUsageSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    task?: boolean
    provider?: boolean
    model?: boolean
    ok?: boolean
    inputTokens?: boolean
    outputTokens?: boolean
    cacheReadTokens?: boolean
    cacheWriteTokens?: boolean
    costUsd?: boolean
    durationMs?: boolean
    error?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["aiUsage"]>

  export type AiUsageSelectScalar = {
    id?: boolean
    task?: boolean
    provider?: boolean
    model?: boolean
    ok?: boolean
    inputTokens?: boolean
    outputTokens?: boolean
    cacheReadTokens?: boolean
    cacheWriteTokens?: boolean
    costUsd?: boolean
    durationMs?: boolean
    error?: boolean
    createdAt?: boolean
  }


  export type $AiUsagePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AiUsage"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      task: string
      provider: string
      model: string
      ok: boolean
      inputTokens: number
      outputTokens: number
      cacheReadTokens: number
      cacheWriteTokens: number
      costUsd: number
      durationMs: number | null
      error: string | null
      createdAt: Date
    }, ExtArgs["result"]["aiUsage"]>
    composites: {}
  }

  type AiUsageGetPayload<S extends boolean | null | undefined | AiUsageDefaultArgs> = $Result.GetResult<Prisma.$AiUsagePayload, S>

  type AiUsageCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<AiUsageFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: AiUsageCountAggregateInputType | true
    }

  export interface AiUsageDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AiUsage'], meta: { name: 'AiUsage' } }
    /**
     * Find zero or one AiUsage that matches the filter.
     * @param {AiUsageFindUniqueArgs} args - Arguments to find a AiUsage
     * @example
     * // Get one AiUsage
     * const aiUsage = await prisma.aiUsage.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AiUsageFindUniqueArgs>(args: SelectSubset<T, AiUsageFindUniqueArgs<ExtArgs>>): Prisma__AiUsageClient<$Result.GetResult<Prisma.$AiUsagePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one AiUsage that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {AiUsageFindUniqueOrThrowArgs} args - Arguments to find a AiUsage
     * @example
     * // Get one AiUsage
     * const aiUsage = await prisma.aiUsage.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AiUsageFindUniqueOrThrowArgs>(args: SelectSubset<T, AiUsageFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AiUsageClient<$Result.GetResult<Prisma.$AiUsagePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first AiUsage that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiUsageFindFirstArgs} args - Arguments to find a AiUsage
     * @example
     * // Get one AiUsage
     * const aiUsage = await prisma.aiUsage.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AiUsageFindFirstArgs>(args?: SelectSubset<T, AiUsageFindFirstArgs<ExtArgs>>): Prisma__AiUsageClient<$Result.GetResult<Prisma.$AiUsagePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first AiUsage that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiUsageFindFirstOrThrowArgs} args - Arguments to find a AiUsage
     * @example
     * // Get one AiUsage
     * const aiUsage = await prisma.aiUsage.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AiUsageFindFirstOrThrowArgs>(args?: SelectSubset<T, AiUsageFindFirstOrThrowArgs<ExtArgs>>): Prisma__AiUsageClient<$Result.GetResult<Prisma.$AiUsagePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more AiUsages that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiUsageFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AiUsages
     * const aiUsages = await prisma.aiUsage.findMany()
     * 
     * // Get first 10 AiUsages
     * const aiUsages = await prisma.aiUsage.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const aiUsageWithIdOnly = await prisma.aiUsage.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AiUsageFindManyArgs>(args?: SelectSubset<T, AiUsageFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiUsagePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a AiUsage.
     * @param {AiUsageCreateArgs} args - Arguments to create a AiUsage.
     * @example
     * // Create one AiUsage
     * const AiUsage = await prisma.aiUsage.create({
     *   data: {
     *     // ... data to create a AiUsage
     *   }
     * })
     * 
     */
    create<T extends AiUsageCreateArgs>(args: SelectSubset<T, AiUsageCreateArgs<ExtArgs>>): Prisma__AiUsageClient<$Result.GetResult<Prisma.$AiUsagePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many AiUsages.
     * @param {AiUsageCreateManyArgs} args - Arguments to create many AiUsages.
     * @example
     * // Create many AiUsages
     * const aiUsage = await prisma.aiUsage.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AiUsageCreateManyArgs>(args?: SelectSubset<T, AiUsageCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AiUsages and returns the data saved in the database.
     * @param {AiUsageCreateManyAndReturnArgs} args - Arguments to create many AiUsages.
     * @example
     * // Create many AiUsages
     * const aiUsage = await prisma.aiUsage.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AiUsages and only return the `id`
     * const aiUsageWithIdOnly = await prisma.aiUsage.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AiUsageCreateManyAndReturnArgs>(args?: SelectSubset<T, AiUsageCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiUsagePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a AiUsage.
     * @param {AiUsageDeleteArgs} args - Arguments to delete one AiUsage.
     * @example
     * // Delete one AiUsage
     * const AiUsage = await prisma.aiUsage.delete({
     *   where: {
     *     // ... filter to delete one AiUsage
     *   }
     * })
     * 
     */
    delete<T extends AiUsageDeleteArgs>(args: SelectSubset<T, AiUsageDeleteArgs<ExtArgs>>): Prisma__AiUsageClient<$Result.GetResult<Prisma.$AiUsagePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one AiUsage.
     * @param {AiUsageUpdateArgs} args - Arguments to update one AiUsage.
     * @example
     * // Update one AiUsage
     * const aiUsage = await prisma.aiUsage.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AiUsageUpdateArgs>(args: SelectSubset<T, AiUsageUpdateArgs<ExtArgs>>): Prisma__AiUsageClient<$Result.GetResult<Prisma.$AiUsagePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more AiUsages.
     * @param {AiUsageDeleteManyArgs} args - Arguments to filter AiUsages to delete.
     * @example
     * // Delete a few AiUsages
     * const { count } = await prisma.aiUsage.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AiUsageDeleteManyArgs>(args?: SelectSubset<T, AiUsageDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AiUsages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiUsageUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AiUsages
     * const aiUsage = await prisma.aiUsage.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AiUsageUpdateManyArgs>(args: SelectSubset<T, AiUsageUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one AiUsage.
     * @param {AiUsageUpsertArgs} args - Arguments to update or create a AiUsage.
     * @example
     * // Update or create a AiUsage
     * const aiUsage = await prisma.aiUsage.upsert({
     *   create: {
     *     // ... data to create a AiUsage
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AiUsage we want to update
     *   }
     * })
     */
    upsert<T extends AiUsageUpsertArgs>(args: SelectSubset<T, AiUsageUpsertArgs<ExtArgs>>): Prisma__AiUsageClient<$Result.GetResult<Prisma.$AiUsagePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of AiUsages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiUsageCountArgs} args - Arguments to filter AiUsages to count.
     * @example
     * // Count the number of AiUsages
     * const count = await prisma.aiUsage.count({
     *   where: {
     *     // ... the filter for the AiUsages we want to count
     *   }
     * })
    **/
    count<T extends AiUsageCountArgs>(
      args?: Subset<T, AiUsageCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AiUsageCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AiUsage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiUsageAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AiUsageAggregateArgs>(args: Subset<T, AiUsageAggregateArgs>): Prisma.PrismaPromise<GetAiUsageAggregateType<T>>

    /**
     * Group by AiUsage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiUsageGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AiUsageGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AiUsageGroupByArgs['orderBy'] }
        : { orderBy?: AiUsageGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AiUsageGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAiUsageGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AiUsage model
   */
  readonly fields: AiUsageFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AiUsage.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AiUsageClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AiUsage model
   */ 
  interface AiUsageFieldRefs {
    readonly id: FieldRef<"AiUsage", 'Int'>
    readonly task: FieldRef<"AiUsage", 'String'>
    readonly provider: FieldRef<"AiUsage", 'String'>
    readonly model: FieldRef<"AiUsage", 'String'>
    readonly ok: FieldRef<"AiUsage", 'Boolean'>
    readonly inputTokens: FieldRef<"AiUsage", 'Int'>
    readonly outputTokens: FieldRef<"AiUsage", 'Int'>
    readonly cacheReadTokens: FieldRef<"AiUsage", 'Int'>
    readonly cacheWriteTokens: FieldRef<"AiUsage", 'Int'>
    readonly costUsd: FieldRef<"AiUsage", 'Float'>
    readonly durationMs: FieldRef<"AiUsage", 'Int'>
    readonly error: FieldRef<"AiUsage", 'String'>
    readonly createdAt: FieldRef<"AiUsage", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AiUsage findUnique
   */
  export type AiUsageFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiUsage
     */
    select?: AiUsageSelect<ExtArgs> | null
    /**
     * Filter, which AiUsage to fetch.
     */
    where: AiUsageWhereUniqueInput
  }

  /**
   * AiUsage findUniqueOrThrow
   */
  export type AiUsageFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiUsage
     */
    select?: AiUsageSelect<ExtArgs> | null
    /**
     * Filter, which AiUsage to fetch.
     */
    where: AiUsageWhereUniqueInput
  }

  /**
   * AiUsage findFirst
   */
  export type AiUsageFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiUsage
     */
    select?: AiUsageSelect<ExtArgs> | null
    /**
     * Filter, which AiUsage to fetch.
     */
    where?: AiUsageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiUsages to fetch.
     */
    orderBy?: AiUsageOrderByWithRelationInput | AiUsageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AiUsages.
     */
    cursor?: AiUsageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiUsages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiUsages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AiUsages.
     */
    distinct?: AiUsageScalarFieldEnum | AiUsageScalarFieldEnum[]
  }

  /**
   * AiUsage findFirstOrThrow
   */
  export type AiUsageFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiUsage
     */
    select?: AiUsageSelect<ExtArgs> | null
    /**
     * Filter, which AiUsage to fetch.
     */
    where?: AiUsageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiUsages to fetch.
     */
    orderBy?: AiUsageOrderByWithRelationInput | AiUsageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AiUsages.
     */
    cursor?: AiUsageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiUsages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiUsages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AiUsages.
     */
    distinct?: AiUsageScalarFieldEnum | AiUsageScalarFieldEnum[]
  }

  /**
   * AiUsage findMany
   */
  export type AiUsageFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiUsage
     */
    select?: AiUsageSelect<ExtArgs> | null
    /**
     * Filter, which AiUsages to fetch.
     */
    where?: AiUsageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiUsages to fetch.
     */
    orderBy?: AiUsageOrderByWithRelationInput | AiUsageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AiUsages.
     */
    cursor?: AiUsageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiUsages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiUsages.
     */
    skip?: number
    distinct?: AiUsageScalarFieldEnum | AiUsageScalarFieldEnum[]
  }

  /**
   * AiUsage create
   */
  export type AiUsageCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiUsage
     */
    select?: AiUsageSelect<ExtArgs> | null
    /**
     * The data needed to create a AiUsage.
     */
    data: XOR<AiUsageCreateInput, AiUsageUncheckedCreateInput>
  }

  /**
   * AiUsage createMany
   */
  export type AiUsageCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AiUsages.
     */
    data: AiUsageCreateManyInput | AiUsageCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AiUsage createManyAndReturn
   */
  export type AiUsageCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiUsage
     */
    select?: AiUsageSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many AiUsages.
     */
    data: AiUsageCreateManyInput | AiUsageCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AiUsage update
   */
  export type AiUsageUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiUsage
     */
    select?: AiUsageSelect<ExtArgs> | null
    /**
     * The data needed to update a AiUsage.
     */
    data: XOR<AiUsageUpdateInput, AiUsageUncheckedUpdateInput>
    /**
     * Choose, which AiUsage to update.
     */
    where: AiUsageWhereUniqueInput
  }

  /**
   * AiUsage updateMany
   */
  export type AiUsageUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AiUsages.
     */
    data: XOR<AiUsageUpdateManyMutationInput, AiUsageUncheckedUpdateManyInput>
    /**
     * Filter which AiUsages to update
     */
    where?: AiUsageWhereInput
  }

  /**
   * AiUsage upsert
   */
  export type AiUsageUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiUsage
     */
    select?: AiUsageSelect<ExtArgs> | null
    /**
     * The filter to search for the AiUsage to update in case it exists.
     */
    where: AiUsageWhereUniqueInput
    /**
     * In case the AiUsage found by the `where` argument doesn't exist, create a new AiUsage with this data.
     */
    create: XOR<AiUsageCreateInput, AiUsageUncheckedCreateInput>
    /**
     * In case the AiUsage was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AiUsageUpdateInput, AiUsageUncheckedUpdateInput>
  }

  /**
   * AiUsage delete
   */
  export type AiUsageDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiUsage
     */
    select?: AiUsageSelect<ExtArgs> | null
    /**
     * Filter which AiUsage to delete.
     */
    where: AiUsageWhereUniqueInput
  }

  /**
   * AiUsage deleteMany
   */
  export type AiUsageDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AiUsages to delete
     */
    where?: AiUsageWhereInput
  }

  /**
   * AiUsage without action
   */
  export type AiUsageDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiUsage
     */
    select?: AiUsageSelect<ExtArgs> | null
  }


  /**
   * Model ExtensionLog
   */

  export type AggregateExtensionLog = {
    _count: ExtensionLogCountAggregateOutputType | null
    _avg: ExtensionLogAvgAggregateOutputType | null
    _sum: ExtensionLogSumAggregateOutputType | null
    _min: ExtensionLogMinAggregateOutputType | null
    _max: ExtensionLogMaxAggregateOutputType | null
  }

  export type ExtensionLogAvgAggregateOutputType = {
    id: number | null
  }

  export type ExtensionLogSumAggregateOutputType = {
    id: number | null
  }

  export type ExtensionLogMinAggregateOutputType = {
    id: number | null
    level: string | null
    message: string | null
    sessionId: string | null
    createdAt: Date | null
  }

  export type ExtensionLogMaxAggregateOutputType = {
    id: number | null
    level: string | null
    message: string | null
    sessionId: string | null
    createdAt: Date | null
  }

  export type ExtensionLogCountAggregateOutputType = {
    id: number
    level: number
    message: number
    sessionId: number
    createdAt: number
    _all: number
  }


  export type ExtensionLogAvgAggregateInputType = {
    id?: true
  }

  export type ExtensionLogSumAggregateInputType = {
    id?: true
  }

  export type ExtensionLogMinAggregateInputType = {
    id?: true
    level?: true
    message?: true
    sessionId?: true
    createdAt?: true
  }

  export type ExtensionLogMaxAggregateInputType = {
    id?: true
    level?: true
    message?: true
    sessionId?: true
    createdAt?: true
  }

  export type ExtensionLogCountAggregateInputType = {
    id?: true
    level?: true
    message?: true
    sessionId?: true
    createdAt?: true
    _all?: true
  }

  export type ExtensionLogAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ExtensionLog to aggregate.
     */
    where?: ExtensionLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExtensionLogs to fetch.
     */
    orderBy?: ExtensionLogOrderByWithRelationInput | ExtensionLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ExtensionLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExtensionLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExtensionLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ExtensionLogs
    **/
    _count?: true | ExtensionLogCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ExtensionLogAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ExtensionLogSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ExtensionLogMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ExtensionLogMaxAggregateInputType
  }

  export type GetExtensionLogAggregateType<T extends ExtensionLogAggregateArgs> = {
        [P in keyof T & keyof AggregateExtensionLog]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateExtensionLog[P]>
      : GetScalarType<T[P], AggregateExtensionLog[P]>
  }




  export type ExtensionLogGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ExtensionLogWhereInput
    orderBy?: ExtensionLogOrderByWithAggregationInput | ExtensionLogOrderByWithAggregationInput[]
    by: ExtensionLogScalarFieldEnum[] | ExtensionLogScalarFieldEnum
    having?: ExtensionLogScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ExtensionLogCountAggregateInputType | true
    _avg?: ExtensionLogAvgAggregateInputType
    _sum?: ExtensionLogSumAggregateInputType
    _min?: ExtensionLogMinAggregateInputType
    _max?: ExtensionLogMaxAggregateInputType
  }

  export type ExtensionLogGroupByOutputType = {
    id: number
    level: string
    message: string
    sessionId: string | null
    createdAt: Date
    _count: ExtensionLogCountAggregateOutputType | null
    _avg: ExtensionLogAvgAggregateOutputType | null
    _sum: ExtensionLogSumAggregateOutputType | null
    _min: ExtensionLogMinAggregateOutputType | null
    _max: ExtensionLogMaxAggregateOutputType | null
  }

  type GetExtensionLogGroupByPayload<T extends ExtensionLogGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ExtensionLogGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ExtensionLogGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ExtensionLogGroupByOutputType[P]>
            : GetScalarType<T[P], ExtensionLogGroupByOutputType[P]>
        }
      >
    >


  export type ExtensionLogSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    level?: boolean
    message?: boolean
    sessionId?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["extensionLog"]>

  export type ExtensionLogSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    level?: boolean
    message?: boolean
    sessionId?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["extensionLog"]>

  export type ExtensionLogSelectScalar = {
    id?: boolean
    level?: boolean
    message?: boolean
    sessionId?: boolean
    createdAt?: boolean
  }


  export type $ExtensionLogPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ExtensionLog"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      level: string
      message: string
      sessionId: string | null
      createdAt: Date
    }, ExtArgs["result"]["extensionLog"]>
    composites: {}
  }

  type ExtensionLogGetPayload<S extends boolean | null | undefined | ExtensionLogDefaultArgs> = $Result.GetResult<Prisma.$ExtensionLogPayload, S>

  type ExtensionLogCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ExtensionLogFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ExtensionLogCountAggregateInputType | true
    }

  export interface ExtensionLogDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ExtensionLog'], meta: { name: 'ExtensionLog' } }
    /**
     * Find zero or one ExtensionLog that matches the filter.
     * @param {ExtensionLogFindUniqueArgs} args - Arguments to find a ExtensionLog
     * @example
     * // Get one ExtensionLog
     * const extensionLog = await prisma.extensionLog.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ExtensionLogFindUniqueArgs>(args: SelectSubset<T, ExtensionLogFindUniqueArgs<ExtArgs>>): Prisma__ExtensionLogClient<$Result.GetResult<Prisma.$ExtensionLogPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ExtensionLog that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ExtensionLogFindUniqueOrThrowArgs} args - Arguments to find a ExtensionLog
     * @example
     * // Get one ExtensionLog
     * const extensionLog = await prisma.extensionLog.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ExtensionLogFindUniqueOrThrowArgs>(args: SelectSubset<T, ExtensionLogFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ExtensionLogClient<$Result.GetResult<Prisma.$ExtensionLogPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ExtensionLog that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExtensionLogFindFirstArgs} args - Arguments to find a ExtensionLog
     * @example
     * // Get one ExtensionLog
     * const extensionLog = await prisma.extensionLog.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ExtensionLogFindFirstArgs>(args?: SelectSubset<T, ExtensionLogFindFirstArgs<ExtArgs>>): Prisma__ExtensionLogClient<$Result.GetResult<Prisma.$ExtensionLogPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ExtensionLog that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExtensionLogFindFirstOrThrowArgs} args - Arguments to find a ExtensionLog
     * @example
     * // Get one ExtensionLog
     * const extensionLog = await prisma.extensionLog.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ExtensionLogFindFirstOrThrowArgs>(args?: SelectSubset<T, ExtensionLogFindFirstOrThrowArgs<ExtArgs>>): Prisma__ExtensionLogClient<$Result.GetResult<Prisma.$ExtensionLogPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ExtensionLogs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExtensionLogFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ExtensionLogs
     * const extensionLogs = await prisma.extensionLog.findMany()
     * 
     * // Get first 10 ExtensionLogs
     * const extensionLogs = await prisma.extensionLog.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const extensionLogWithIdOnly = await prisma.extensionLog.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ExtensionLogFindManyArgs>(args?: SelectSubset<T, ExtensionLogFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExtensionLogPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ExtensionLog.
     * @param {ExtensionLogCreateArgs} args - Arguments to create a ExtensionLog.
     * @example
     * // Create one ExtensionLog
     * const ExtensionLog = await prisma.extensionLog.create({
     *   data: {
     *     // ... data to create a ExtensionLog
     *   }
     * })
     * 
     */
    create<T extends ExtensionLogCreateArgs>(args: SelectSubset<T, ExtensionLogCreateArgs<ExtArgs>>): Prisma__ExtensionLogClient<$Result.GetResult<Prisma.$ExtensionLogPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ExtensionLogs.
     * @param {ExtensionLogCreateManyArgs} args - Arguments to create many ExtensionLogs.
     * @example
     * // Create many ExtensionLogs
     * const extensionLog = await prisma.extensionLog.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ExtensionLogCreateManyArgs>(args?: SelectSubset<T, ExtensionLogCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ExtensionLogs and returns the data saved in the database.
     * @param {ExtensionLogCreateManyAndReturnArgs} args - Arguments to create many ExtensionLogs.
     * @example
     * // Create many ExtensionLogs
     * const extensionLog = await prisma.extensionLog.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ExtensionLogs and only return the `id`
     * const extensionLogWithIdOnly = await prisma.extensionLog.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ExtensionLogCreateManyAndReturnArgs>(args?: SelectSubset<T, ExtensionLogCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExtensionLogPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ExtensionLog.
     * @param {ExtensionLogDeleteArgs} args - Arguments to delete one ExtensionLog.
     * @example
     * // Delete one ExtensionLog
     * const ExtensionLog = await prisma.extensionLog.delete({
     *   where: {
     *     // ... filter to delete one ExtensionLog
     *   }
     * })
     * 
     */
    delete<T extends ExtensionLogDeleteArgs>(args: SelectSubset<T, ExtensionLogDeleteArgs<ExtArgs>>): Prisma__ExtensionLogClient<$Result.GetResult<Prisma.$ExtensionLogPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ExtensionLog.
     * @param {ExtensionLogUpdateArgs} args - Arguments to update one ExtensionLog.
     * @example
     * // Update one ExtensionLog
     * const extensionLog = await prisma.extensionLog.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ExtensionLogUpdateArgs>(args: SelectSubset<T, ExtensionLogUpdateArgs<ExtArgs>>): Prisma__ExtensionLogClient<$Result.GetResult<Prisma.$ExtensionLogPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ExtensionLogs.
     * @param {ExtensionLogDeleteManyArgs} args - Arguments to filter ExtensionLogs to delete.
     * @example
     * // Delete a few ExtensionLogs
     * const { count } = await prisma.extensionLog.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ExtensionLogDeleteManyArgs>(args?: SelectSubset<T, ExtensionLogDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ExtensionLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExtensionLogUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ExtensionLogs
     * const extensionLog = await prisma.extensionLog.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ExtensionLogUpdateManyArgs>(args: SelectSubset<T, ExtensionLogUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ExtensionLog.
     * @param {ExtensionLogUpsertArgs} args - Arguments to update or create a ExtensionLog.
     * @example
     * // Update or create a ExtensionLog
     * const extensionLog = await prisma.extensionLog.upsert({
     *   create: {
     *     // ... data to create a ExtensionLog
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ExtensionLog we want to update
     *   }
     * })
     */
    upsert<T extends ExtensionLogUpsertArgs>(args: SelectSubset<T, ExtensionLogUpsertArgs<ExtArgs>>): Prisma__ExtensionLogClient<$Result.GetResult<Prisma.$ExtensionLogPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ExtensionLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExtensionLogCountArgs} args - Arguments to filter ExtensionLogs to count.
     * @example
     * // Count the number of ExtensionLogs
     * const count = await prisma.extensionLog.count({
     *   where: {
     *     // ... the filter for the ExtensionLogs we want to count
     *   }
     * })
    **/
    count<T extends ExtensionLogCountArgs>(
      args?: Subset<T, ExtensionLogCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ExtensionLogCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ExtensionLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExtensionLogAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ExtensionLogAggregateArgs>(args: Subset<T, ExtensionLogAggregateArgs>): Prisma.PrismaPromise<GetExtensionLogAggregateType<T>>

    /**
     * Group by ExtensionLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExtensionLogGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ExtensionLogGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ExtensionLogGroupByArgs['orderBy'] }
        : { orderBy?: ExtensionLogGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ExtensionLogGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetExtensionLogGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ExtensionLog model
   */
  readonly fields: ExtensionLogFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ExtensionLog.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ExtensionLogClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ExtensionLog model
   */ 
  interface ExtensionLogFieldRefs {
    readonly id: FieldRef<"ExtensionLog", 'Int'>
    readonly level: FieldRef<"ExtensionLog", 'String'>
    readonly message: FieldRef<"ExtensionLog", 'String'>
    readonly sessionId: FieldRef<"ExtensionLog", 'String'>
    readonly createdAt: FieldRef<"ExtensionLog", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ExtensionLog findUnique
   */
  export type ExtensionLogFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExtensionLog
     */
    select?: ExtensionLogSelect<ExtArgs> | null
    /**
     * Filter, which ExtensionLog to fetch.
     */
    where: ExtensionLogWhereUniqueInput
  }

  /**
   * ExtensionLog findUniqueOrThrow
   */
  export type ExtensionLogFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExtensionLog
     */
    select?: ExtensionLogSelect<ExtArgs> | null
    /**
     * Filter, which ExtensionLog to fetch.
     */
    where: ExtensionLogWhereUniqueInput
  }

  /**
   * ExtensionLog findFirst
   */
  export type ExtensionLogFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExtensionLog
     */
    select?: ExtensionLogSelect<ExtArgs> | null
    /**
     * Filter, which ExtensionLog to fetch.
     */
    where?: ExtensionLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExtensionLogs to fetch.
     */
    orderBy?: ExtensionLogOrderByWithRelationInput | ExtensionLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ExtensionLogs.
     */
    cursor?: ExtensionLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExtensionLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExtensionLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ExtensionLogs.
     */
    distinct?: ExtensionLogScalarFieldEnum | ExtensionLogScalarFieldEnum[]
  }

  /**
   * ExtensionLog findFirstOrThrow
   */
  export type ExtensionLogFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExtensionLog
     */
    select?: ExtensionLogSelect<ExtArgs> | null
    /**
     * Filter, which ExtensionLog to fetch.
     */
    where?: ExtensionLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExtensionLogs to fetch.
     */
    orderBy?: ExtensionLogOrderByWithRelationInput | ExtensionLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ExtensionLogs.
     */
    cursor?: ExtensionLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExtensionLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExtensionLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ExtensionLogs.
     */
    distinct?: ExtensionLogScalarFieldEnum | ExtensionLogScalarFieldEnum[]
  }

  /**
   * ExtensionLog findMany
   */
  export type ExtensionLogFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExtensionLog
     */
    select?: ExtensionLogSelect<ExtArgs> | null
    /**
     * Filter, which ExtensionLogs to fetch.
     */
    where?: ExtensionLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExtensionLogs to fetch.
     */
    orderBy?: ExtensionLogOrderByWithRelationInput | ExtensionLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ExtensionLogs.
     */
    cursor?: ExtensionLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExtensionLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExtensionLogs.
     */
    skip?: number
    distinct?: ExtensionLogScalarFieldEnum | ExtensionLogScalarFieldEnum[]
  }

  /**
   * ExtensionLog create
   */
  export type ExtensionLogCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExtensionLog
     */
    select?: ExtensionLogSelect<ExtArgs> | null
    /**
     * The data needed to create a ExtensionLog.
     */
    data: XOR<ExtensionLogCreateInput, ExtensionLogUncheckedCreateInput>
  }

  /**
   * ExtensionLog createMany
   */
  export type ExtensionLogCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ExtensionLogs.
     */
    data: ExtensionLogCreateManyInput | ExtensionLogCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ExtensionLog createManyAndReturn
   */
  export type ExtensionLogCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExtensionLog
     */
    select?: ExtensionLogSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ExtensionLogs.
     */
    data: ExtensionLogCreateManyInput | ExtensionLogCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ExtensionLog update
   */
  export type ExtensionLogUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExtensionLog
     */
    select?: ExtensionLogSelect<ExtArgs> | null
    /**
     * The data needed to update a ExtensionLog.
     */
    data: XOR<ExtensionLogUpdateInput, ExtensionLogUncheckedUpdateInput>
    /**
     * Choose, which ExtensionLog to update.
     */
    where: ExtensionLogWhereUniqueInput
  }

  /**
   * ExtensionLog updateMany
   */
  export type ExtensionLogUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ExtensionLogs.
     */
    data: XOR<ExtensionLogUpdateManyMutationInput, ExtensionLogUncheckedUpdateManyInput>
    /**
     * Filter which ExtensionLogs to update
     */
    where?: ExtensionLogWhereInput
  }

  /**
   * ExtensionLog upsert
   */
  export type ExtensionLogUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExtensionLog
     */
    select?: ExtensionLogSelect<ExtArgs> | null
    /**
     * The filter to search for the ExtensionLog to update in case it exists.
     */
    where: ExtensionLogWhereUniqueInput
    /**
     * In case the ExtensionLog found by the `where` argument doesn't exist, create a new ExtensionLog with this data.
     */
    create: XOR<ExtensionLogCreateInput, ExtensionLogUncheckedCreateInput>
    /**
     * In case the ExtensionLog was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ExtensionLogUpdateInput, ExtensionLogUncheckedUpdateInput>
  }

  /**
   * ExtensionLog delete
   */
  export type ExtensionLogDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExtensionLog
     */
    select?: ExtensionLogSelect<ExtArgs> | null
    /**
     * Filter which ExtensionLog to delete.
     */
    where: ExtensionLogWhereUniqueInput
  }

  /**
   * ExtensionLog deleteMany
   */
  export type ExtensionLogDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ExtensionLogs to delete
     */
    where?: ExtensionLogWhereInput
  }

  /**
   * ExtensionLog without action
   */
  export type ExtensionLogDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExtensionLog
     */
    select?: ExtensionLogSelect<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    username: 'username',
    name: 'name',
    passwordHash: 'passwordHash',
    role: 'role',
    active: 'active',
    sessionVersion: 'sessionVersion',
    lastLoginAt: 'lastLoginAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const ScrapedJobScalarFieldEnum: {
    id: 'id',
    platform: 'platform',
    title: 'title',
    company: 'company',
    location: 'location',
    url: 'url',
    manualApplyUrl: 'manualApplyUrl',
    applyMethod: 'applyMethod',
    description: 'description',
    salary: 'salary',
    techStack: 'techStack',
    status: 'status',
    aiScore: 'aiScore',
    aiReason: 'aiReason',
    sheetSynced: 'sheetSynced',
    createdAt: 'createdAt',
    stage: 'stage',
    stageUpdatedAt: 'stageUpdatedAt',
    appliedAt: 'appliedAt',
    followUpAt: 'followUpAt',
    notes: 'notes',
    resumeId: 'resumeId',
    applicationData: 'applicationData',
    feedback: 'feedback',
    feedbackAt: 'feedbackAt',
    eligibility: 'eligibility',
    signals: 'signals'
  };

  export type ScrapedJobScalarFieldEnum = (typeof ScrapedJobScalarFieldEnum)[keyof typeof ScrapedJobScalarFieldEnum]


  export const AppConfigScalarFieldEnum: {
    key: 'key',
    value: 'value',
    updatedAt: 'updatedAt'
  };

  export type AppConfigScalarFieldEnum = (typeof AppConfigScalarFieldEnum)[keyof typeof AppConfigScalarFieldEnum]


  export const SkipRuleScalarFieldEnum: {
    id: 'id',
    type: 'type',
    pattern: 'pattern',
    active: 'active',
    createdAt: 'createdAt'
  };

  export type SkipRuleScalarFieldEnum = (typeof SkipRuleScalarFieldEnum)[keyof typeof SkipRuleScalarFieldEnum]


  export const ScanLogScalarFieldEnum: {
    id: 'id',
    board: 'board',
    jobsFound: 'jobsFound',
    jobsSaved: 'jobsSaved',
    errors: 'errors',
    durationMs: 'durationMs',
    createdAt: 'createdAt'
  };

  export type ScanLogScalarFieldEnum = (typeof ScanLogScalarFieldEnum)[keyof typeof ScanLogScalarFieldEnum]


  export const AnalysisLogScalarFieldEnum: {
    id: 'id',
    scrapedJobId: 'scrapedJobId',
    model: 'model',
    approved: 'approved',
    score: 'score',
    reason: 'reason',
    tokensUsed: 'tokensUsed',
    durationMs: 'durationMs',
    createdAt: 'createdAt'
  };

  export type AnalysisLogScalarFieldEnum = (typeof AnalysisLogScalarFieldEnum)[keyof typeof AnalysisLogScalarFieldEnum]


  export const ResumeScalarFieldEnum: {
    id: 'id',
    name: 'name',
    fileName: 'fileName',
    mimeType: 'mimeType',
    sizeBytes: 'sizeBytes',
    data: 'data',
    textContent: 'textContent',
    parsed: 'parsed',
    tags: 'tags',
    isDefault: 'isDefault',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ResumeScalarFieldEnum = (typeof ResumeScalarFieldEnum)[keyof typeof ResumeScalarFieldEnum]


  export const SavedAnswerScalarFieldEnum: {
    id: 'id',
    question: 'question',
    answer: 'answer',
    tags: 'tags',
    uses: 'uses',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type SavedAnswerScalarFieldEnum = (typeof SavedAnswerScalarFieldEnum)[keyof typeof SavedAnswerScalarFieldEnum]


  export const AiUsageScalarFieldEnum: {
    id: 'id',
    task: 'task',
    provider: 'provider',
    model: 'model',
    ok: 'ok',
    inputTokens: 'inputTokens',
    outputTokens: 'outputTokens',
    cacheReadTokens: 'cacheReadTokens',
    cacheWriteTokens: 'cacheWriteTokens',
    costUsd: 'costUsd',
    durationMs: 'durationMs',
    error: 'error',
    createdAt: 'createdAt'
  };

  export type AiUsageScalarFieldEnum = (typeof AiUsageScalarFieldEnum)[keyof typeof AiUsageScalarFieldEnum]


  export const ExtensionLogScalarFieldEnum: {
    id: 'id',
    level: 'level',
    message: 'message',
    sessionId: 'sessionId',
    createdAt: 'createdAt'
  };

  export type ExtensionLogScalarFieldEnum = (typeof ExtensionLogScalarFieldEnum)[keyof typeof ExtensionLogScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'JobStatus'
   */
  export type EnumJobStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'JobStatus'>
    


  /**
   * Reference to a field of type 'JobStatus[]'
   */
  export type ListEnumJobStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'JobStatus[]'>
    


  /**
   * Reference to a field of type 'SkipRuleType'
   */
  export type EnumSkipRuleTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SkipRuleType'>
    


  /**
   * Reference to a field of type 'SkipRuleType[]'
   */
  export type ListEnumSkipRuleTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SkipRuleType[]'>
    


  /**
   * Reference to a field of type 'Bytes'
   */
  export type BytesFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Bytes'>
    


  /**
   * Reference to a field of type 'Bytes[]'
   */
  export type ListBytesFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Bytes[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: IntFilter<"User"> | number
    username?: StringFilter<"User"> | string
    name?: StringFilter<"User"> | string
    passwordHash?: StringFilter<"User"> | string
    role?: StringFilter<"User"> | string
    active?: BoolFilter<"User"> | boolean
    sessionVersion?: IntFilter<"User"> | number
    lastLoginAt?: DateTimeNullableFilter<"User"> | Date | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    username?: SortOrder
    name?: SortOrder
    passwordHash?: SortOrder
    role?: SortOrder
    active?: SortOrder
    sessionVersion?: SortOrder
    lastLoginAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    username?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    name?: StringFilter<"User"> | string
    passwordHash?: StringFilter<"User"> | string
    role?: StringFilter<"User"> | string
    active?: BoolFilter<"User"> | boolean
    sessionVersion?: IntFilter<"User"> | number
    lastLoginAt?: DateTimeNullableFilter<"User"> | Date | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
  }, "id" | "username">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    username?: SortOrder
    name?: SortOrder
    passwordHash?: SortOrder
    role?: SortOrder
    active?: SortOrder
    sessionVersion?: SortOrder
    lastLoginAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _avg?: UserAvgOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
    _sum?: UserSumOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"User"> | number
    username?: StringWithAggregatesFilter<"User"> | string
    name?: StringWithAggregatesFilter<"User"> | string
    passwordHash?: StringWithAggregatesFilter<"User"> | string
    role?: StringWithAggregatesFilter<"User"> | string
    active?: BoolWithAggregatesFilter<"User"> | boolean
    sessionVersion?: IntWithAggregatesFilter<"User"> | number
    lastLoginAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type ScrapedJobWhereInput = {
    AND?: ScrapedJobWhereInput | ScrapedJobWhereInput[]
    OR?: ScrapedJobWhereInput[]
    NOT?: ScrapedJobWhereInput | ScrapedJobWhereInput[]
    id?: IntFilter<"ScrapedJob"> | number
    platform?: StringFilter<"ScrapedJob"> | string
    title?: StringFilter<"ScrapedJob"> | string
    company?: StringFilter<"ScrapedJob"> | string
    location?: StringNullableFilter<"ScrapedJob"> | string | null
    url?: StringFilter<"ScrapedJob"> | string
    manualApplyUrl?: StringNullableFilter<"ScrapedJob"> | string | null
    applyMethod?: StringNullableFilter<"ScrapedJob"> | string | null
    description?: StringNullableFilter<"ScrapedJob"> | string | null
    salary?: StringNullableFilter<"ScrapedJob"> | string | null
    techStack?: StringNullableFilter<"ScrapedJob"> | string | null
    status?: EnumJobStatusFilter<"ScrapedJob"> | $Enums.JobStatus
    aiScore?: IntNullableFilter<"ScrapedJob"> | number | null
    aiReason?: StringNullableFilter<"ScrapedJob"> | string | null
    sheetSynced?: BoolFilter<"ScrapedJob"> | boolean
    createdAt?: DateTimeFilter<"ScrapedJob"> | Date | string
    stage?: StringNullableFilter<"ScrapedJob"> | string | null
    stageUpdatedAt?: DateTimeNullableFilter<"ScrapedJob"> | Date | string | null
    appliedAt?: DateTimeNullableFilter<"ScrapedJob"> | Date | string | null
    followUpAt?: DateTimeNullableFilter<"ScrapedJob"> | Date | string | null
    notes?: StringNullableFilter<"ScrapedJob"> | string | null
    resumeId?: IntNullableFilter<"ScrapedJob"> | number | null
    applicationData?: StringNullableFilter<"ScrapedJob"> | string | null
    feedback?: IntNullableFilter<"ScrapedJob"> | number | null
    feedbackAt?: DateTimeNullableFilter<"ScrapedJob"> | Date | string | null
    eligibility?: StringNullableFilter<"ScrapedJob"> | string | null
    signals?: StringNullableFilter<"ScrapedJob"> | string | null
    analysisLogs?: AnalysisLogListRelationFilter
  }

  export type ScrapedJobOrderByWithRelationInput = {
    id?: SortOrder
    platform?: SortOrder
    title?: SortOrder
    company?: SortOrder
    location?: SortOrderInput | SortOrder
    url?: SortOrder
    manualApplyUrl?: SortOrderInput | SortOrder
    applyMethod?: SortOrderInput | SortOrder
    description?: SortOrderInput | SortOrder
    salary?: SortOrderInput | SortOrder
    techStack?: SortOrderInput | SortOrder
    status?: SortOrder
    aiScore?: SortOrderInput | SortOrder
    aiReason?: SortOrderInput | SortOrder
    sheetSynced?: SortOrder
    createdAt?: SortOrder
    stage?: SortOrderInput | SortOrder
    stageUpdatedAt?: SortOrderInput | SortOrder
    appliedAt?: SortOrderInput | SortOrder
    followUpAt?: SortOrderInput | SortOrder
    notes?: SortOrderInput | SortOrder
    resumeId?: SortOrderInput | SortOrder
    applicationData?: SortOrderInput | SortOrder
    feedback?: SortOrderInput | SortOrder
    feedbackAt?: SortOrderInput | SortOrder
    eligibility?: SortOrderInput | SortOrder
    signals?: SortOrderInput | SortOrder
    analysisLogs?: AnalysisLogOrderByRelationAggregateInput
  }

  export type ScrapedJobWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    platform_url?: ScrapedJobPlatformUrlCompoundUniqueInput
    platform_title_company?: ScrapedJobPlatformTitleCompanyCompoundUniqueInput
    AND?: ScrapedJobWhereInput | ScrapedJobWhereInput[]
    OR?: ScrapedJobWhereInput[]
    NOT?: ScrapedJobWhereInput | ScrapedJobWhereInput[]
    platform?: StringFilter<"ScrapedJob"> | string
    title?: StringFilter<"ScrapedJob"> | string
    company?: StringFilter<"ScrapedJob"> | string
    location?: StringNullableFilter<"ScrapedJob"> | string | null
    url?: StringFilter<"ScrapedJob"> | string
    manualApplyUrl?: StringNullableFilter<"ScrapedJob"> | string | null
    applyMethod?: StringNullableFilter<"ScrapedJob"> | string | null
    description?: StringNullableFilter<"ScrapedJob"> | string | null
    salary?: StringNullableFilter<"ScrapedJob"> | string | null
    techStack?: StringNullableFilter<"ScrapedJob"> | string | null
    status?: EnumJobStatusFilter<"ScrapedJob"> | $Enums.JobStatus
    aiScore?: IntNullableFilter<"ScrapedJob"> | number | null
    aiReason?: StringNullableFilter<"ScrapedJob"> | string | null
    sheetSynced?: BoolFilter<"ScrapedJob"> | boolean
    createdAt?: DateTimeFilter<"ScrapedJob"> | Date | string
    stage?: StringNullableFilter<"ScrapedJob"> | string | null
    stageUpdatedAt?: DateTimeNullableFilter<"ScrapedJob"> | Date | string | null
    appliedAt?: DateTimeNullableFilter<"ScrapedJob"> | Date | string | null
    followUpAt?: DateTimeNullableFilter<"ScrapedJob"> | Date | string | null
    notes?: StringNullableFilter<"ScrapedJob"> | string | null
    resumeId?: IntNullableFilter<"ScrapedJob"> | number | null
    applicationData?: StringNullableFilter<"ScrapedJob"> | string | null
    feedback?: IntNullableFilter<"ScrapedJob"> | number | null
    feedbackAt?: DateTimeNullableFilter<"ScrapedJob"> | Date | string | null
    eligibility?: StringNullableFilter<"ScrapedJob"> | string | null
    signals?: StringNullableFilter<"ScrapedJob"> | string | null
    analysisLogs?: AnalysisLogListRelationFilter
  }, "id" | "platform_url" | "platform_title_company">

  export type ScrapedJobOrderByWithAggregationInput = {
    id?: SortOrder
    platform?: SortOrder
    title?: SortOrder
    company?: SortOrder
    location?: SortOrderInput | SortOrder
    url?: SortOrder
    manualApplyUrl?: SortOrderInput | SortOrder
    applyMethod?: SortOrderInput | SortOrder
    description?: SortOrderInput | SortOrder
    salary?: SortOrderInput | SortOrder
    techStack?: SortOrderInput | SortOrder
    status?: SortOrder
    aiScore?: SortOrderInput | SortOrder
    aiReason?: SortOrderInput | SortOrder
    sheetSynced?: SortOrder
    createdAt?: SortOrder
    stage?: SortOrderInput | SortOrder
    stageUpdatedAt?: SortOrderInput | SortOrder
    appliedAt?: SortOrderInput | SortOrder
    followUpAt?: SortOrderInput | SortOrder
    notes?: SortOrderInput | SortOrder
    resumeId?: SortOrderInput | SortOrder
    applicationData?: SortOrderInput | SortOrder
    feedback?: SortOrderInput | SortOrder
    feedbackAt?: SortOrderInput | SortOrder
    eligibility?: SortOrderInput | SortOrder
    signals?: SortOrderInput | SortOrder
    _count?: ScrapedJobCountOrderByAggregateInput
    _avg?: ScrapedJobAvgOrderByAggregateInput
    _max?: ScrapedJobMaxOrderByAggregateInput
    _min?: ScrapedJobMinOrderByAggregateInput
    _sum?: ScrapedJobSumOrderByAggregateInput
  }

  export type ScrapedJobScalarWhereWithAggregatesInput = {
    AND?: ScrapedJobScalarWhereWithAggregatesInput | ScrapedJobScalarWhereWithAggregatesInput[]
    OR?: ScrapedJobScalarWhereWithAggregatesInput[]
    NOT?: ScrapedJobScalarWhereWithAggregatesInput | ScrapedJobScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"ScrapedJob"> | number
    platform?: StringWithAggregatesFilter<"ScrapedJob"> | string
    title?: StringWithAggregatesFilter<"ScrapedJob"> | string
    company?: StringWithAggregatesFilter<"ScrapedJob"> | string
    location?: StringNullableWithAggregatesFilter<"ScrapedJob"> | string | null
    url?: StringWithAggregatesFilter<"ScrapedJob"> | string
    manualApplyUrl?: StringNullableWithAggregatesFilter<"ScrapedJob"> | string | null
    applyMethod?: StringNullableWithAggregatesFilter<"ScrapedJob"> | string | null
    description?: StringNullableWithAggregatesFilter<"ScrapedJob"> | string | null
    salary?: StringNullableWithAggregatesFilter<"ScrapedJob"> | string | null
    techStack?: StringNullableWithAggregatesFilter<"ScrapedJob"> | string | null
    status?: EnumJobStatusWithAggregatesFilter<"ScrapedJob"> | $Enums.JobStatus
    aiScore?: IntNullableWithAggregatesFilter<"ScrapedJob"> | number | null
    aiReason?: StringNullableWithAggregatesFilter<"ScrapedJob"> | string | null
    sheetSynced?: BoolWithAggregatesFilter<"ScrapedJob"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"ScrapedJob"> | Date | string
    stage?: StringNullableWithAggregatesFilter<"ScrapedJob"> | string | null
    stageUpdatedAt?: DateTimeNullableWithAggregatesFilter<"ScrapedJob"> | Date | string | null
    appliedAt?: DateTimeNullableWithAggregatesFilter<"ScrapedJob"> | Date | string | null
    followUpAt?: DateTimeNullableWithAggregatesFilter<"ScrapedJob"> | Date | string | null
    notes?: StringNullableWithAggregatesFilter<"ScrapedJob"> | string | null
    resumeId?: IntNullableWithAggregatesFilter<"ScrapedJob"> | number | null
    applicationData?: StringNullableWithAggregatesFilter<"ScrapedJob"> | string | null
    feedback?: IntNullableWithAggregatesFilter<"ScrapedJob"> | number | null
    feedbackAt?: DateTimeNullableWithAggregatesFilter<"ScrapedJob"> | Date | string | null
    eligibility?: StringNullableWithAggregatesFilter<"ScrapedJob"> | string | null
    signals?: StringNullableWithAggregatesFilter<"ScrapedJob"> | string | null
  }

  export type AppConfigWhereInput = {
    AND?: AppConfigWhereInput | AppConfigWhereInput[]
    OR?: AppConfigWhereInput[]
    NOT?: AppConfigWhereInput | AppConfigWhereInput[]
    key?: StringFilter<"AppConfig"> | string
    value?: StringFilter<"AppConfig"> | string
    updatedAt?: DateTimeFilter<"AppConfig"> | Date | string
  }

  export type AppConfigOrderByWithRelationInput = {
    key?: SortOrder
    value?: SortOrder
    updatedAt?: SortOrder
  }

  export type AppConfigWhereUniqueInput = Prisma.AtLeast<{
    key?: string
    AND?: AppConfigWhereInput | AppConfigWhereInput[]
    OR?: AppConfigWhereInput[]
    NOT?: AppConfigWhereInput | AppConfigWhereInput[]
    value?: StringFilter<"AppConfig"> | string
    updatedAt?: DateTimeFilter<"AppConfig"> | Date | string
  }, "key">

  export type AppConfigOrderByWithAggregationInput = {
    key?: SortOrder
    value?: SortOrder
    updatedAt?: SortOrder
    _count?: AppConfigCountOrderByAggregateInput
    _max?: AppConfigMaxOrderByAggregateInput
    _min?: AppConfigMinOrderByAggregateInput
  }

  export type AppConfigScalarWhereWithAggregatesInput = {
    AND?: AppConfigScalarWhereWithAggregatesInput | AppConfigScalarWhereWithAggregatesInput[]
    OR?: AppConfigScalarWhereWithAggregatesInput[]
    NOT?: AppConfigScalarWhereWithAggregatesInput | AppConfigScalarWhereWithAggregatesInput[]
    key?: StringWithAggregatesFilter<"AppConfig"> | string
    value?: StringWithAggregatesFilter<"AppConfig"> | string
    updatedAt?: DateTimeWithAggregatesFilter<"AppConfig"> | Date | string
  }

  export type SkipRuleWhereInput = {
    AND?: SkipRuleWhereInput | SkipRuleWhereInput[]
    OR?: SkipRuleWhereInput[]
    NOT?: SkipRuleWhereInput | SkipRuleWhereInput[]
    id?: IntFilter<"SkipRule"> | number
    type?: EnumSkipRuleTypeFilter<"SkipRule"> | $Enums.SkipRuleType
    pattern?: StringFilter<"SkipRule"> | string
    active?: BoolFilter<"SkipRule"> | boolean
    createdAt?: DateTimeFilter<"SkipRule"> | Date | string
  }

  export type SkipRuleOrderByWithRelationInput = {
    id?: SortOrder
    type?: SortOrder
    pattern?: SortOrder
    active?: SortOrder
    createdAt?: SortOrder
  }

  export type SkipRuleWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: SkipRuleWhereInput | SkipRuleWhereInput[]
    OR?: SkipRuleWhereInput[]
    NOT?: SkipRuleWhereInput | SkipRuleWhereInput[]
    type?: EnumSkipRuleTypeFilter<"SkipRule"> | $Enums.SkipRuleType
    pattern?: StringFilter<"SkipRule"> | string
    active?: BoolFilter<"SkipRule"> | boolean
    createdAt?: DateTimeFilter<"SkipRule"> | Date | string
  }, "id">

  export type SkipRuleOrderByWithAggregationInput = {
    id?: SortOrder
    type?: SortOrder
    pattern?: SortOrder
    active?: SortOrder
    createdAt?: SortOrder
    _count?: SkipRuleCountOrderByAggregateInput
    _avg?: SkipRuleAvgOrderByAggregateInput
    _max?: SkipRuleMaxOrderByAggregateInput
    _min?: SkipRuleMinOrderByAggregateInput
    _sum?: SkipRuleSumOrderByAggregateInput
  }

  export type SkipRuleScalarWhereWithAggregatesInput = {
    AND?: SkipRuleScalarWhereWithAggregatesInput | SkipRuleScalarWhereWithAggregatesInput[]
    OR?: SkipRuleScalarWhereWithAggregatesInput[]
    NOT?: SkipRuleScalarWhereWithAggregatesInput | SkipRuleScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"SkipRule"> | number
    type?: EnumSkipRuleTypeWithAggregatesFilter<"SkipRule"> | $Enums.SkipRuleType
    pattern?: StringWithAggregatesFilter<"SkipRule"> | string
    active?: BoolWithAggregatesFilter<"SkipRule"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"SkipRule"> | Date | string
  }

  export type ScanLogWhereInput = {
    AND?: ScanLogWhereInput | ScanLogWhereInput[]
    OR?: ScanLogWhereInput[]
    NOT?: ScanLogWhereInput | ScanLogWhereInput[]
    id?: IntFilter<"ScanLog"> | number
    board?: StringFilter<"ScanLog"> | string
    jobsFound?: IntFilter<"ScanLog"> | number
    jobsSaved?: IntFilter<"ScanLog"> | number
    errors?: StringNullableFilter<"ScanLog"> | string | null
    durationMs?: IntNullableFilter<"ScanLog"> | number | null
    createdAt?: DateTimeFilter<"ScanLog"> | Date | string
  }

  export type ScanLogOrderByWithRelationInput = {
    id?: SortOrder
    board?: SortOrder
    jobsFound?: SortOrder
    jobsSaved?: SortOrder
    errors?: SortOrderInput | SortOrder
    durationMs?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type ScanLogWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: ScanLogWhereInput | ScanLogWhereInput[]
    OR?: ScanLogWhereInput[]
    NOT?: ScanLogWhereInput | ScanLogWhereInput[]
    board?: StringFilter<"ScanLog"> | string
    jobsFound?: IntFilter<"ScanLog"> | number
    jobsSaved?: IntFilter<"ScanLog"> | number
    errors?: StringNullableFilter<"ScanLog"> | string | null
    durationMs?: IntNullableFilter<"ScanLog"> | number | null
    createdAt?: DateTimeFilter<"ScanLog"> | Date | string
  }, "id">

  export type ScanLogOrderByWithAggregationInput = {
    id?: SortOrder
    board?: SortOrder
    jobsFound?: SortOrder
    jobsSaved?: SortOrder
    errors?: SortOrderInput | SortOrder
    durationMs?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: ScanLogCountOrderByAggregateInput
    _avg?: ScanLogAvgOrderByAggregateInput
    _max?: ScanLogMaxOrderByAggregateInput
    _min?: ScanLogMinOrderByAggregateInput
    _sum?: ScanLogSumOrderByAggregateInput
  }

  export type ScanLogScalarWhereWithAggregatesInput = {
    AND?: ScanLogScalarWhereWithAggregatesInput | ScanLogScalarWhereWithAggregatesInput[]
    OR?: ScanLogScalarWhereWithAggregatesInput[]
    NOT?: ScanLogScalarWhereWithAggregatesInput | ScanLogScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"ScanLog"> | number
    board?: StringWithAggregatesFilter<"ScanLog"> | string
    jobsFound?: IntWithAggregatesFilter<"ScanLog"> | number
    jobsSaved?: IntWithAggregatesFilter<"ScanLog"> | number
    errors?: StringNullableWithAggregatesFilter<"ScanLog"> | string | null
    durationMs?: IntNullableWithAggregatesFilter<"ScanLog"> | number | null
    createdAt?: DateTimeWithAggregatesFilter<"ScanLog"> | Date | string
  }

  export type AnalysisLogWhereInput = {
    AND?: AnalysisLogWhereInput | AnalysisLogWhereInput[]
    OR?: AnalysisLogWhereInput[]
    NOT?: AnalysisLogWhereInput | AnalysisLogWhereInput[]
    id?: IntFilter<"AnalysisLog"> | number
    scrapedJobId?: IntFilter<"AnalysisLog"> | number
    model?: StringFilter<"AnalysisLog"> | string
    approved?: BoolFilter<"AnalysisLog"> | boolean
    score?: IntNullableFilter<"AnalysisLog"> | number | null
    reason?: StringNullableFilter<"AnalysisLog"> | string | null
    tokensUsed?: IntNullableFilter<"AnalysisLog"> | number | null
    durationMs?: IntNullableFilter<"AnalysisLog"> | number | null
    createdAt?: DateTimeFilter<"AnalysisLog"> | Date | string
    scrapedJob?: XOR<ScrapedJobRelationFilter, ScrapedJobWhereInput>
  }

  export type AnalysisLogOrderByWithRelationInput = {
    id?: SortOrder
    scrapedJobId?: SortOrder
    model?: SortOrder
    approved?: SortOrder
    score?: SortOrderInput | SortOrder
    reason?: SortOrderInput | SortOrder
    tokensUsed?: SortOrderInput | SortOrder
    durationMs?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    scrapedJob?: ScrapedJobOrderByWithRelationInput
  }

  export type AnalysisLogWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: AnalysisLogWhereInput | AnalysisLogWhereInput[]
    OR?: AnalysisLogWhereInput[]
    NOT?: AnalysisLogWhereInput | AnalysisLogWhereInput[]
    scrapedJobId?: IntFilter<"AnalysisLog"> | number
    model?: StringFilter<"AnalysisLog"> | string
    approved?: BoolFilter<"AnalysisLog"> | boolean
    score?: IntNullableFilter<"AnalysisLog"> | number | null
    reason?: StringNullableFilter<"AnalysisLog"> | string | null
    tokensUsed?: IntNullableFilter<"AnalysisLog"> | number | null
    durationMs?: IntNullableFilter<"AnalysisLog"> | number | null
    createdAt?: DateTimeFilter<"AnalysisLog"> | Date | string
    scrapedJob?: XOR<ScrapedJobRelationFilter, ScrapedJobWhereInput>
  }, "id">

  export type AnalysisLogOrderByWithAggregationInput = {
    id?: SortOrder
    scrapedJobId?: SortOrder
    model?: SortOrder
    approved?: SortOrder
    score?: SortOrderInput | SortOrder
    reason?: SortOrderInput | SortOrder
    tokensUsed?: SortOrderInput | SortOrder
    durationMs?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: AnalysisLogCountOrderByAggregateInput
    _avg?: AnalysisLogAvgOrderByAggregateInput
    _max?: AnalysisLogMaxOrderByAggregateInput
    _min?: AnalysisLogMinOrderByAggregateInput
    _sum?: AnalysisLogSumOrderByAggregateInput
  }

  export type AnalysisLogScalarWhereWithAggregatesInput = {
    AND?: AnalysisLogScalarWhereWithAggregatesInput | AnalysisLogScalarWhereWithAggregatesInput[]
    OR?: AnalysisLogScalarWhereWithAggregatesInput[]
    NOT?: AnalysisLogScalarWhereWithAggregatesInput | AnalysisLogScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"AnalysisLog"> | number
    scrapedJobId?: IntWithAggregatesFilter<"AnalysisLog"> | number
    model?: StringWithAggregatesFilter<"AnalysisLog"> | string
    approved?: BoolWithAggregatesFilter<"AnalysisLog"> | boolean
    score?: IntNullableWithAggregatesFilter<"AnalysisLog"> | number | null
    reason?: StringNullableWithAggregatesFilter<"AnalysisLog"> | string | null
    tokensUsed?: IntNullableWithAggregatesFilter<"AnalysisLog"> | number | null
    durationMs?: IntNullableWithAggregatesFilter<"AnalysisLog"> | number | null
    createdAt?: DateTimeWithAggregatesFilter<"AnalysisLog"> | Date | string
  }

  export type ResumeWhereInput = {
    AND?: ResumeWhereInput | ResumeWhereInput[]
    OR?: ResumeWhereInput[]
    NOT?: ResumeWhereInput | ResumeWhereInput[]
    id?: IntFilter<"Resume"> | number
    name?: StringFilter<"Resume"> | string
    fileName?: StringFilter<"Resume"> | string
    mimeType?: StringFilter<"Resume"> | string
    sizeBytes?: IntFilter<"Resume"> | number
    data?: BytesFilter<"Resume"> | Buffer
    textContent?: StringNullableFilter<"Resume"> | string | null
    parsed?: StringNullableFilter<"Resume"> | string | null
    tags?: StringNullableFilter<"Resume"> | string | null
    isDefault?: BoolFilter<"Resume"> | boolean
    createdAt?: DateTimeFilter<"Resume"> | Date | string
    updatedAt?: DateTimeFilter<"Resume"> | Date | string
  }

  export type ResumeOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    fileName?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    data?: SortOrder
    textContent?: SortOrderInput | SortOrder
    parsed?: SortOrderInput | SortOrder
    tags?: SortOrderInput | SortOrder
    isDefault?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ResumeWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: ResumeWhereInput | ResumeWhereInput[]
    OR?: ResumeWhereInput[]
    NOT?: ResumeWhereInput | ResumeWhereInput[]
    name?: StringFilter<"Resume"> | string
    fileName?: StringFilter<"Resume"> | string
    mimeType?: StringFilter<"Resume"> | string
    sizeBytes?: IntFilter<"Resume"> | number
    data?: BytesFilter<"Resume"> | Buffer
    textContent?: StringNullableFilter<"Resume"> | string | null
    parsed?: StringNullableFilter<"Resume"> | string | null
    tags?: StringNullableFilter<"Resume"> | string | null
    isDefault?: BoolFilter<"Resume"> | boolean
    createdAt?: DateTimeFilter<"Resume"> | Date | string
    updatedAt?: DateTimeFilter<"Resume"> | Date | string
  }, "id">

  export type ResumeOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    fileName?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    data?: SortOrder
    textContent?: SortOrderInput | SortOrder
    parsed?: SortOrderInput | SortOrder
    tags?: SortOrderInput | SortOrder
    isDefault?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ResumeCountOrderByAggregateInput
    _avg?: ResumeAvgOrderByAggregateInput
    _max?: ResumeMaxOrderByAggregateInput
    _min?: ResumeMinOrderByAggregateInput
    _sum?: ResumeSumOrderByAggregateInput
  }

  export type ResumeScalarWhereWithAggregatesInput = {
    AND?: ResumeScalarWhereWithAggregatesInput | ResumeScalarWhereWithAggregatesInput[]
    OR?: ResumeScalarWhereWithAggregatesInput[]
    NOT?: ResumeScalarWhereWithAggregatesInput | ResumeScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Resume"> | number
    name?: StringWithAggregatesFilter<"Resume"> | string
    fileName?: StringWithAggregatesFilter<"Resume"> | string
    mimeType?: StringWithAggregatesFilter<"Resume"> | string
    sizeBytes?: IntWithAggregatesFilter<"Resume"> | number
    data?: BytesWithAggregatesFilter<"Resume"> | Buffer
    textContent?: StringNullableWithAggregatesFilter<"Resume"> | string | null
    parsed?: StringNullableWithAggregatesFilter<"Resume"> | string | null
    tags?: StringNullableWithAggregatesFilter<"Resume"> | string | null
    isDefault?: BoolWithAggregatesFilter<"Resume"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"Resume"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Resume"> | Date | string
  }

  export type SavedAnswerWhereInput = {
    AND?: SavedAnswerWhereInput | SavedAnswerWhereInput[]
    OR?: SavedAnswerWhereInput[]
    NOT?: SavedAnswerWhereInput | SavedAnswerWhereInput[]
    id?: IntFilter<"SavedAnswer"> | number
    question?: StringFilter<"SavedAnswer"> | string
    answer?: StringFilter<"SavedAnswer"> | string
    tags?: StringNullableFilter<"SavedAnswer"> | string | null
    uses?: IntFilter<"SavedAnswer"> | number
    createdAt?: DateTimeFilter<"SavedAnswer"> | Date | string
    updatedAt?: DateTimeFilter<"SavedAnswer"> | Date | string
  }

  export type SavedAnswerOrderByWithRelationInput = {
    id?: SortOrder
    question?: SortOrder
    answer?: SortOrder
    tags?: SortOrderInput | SortOrder
    uses?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SavedAnswerWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: SavedAnswerWhereInput | SavedAnswerWhereInput[]
    OR?: SavedAnswerWhereInput[]
    NOT?: SavedAnswerWhereInput | SavedAnswerWhereInput[]
    question?: StringFilter<"SavedAnswer"> | string
    answer?: StringFilter<"SavedAnswer"> | string
    tags?: StringNullableFilter<"SavedAnswer"> | string | null
    uses?: IntFilter<"SavedAnswer"> | number
    createdAt?: DateTimeFilter<"SavedAnswer"> | Date | string
    updatedAt?: DateTimeFilter<"SavedAnswer"> | Date | string
  }, "id">

  export type SavedAnswerOrderByWithAggregationInput = {
    id?: SortOrder
    question?: SortOrder
    answer?: SortOrder
    tags?: SortOrderInput | SortOrder
    uses?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: SavedAnswerCountOrderByAggregateInput
    _avg?: SavedAnswerAvgOrderByAggregateInput
    _max?: SavedAnswerMaxOrderByAggregateInput
    _min?: SavedAnswerMinOrderByAggregateInput
    _sum?: SavedAnswerSumOrderByAggregateInput
  }

  export type SavedAnswerScalarWhereWithAggregatesInput = {
    AND?: SavedAnswerScalarWhereWithAggregatesInput | SavedAnswerScalarWhereWithAggregatesInput[]
    OR?: SavedAnswerScalarWhereWithAggregatesInput[]
    NOT?: SavedAnswerScalarWhereWithAggregatesInput | SavedAnswerScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"SavedAnswer"> | number
    question?: StringWithAggregatesFilter<"SavedAnswer"> | string
    answer?: StringWithAggregatesFilter<"SavedAnswer"> | string
    tags?: StringNullableWithAggregatesFilter<"SavedAnswer"> | string | null
    uses?: IntWithAggregatesFilter<"SavedAnswer"> | number
    createdAt?: DateTimeWithAggregatesFilter<"SavedAnswer"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"SavedAnswer"> | Date | string
  }

  export type AiUsageWhereInput = {
    AND?: AiUsageWhereInput | AiUsageWhereInput[]
    OR?: AiUsageWhereInput[]
    NOT?: AiUsageWhereInput | AiUsageWhereInput[]
    id?: IntFilter<"AiUsage"> | number
    task?: StringFilter<"AiUsage"> | string
    provider?: StringFilter<"AiUsage"> | string
    model?: StringFilter<"AiUsage"> | string
    ok?: BoolFilter<"AiUsage"> | boolean
    inputTokens?: IntFilter<"AiUsage"> | number
    outputTokens?: IntFilter<"AiUsage"> | number
    cacheReadTokens?: IntFilter<"AiUsage"> | number
    cacheWriteTokens?: IntFilter<"AiUsage"> | number
    costUsd?: FloatFilter<"AiUsage"> | number
    durationMs?: IntNullableFilter<"AiUsage"> | number | null
    error?: StringNullableFilter<"AiUsage"> | string | null
    createdAt?: DateTimeFilter<"AiUsage"> | Date | string
  }

  export type AiUsageOrderByWithRelationInput = {
    id?: SortOrder
    task?: SortOrder
    provider?: SortOrder
    model?: SortOrder
    ok?: SortOrder
    inputTokens?: SortOrder
    outputTokens?: SortOrder
    cacheReadTokens?: SortOrder
    cacheWriteTokens?: SortOrder
    costUsd?: SortOrder
    durationMs?: SortOrderInput | SortOrder
    error?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type AiUsageWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: AiUsageWhereInput | AiUsageWhereInput[]
    OR?: AiUsageWhereInput[]
    NOT?: AiUsageWhereInput | AiUsageWhereInput[]
    task?: StringFilter<"AiUsage"> | string
    provider?: StringFilter<"AiUsage"> | string
    model?: StringFilter<"AiUsage"> | string
    ok?: BoolFilter<"AiUsage"> | boolean
    inputTokens?: IntFilter<"AiUsage"> | number
    outputTokens?: IntFilter<"AiUsage"> | number
    cacheReadTokens?: IntFilter<"AiUsage"> | number
    cacheWriteTokens?: IntFilter<"AiUsage"> | number
    costUsd?: FloatFilter<"AiUsage"> | number
    durationMs?: IntNullableFilter<"AiUsage"> | number | null
    error?: StringNullableFilter<"AiUsage"> | string | null
    createdAt?: DateTimeFilter<"AiUsage"> | Date | string
  }, "id">

  export type AiUsageOrderByWithAggregationInput = {
    id?: SortOrder
    task?: SortOrder
    provider?: SortOrder
    model?: SortOrder
    ok?: SortOrder
    inputTokens?: SortOrder
    outputTokens?: SortOrder
    cacheReadTokens?: SortOrder
    cacheWriteTokens?: SortOrder
    costUsd?: SortOrder
    durationMs?: SortOrderInput | SortOrder
    error?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: AiUsageCountOrderByAggregateInput
    _avg?: AiUsageAvgOrderByAggregateInput
    _max?: AiUsageMaxOrderByAggregateInput
    _min?: AiUsageMinOrderByAggregateInput
    _sum?: AiUsageSumOrderByAggregateInput
  }

  export type AiUsageScalarWhereWithAggregatesInput = {
    AND?: AiUsageScalarWhereWithAggregatesInput | AiUsageScalarWhereWithAggregatesInput[]
    OR?: AiUsageScalarWhereWithAggregatesInput[]
    NOT?: AiUsageScalarWhereWithAggregatesInput | AiUsageScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"AiUsage"> | number
    task?: StringWithAggregatesFilter<"AiUsage"> | string
    provider?: StringWithAggregatesFilter<"AiUsage"> | string
    model?: StringWithAggregatesFilter<"AiUsage"> | string
    ok?: BoolWithAggregatesFilter<"AiUsage"> | boolean
    inputTokens?: IntWithAggregatesFilter<"AiUsage"> | number
    outputTokens?: IntWithAggregatesFilter<"AiUsage"> | number
    cacheReadTokens?: IntWithAggregatesFilter<"AiUsage"> | number
    cacheWriteTokens?: IntWithAggregatesFilter<"AiUsage"> | number
    costUsd?: FloatWithAggregatesFilter<"AiUsage"> | number
    durationMs?: IntNullableWithAggregatesFilter<"AiUsage"> | number | null
    error?: StringNullableWithAggregatesFilter<"AiUsage"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"AiUsage"> | Date | string
  }

  export type ExtensionLogWhereInput = {
    AND?: ExtensionLogWhereInput | ExtensionLogWhereInput[]
    OR?: ExtensionLogWhereInput[]
    NOT?: ExtensionLogWhereInput | ExtensionLogWhereInput[]
    id?: IntFilter<"ExtensionLog"> | number
    level?: StringFilter<"ExtensionLog"> | string
    message?: StringFilter<"ExtensionLog"> | string
    sessionId?: StringNullableFilter<"ExtensionLog"> | string | null
    createdAt?: DateTimeFilter<"ExtensionLog"> | Date | string
  }

  export type ExtensionLogOrderByWithRelationInput = {
    id?: SortOrder
    level?: SortOrder
    message?: SortOrder
    sessionId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type ExtensionLogWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: ExtensionLogWhereInput | ExtensionLogWhereInput[]
    OR?: ExtensionLogWhereInput[]
    NOT?: ExtensionLogWhereInput | ExtensionLogWhereInput[]
    level?: StringFilter<"ExtensionLog"> | string
    message?: StringFilter<"ExtensionLog"> | string
    sessionId?: StringNullableFilter<"ExtensionLog"> | string | null
    createdAt?: DateTimeFilter<"ExtensionLog"> | Date | string
  }, "id">

  export type ExtensionLogOrderByWithAggregationInput = {
    id?: SortOrder
    level?: SortOrder
    message?: SortOrder
    sessionId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: ExtensionLogCountOrderByAggregateInput
    _avg?: ExtensionLogAvgOrderByAggregateInput
    _max?: ExtensionLogMaxOrderByAggregateInput
    _min?: ExtensionLogMinOrderByAggregateInput
    _sum?: ExtensionLogSumOrderByAggregateInput
  }

  export type ExtensionLogScalarWhereWithAggregatesInput = {
    AND?: ExtensionLogScalarWhereWithAggregatesInput | ExtensionLogScalarWhereWithAggregatesInput[]
    OR?: ExtensionLogScalarWhereWithAggregatesInput[]
    NOT?: ExtensionLogScalarWhereWithAggregatesInput | ExtensionLogScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"ExtensionLog"> | number
    level?: StringWithAggregatesFilter<"ExtensionLog"> | string
    message?: StringWithAggregatesFilter<"ExtensionLog"> | string
    sessionId?: StringNullableWithAggregatesFilter<"ExtensionLog"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"ExtensionLog"> | Date | string
  }

  export type UserCreateInput = {
    username: string
    name: string
    passwordHash?: string
    role?: string
    active?: boolean
    sessionVersion?: number
    lastLoginAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUncheckedCreateInput = {
    id?: number
    username: string
    name: string
    passwordHash?: string
    role?: string
    active?: boolean
    sessionVersion?: number
    lastLoginAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateInput = {
    username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    active?: BoolFieldUpdateOperationsInput | boolean
    sessionVersion?: IntFieldUpdateOperationsInput | number
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    active?: BoolFieldUpdateOperationsInput | boolean
    sessionVersion?: IntFieldUpdateOperationsInput | number
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserCreateManyInput = {
    id?: number
    username: string
    name: string
    passwordHash?: string
    role?: string
    active?: boolean
    sessionVersion?: number
    lastLoginAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    active?: BoolFieldUpdateOperationsInput | boolean
    sessionVersion?: IntFieldUpdateOperationsInput | number
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    active?: BoolFieldUpdateOperationsInput | boolean
    sessionVersion?: IntFieldUpdateOperationsInput | number
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScrapedJobCreateInput = {
    platform: string
    title: string
    company: string
    location?: string | null
    url: string
    manualApplyUrl?: string | null
    applyMethod?: string | null
    description?: string | null
    salary?: string | null
    techStack?: string | null
    status?: $Enums.JobStatus
    aiScore?: number | null
    aiReason?: string | null
    sheetSynced?: boolean
    createdAt?: Date | string
    stage?: string | null
    stageUpdatedAt?: Date | string | null
    appliedAt?: Date | string | null
    followUpAt?: Date | string | null
    notes?: string | null
    resumeId?: number | null
    applicationData?: string | null
    feedback?: number | null
    feedbackAt?: Date | string | null
    eligibility?: string | null
    signals?: string | null
    analysisLogs?: AnalysisLogCreateNestedManyWithoutScrapedJobInput
  }

  export type ScrapedJobUncheckedCreateInput = {
    id?: number
    platform: string
    title: string
    company: string
    location?: string | null
    url: string
    manualApplyUrl?: string | null
    applyMethod?: string | null
    description?: string | null
    salary?: string | null
    techStack?: string | null
    status?: $Enums.JobStatus
    aiScore?: number | null
    aiReason?: string | null
    sheetSynced?: boolean
    createdAt?: Date | string
    stage?: string | null
    stageUpdatedAt?: Date | string | null
    appliedAt?: Date | string | null
    followUpAt?: Date | string | null
    notes?: string | null
    resumeId?: number | null
    applicationData?: string | null
    feedback?: number | null
    feedbackAt?: Date | string | null
    eligibility?: string | null
    signals?: string | null
    analysisLogs?: AnalysisLogUncheckedCreateNestedManyWithoutScrapedJobInput
  }

  export type ScrapedJobUpdateInput = {
    platform?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    url?: StringFieldUpdateOperationsInput | string
    manualApplyUrl?: NullableStringFieldUpdateOperationsInput | string | null
    applyMethod?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    salary?: NullableStringFieldUpdateOperationsInput | string | null
    techStack?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumJobStatusFieldUpdateOperationsInput | $Enums.JobStatus
    aiScore?: NullableIntFieldUpdateOperationsInput | number | null
    aiReason?: NullableStringFieldUpdateOperationsInput | string | null
    sheetSynced?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    stage?: NullableStringFieldUpdateOperationsInput | string | null
    stageUpdatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    appliedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUpAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    resumeId?: NullableIntFieldUpdateOperationsInput | number | null
    applicationData?: NullableStringFieldUpdateOperationsInput | string | null
    feedback?: NullableIntFieldUpdateOperationsInput | number | null
    feedbackAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    eligibility?: NullableStringFieldUpdateOperationsInput | string | null
    signals?: NullableStringFieldUpdateOperationsInput | string | null
    analysisLogs?: AnalysisLogUpdateManyWithoutScrapedJobNestedInput
  }

  export type ScrapedJobUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    platform?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    url?: StringFieldUpdateOperationsInput | string
    manualApplyUrl?: NullableStringFieldUpdateOperationsInput | string | null
    applyMethod?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    salary?: NullableStringFieldUpdateOperationsInput | string | null
    techStack?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumJobStatusFieldUpdateOperationsInput | $Enums.JobStatus
    aiScore?: NullableIntFieldUpdateOperationsInput | number | null
    aiReason?: NullableStringFieldUpdateOperationsInput | string | null
    sheetSynced?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    stage?: NullableStringFieldUpdateOperationsInput | string | null
    stageUpdatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    appliedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUpAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    resumeId?: NullableIntFieldUpdateOperationsInput | number | null
    applicationData?: NullableStringFieldUpdateOperationsInput | string | null
    feedback?: NullableIntFieldUpdateOperationsInput | number | null
    feedbackAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    eligibility?: NullableStringFieldUpdateOperationsInput | string | null
    signals?: NullableStringFieldUpdateOperationsInput | string | null
    analysisLogs?: AnalysisLogUncheckedUpdateManyWithoutScrapedJobNestedInput
  }

  export type ScrapedJobCreateManyInput = {
    id?: number
    platform: string
    title: string
    company: string
    location?: string | null
    url: string
    manualApplyUrl?: string | null
    applyMethod?: string | null
    description?: string | null
    salary?: string | null
    techStack?: string | null
    status?: $Enums.JobStatus
    aiScore?: number | null
    aiReason?: string | null
    sheetSynced?: boolean
    createdAt?: Date | string
    stage?: string | null
    stageUpdatedAt?: Date | string | null
    appliedAt?: Date | string | null
    followUpAt?: Date | string | null
    notes?: string | null
    resumeId?: number | null
    applicationData?: string | null
    feedback?: number | null
    feedbackAt?: Date | string | null
    eligibility?: string | null
    signals?: string | null
  }

  export type ScrapedJobUpdateManyMutationInput = {
    platform?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    url?: StringFieldUpdateOperationsInput | string
    manualApplyUrl?: NullableStringFieldUpdateOperationsInput | string | null
    applyMethod?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    salary?: NullableStringFieldUpdateOperationsInput | string | null
    techStack?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumJobStatusFieldUpdateOperationsInput | $Enums.JobStatus
    aiScore?: NullableIntFieldUpdateOperationsInput | number | null
    aiReason?: NullableStringFieldUpdateOperationsInput | string | null
    sheetSynced?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    stage?: NullableStringFieldUpdateOperationsInput | string | null
    stageUpdatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    appliedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUpAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    resumeId?: NullableIntFieldUpdateOperationsInput | number | null
    applicationData?: NullableStringFieldUpdateOperationsInput | string | null
    feedback?: NullableIntFieldUpdateOperationsInput | number | null
    feedbackAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    eligibility?: NullableStringFieldUpdateOperationsInput | string | null
    signals?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ScrapedJobUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    platform?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    url?: StringFieldUpdateOperationsInput | string
    manualApplyUrl?: NullableStringFieldUpdateOperationsInput | string | null
    applyMethod?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    salary?: NullableStringFieldUpdateOperationsInput | string | null
    techStack?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumJobStatusFieldUpdateOperationsInput | $Enums.JobStatus
    aiScore?: NullableIntFieldUpdateOperationsInput | number | null
    aiReason?: NullableStringFieldUpdateOperationsInput | string | null
    sheetSynced?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    stage?: NullableStringFieldUpdateOperationsInput | string | null
    stageUpdatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    appliedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUpAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    resumeId?: NullableIntFieldUpdateOperationsInput | number | null
    applicationData?: NullableStringFieldUpdateOperationsInput | string | null
    feedback?: NullableIntFieldUpdateOperationsInput | number | null
    feedbackAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    eligibility?: NullableStringFieldUpdateOperationsInput | string | null
    signals?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AppConfigCreateInput = {
    key: string
    value: string
    updatedAt?: Date | string
  }

  export type AppConfigUncheckedCreateInput = {
    key: string
    value: string
    updatedAt?: Date | string
  }

  export type AppConfigUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AppConfigUncheckedUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AppConfigCreateManyInput = {
    key: string
    value: string
    updatedAt?: Date | string
  }

  export type AppConfigUpdateManyMutationInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AppConfigUncheckedUpdateManyInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SkipRuleCreateInput = {
    type: $Enums.SkipRuleType
    pattern: string
    active?: boolean
    createdAt?: Date | string
  }

  export type SkipRuleUncheckedCreateInput = {
    id?: number
    type: $Enums.SkipRuleType
    pattern: string
    active?: boolean
    createdAt?: Date | string
  }

  export type SkipRuleUpdateInput = {
    type?: EnumSkipRuleTypeFieldUpdateOperationsInput | $Enums.SkipRuleType
    pattern?: StringFieldUpdateOperationsInput | string
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SkipRuleUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: EnumSkipRuleTypeFieldUpdateOperationsInput | $Enums.SkipRuleType
    pattern?: StringFieldUpdateOperationsInput | string
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SkipRuleCreateManyInput = {
    id?: number
    type: $Enums.SkipRuleType
    pattern: string
    active?: boolean
    createdAt?: Date | string
  }

  export type SkipRuleUpdateManyMutationInput = {
    type?: EnumSkipRuleTypeFieldUpdateOperationsInput | $Enums.SkipRuleType
    pattern?: StringFieldUpdateOperationsInput | string
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SkipRuleUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: EnumSkipRuleTypeFieldUpdateOperationsInput | $Enums.SkipRuleType
    pattern?: StringFieldUpdateOperationsInput | string
    active?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScanLogCreateInput = {
    board: string
    jobsFound?: number
    jobsSaved?: number
    errors?: string | null
    durationMs?: number | null
    createdAt?: Date | string
  }

  export type ScanLogUncheckedCreateInput = {
    id?: number
    board: string
    jobsFound?: number
    jobsSaved?: number
    errors?: string | null
    durationMs?: number | null
    createdAt?: Date | string
  }

  export type ScanLogUpdateInput = {
    board?: StringFieldUpdateOperationsInput | string
    jobsFound?: IntFieldUpdateOperationsInput | number
    jobsSaved?: IntFieldUpdateOperationsInput | number
    errors?: NullableStringFieldUpdateOperationsInput | string | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScanLogUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    board?: StringFieldUpdateOperationsInput | string
    jobsFound?: IntFieldUpdateOperationsInput | number
    jobsSaved?: IntFieldUpdateOperationsInput | number
    errors?: NullableStringFieldUpdateOperationsInput | string | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScanLogCreateManyInput = {
    id?: number
    board: string
    jobsFound?: number
    jobsSaved?: number
    errors?: string | null
    durationMs?: number | null
    createdAt?: Date | string
  }

  export type ScanLogUpdateManyMutationInput = {
    board?: StringFieldUpdateOperationsInput | string
    jobsFound?: IntFieldUpdateOperationsInput | number
    jobsSaved?: IntFieldUpdateOperationsInput | number
    errors?: NullableStringFieldUpdateOperationsInput | string | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScanLogUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    board?: StringFieldUpdateOperationsInput | string
    jobsFound?: IntFieldUpdateOperationsInput | number
    jobsSaved?: IntFieldUpdateOperationsInput | number
    errors?: NullableStringFieldUpdateOperationsInput | string | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AnalysisLogCreateInput = {
    model: string
    approved: boolean
    score?: number | null
    reason?: string | null
    tokensUsed?: number | null
    durationMs?: number | null
    createdAt?: Date | string
    scrapedJob: ScrapedJobCreateNestedOneWithoutAnalysisLogsInput
  }

  export type AnalysisLogUncheckedCreateInput = {
    id?: number
    scrapedJobId: number
    model: string
    approved: boolean
    score?: number | null
    reason?: string | null
    tokensUsed?: number | null
    durationMs?: number | null
    createdAt?: Date | string
  }

  export type AnalysisLogUpdateInput = {
    model?: StringFieldUpdateOperationsInput | string
    approved?: BoolFieldUpdateOperationsInput | boolean
    score?: NullableIntFieldUpdateOperationsInput | number | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    tokensUsed?: NullableIntFieldUpdateOperationsInput | number | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    scrapedJob?: ScrapedJobUpdateOneRequiredWithoutAnalysisLogsNestedInput
  }

  export type AnalysisLogUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    scrapedJobId?: IntFieldUpdateOperationsInput | number
    model?: StringFieldUpdateOperationsInput | string
    approved?: BoolFieldUpdateOperationsInput | boolean
    score?: NullableIntFieldUpdateOperationsInput | number | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    tokensUsed?: NullableIntFieldUpdateOperationsInput | number | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AnalysisLogCreateManyInput = {
    id?: number
    scrapedJobId: number
    model: string
    approved: boolean
    score?: number | null
    reason?: string | null
    tokensUsed?: number | null
    durationMs?: number | null
    createdAt?: Date | string
  }

  export type AnalysisLogUpdateManyMutationInput = {
    model?: StringFieldUpdateOperationsInput | string
    approved?: BoolFieldUpdateOperationsInput | boolean
    score?: NullableIntFieldUpdateOperationsInput | number | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    tokensUsed?: NullableIntFieldUpdateOperationsInput | number | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AnalysisLogUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    scrapedJobId?: IntFieldUpdateOperationsInput | number
    model?: StringFieldUpdateOperationsInput | string
    approved?: BoolFieldUpdateOperationsInput | boolean
    score?: NullableIntFieldUpdateOperationsInput | number | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    tokensUsed?: NullableIntFieldUpdateOperationsInput | number | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ResumeCreateInput = {
    name: string
    fileName: string
    mimeType: string
    sizeBytes: number
    data: Buffer
    textContent?: string | null
    parsed?: string | null
    tags?: string | null
    isDefault?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ResumeUncheckedCreateInput = {
    id?: number
    name: string
    fileName: string
    mimeType: string
    sizeBytes: number
    data: Buffer
    textContent?: string | null
    parsed?: string | null
    tags?: string | null
    isDefault?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ResumeUpdateInput = {
    name?: StringFieldUpdateOperationsInput | string
    fileName?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    data?: BytesFieldUpdateOperationsInput | Buffer
    textContent?: NullableStringFieldUpdateOperationsInput | string | null
    parsed?: NullableStringFieldUpdateOperationsInput | string | null
    tags?: NullableStringFieldUpdateOperationsInput | string | null
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ResumeUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    fileName?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    data?: BytesFieldUpdateOperationsInput | Buffer
    textContent?: NullableStringFieldUpdateOperationsInput | string | null
    parsed?: NullableStringFieldUpdateOperationsInput | string | null
    tags?: NullableStringFieldUpdateOperationsInput | string | null
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ResumeCreateManyInput = {
    id?: number
    name: string
    fileName: string
    mimeType: string
    sizeBytes: number
    data: Buffer
    textContent?: string | null
    parsed?: string | null
    tags?: string | null
    isDefault?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ResumeUpdateManyMutationInput = {
    name?: StringFieldUpdateOperationsInput | string
    fileName?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    data?: BytesFieldUpdateOperationsInput | Buffer
    textContent?: NullableStringFieldUpdateOperationsInput | string | null
    parsed?: NullableStringFieldUpdateOperationsInput | string | null
    tags?: NullableStringFieldUpdateOperationsInput | string | null
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ResumeUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    fileName?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    data?: BytesFieldUpdateOperationsInput | Buffer
    textContent?: NullableStringFieldUpdateOperationsInput | string | null
    parsed?: NullableStringFieldUpdateOperationsInput | string | null
    tags?: NullableStringFieldUpdateOperationsInput | string | null
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SavedAnswerCreateInput = {
    question: string
    answer: string
    tags?: string | null
    uses?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SavedAnswerUncheckedCreateInput = {
    id?: number
    question: string
    answer: string
    tags?: string | null
    uses?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SavedAnswerUpdateInput = {
    question?: StringFieldUpdateOperationsInput | string
    answer?: StringFieldUpdateOperationsInput | string
    tags?: NullableStringFieldUpdateOperationsInput | string | null
    uses?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SavedAnswerUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    question?: StringFieldUpdateOperationsInput | string
    answer?: StringFieldUpdateOperationsInput | string
    tags?: NullableStringFieldUpdateOperationsInput | string | null
    uses?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SavedAnswerCreateManyInput = {
    id?: number
    question: string
    answer: string
    tags?: string | null
    uses?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SavedAnswerUpdateManyMutationInput = {
    question?: StringFieldUpdateOperationsInput | string
    answer?: StringFieldUpdateOperationsInput | string
    tags?: NullableStringFieldUpdateOperationsInput | string | null
    uses?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SavedAnswerUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    question?: StringFieldUpdateOperationsInput | string
    answer?: StringFieldUpdateOperationsInput | string
    tags?: NullableStringFieldUpdateOperationsInput | string | null
    uses?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiUsageCreateInput = {
    task: string
    provider: string
    model: string
    ok?: boolean
    inputTokens?: number
    outputTokens?: number
    cacheReadTokens?: number
    cacheWriteTokens?: number
    costUsd?: number
    durationMs?: number | null
    error?: string | null
    createdAt?: Date | string
  }

  export type AiUsageUncheckedCreateInput = {
    id?: number
    task: string
    provider: string
    model: string
    ok?: boolean
    inputTokens?: number
    outputTokens?: number
    cacheReadTokens?: number
    cacheWriteTokens?: number
    costUsd?: number
    durationMs?: number | null
    error?: string | null
    createdAt?: Date | string
  }

  export type AiUsageUpdateInput = {
    task?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    model?: StringFieldUpdateOperationsInput | string
    ok?: BoolFieldUpdateOperationsInput | boolean
    inputTokens?: IntFieldUpdateOperationsInput | number
    outputTokens?: IntFieldUpdateOperationsInput | number
    cacheReadTokens?: IntFieldUpdateOperationsInput | number
    cacheWriteTokens?: IntFieldUpdateOperationsInput | number
    costUsd?: FloatFieldUpdateOperationsInput | number
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    error?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiUsageUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    task?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    model?: StringFieldUpdateOperationsInput | string
    ok?: BoolFieldUpdateOperationsInput | boolean
    inputTokens?: IntFieldUpdateOperationsInput | number
    outputTokens?: IntFieldUpdateOperationsInput | number
    cacheReadTokens?: IntFieldUpdateOperationsInput | number
    cacheWriteTokens?: IntFieldUpdateOperationsInput | number
    costUsd?: FloatFieldUpdateOperationsInput | number
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    error?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiUsageCreateManyInput = {
    id?: number
    task: string
    provider: string
    model: string
    ok?: boolean
    inputTokens?: number
    outputTokens?: number
    cacheReadTokens?: number
    cacheWriteTokens?: number
    costUsd?: number
    durationMs?: number | null
    error?: string | null
    createdAt?: Date | string
  }

  export type AiUsageUpdateManyMutationInput = {
    task?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    model?: StringFieldUpdateOperationsInput | string
    ok?: BoolFieldUpdateOperationsInput | boolean
    inputTokens?: IntFieldUpdateOperationsInput | number
    outputTokens?: IntFieldUpdateOperationsInput | number
    cacheReadTokens?: IntFieldUpdateOperationsInput | number
    cacheWriteTokens?: IntFieldUpdateOperationsInput | number
    costUsd?: FloatFieldUpdateOperationsInput | number
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    error?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiUsageUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    task?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    model?: StringFieldUpdateOperationsInput | string
    ok?: BoolFieldUpdateOperationsInput | boolean
    inputTokens?: IntFieldUpdateOperationsInput | number
    outputTokens?: IntFieldUpdateOperationsInput | number
    cacheReadTokens?: IntFieldUpdateOperationsInput | number
    cacheWriteTokens?: IntFieldUpdateOperationsInput | number
    costUsd?: FloatFieldUpdateOperationsInput | number
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    error?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ExtensionLogCreateInput = {
    level?: string
    message: string
    sessionId?: string | null
    createdAt?: Date | string
  }

  export type ExtensionLogUncheckedCreateInput = {
    id?: number
    level?: string
    message: string
    sessionId?: string | null
    createdAt?: Date | string
  }

  export type ExtensionLogUpdateInput = {
    level?: StringFieldUpdateOperationsInput | string
    message?: StringFieldUpdateOperationsInput | string
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ExtensionLogUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    level?: StringFieldUpdateOperationsInput | string
    message?: StringFieldUpdateOperationsInput | string
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ExtensionLogCreateManyInput = {
    id?: number
    level?: string
    message: string
    sessionId?: string | null
    createdAt?: Date | string
  }

  export type ExtensionLogUpdateManyMutationInput = {
    level?: StringFieldUpdateOperationsInput | string
    message?: StringFieldUpdateOperationsInput | string
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ExtensionLogUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    level?: StringFieldUpdateOperationsInput | string
    message?: StringFieldUpdateOperationsInput | string
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    name?: SortOrder
    passwordHash?: SortOrder
    role?: SortOrder
    active?: SortOrder
    sessionVersion?: SortOrder
    lastLoginAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserAvgOrderByAggregateInput = {
    id?: SortOrder
    sessionVersion?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    name?: SortOrder
    passwordHash?: SortOrder
    role?: SortOrder
    active?: SortOrder
    sessionVersion?: SortOrder
    lastLoginAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    name?: SortOrder
    passwordHash?: SortOrder
    role?: SortOrder
    active?: SortOrder
    sessionVersion?: SortOrder
    lastLoginAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserSumOrderByAggregateInput = {
    id?: SortOrder
    sessionVersion?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type EnumJobStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.JobStatus | EnumJobStatusFieldRefInput<$PrismaModel>
    in?: $Enums.JobStatus[] | ListEnumJobStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.JobStatus[] | ListEnumJobStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumJobStatusFilter<$PrismaModel> | $Enums.JobStatus
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type AnalysisLogListRelationFilter = {
    every?: AnalysisLogWhereInput
    some?: AnalysisLogWhereInput
    none?: AnalysisLogWhereInput
  }

  export type AnalysisLogOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ScrapedJobPlatformUrlCompoundUniqueInput = {
    platform: string
    url: string
  }

  export type ScrapedJobPlatformTitleCompanyCompoundUniqueInput = {
    platform: string
    title: string
    company: string
  }

  export type ScrapedJobCountOrderByAggregateInput = {
    id?: SortOrder
    platform?: SortOrder
    title?: SortOrder
    company?: SortOrder
    location?: SortOrder
    url?: SortOrder
    manualApplyUrl?: SortOrder
    applyMethod?: SortOrder
    description?: SortOrder
    salary?: SortOrder
    techStack?: SortOrder
    status?: SortOrder
    aiScore?: SortOrder
    aiReason?: SortOrder
    sheetSynced?: SortOrder
    createdAt?: SortOrder
    stage?: SortOrder
    stageUpdatedAt?: SortOrder
    appliedAt?: SortOrder
    followUpAt?: SortOrder
    notes?: SortOrder
    resumeId?: SortOrder
    applicationData?: SortOrder
    feedback?: SortOrder
    feedbackAt?: SortOrder
    eligibility?: SortOrder
    signals?: SortOrder
  }

  export type ScrapedJobAvgOrderByAggregateInput = {
    id?: SortOrder
    aiScore?: SortOrder
    resumeId?: SortOrder
    feedback?: SortOrder
  }

  export type ScrapedJobMaxOrderByAggregateInput = {
    id?: SortOrder
    platform?: SortOrder
    title?: SortOrder
    company?: SortOrder
    location?: SortOrder
    url?: SortOrder
    manualApplyUrl?: SortOrder
    applyMethod?: SortOrder
    description?: SortOrder
    salary?: SortOrder
    techStack?: SortOrder
    status?: SortOrder
    aiScore?: SortOrder
    aiReason?: SortOrder
    sheetSynced?: SortOrder
    createdAt?: SortOrder
    stage?: SortOrder
    stageUpdatedAt?: SortOrder
    appliedAt?: SortOrder
    followUpAt?: SortOrder
    notes?: SortOrder
    resumeId?: SortOrder
    applicationData?: SortOrder
    feedback?: SortOrder
    feedbackAt?: SortOrder
    eligibility?: SortOrder
    signals?: SortOrder
  }

  export type ScrapedJobMinOrderByAggregateInput = {
    id?: SortOrder
    platform?: SortOrder
    title?: SortOrder
    company?: SortOrder
    location?: SortOrder
    url?: SortOrder
    manualApplyUrl?: SortOrder
    applyMethod?: SortOrder
    description?: SortOrder
    salary?: SortOrder
    techStack?: SortOrder
    status?: SortOrder
    aiScore?: SortOrder
    aiReason?: SortOrder
    sheetSynced?: SortOrder
    createdAt?: SortOrder
    stage?: SortOrder
    stageUpdatedAt?: SortOrder
    appliedAt?: SortOrder
    followUpAt?: SortOrder
    notes?: SortOrder
    resumeId?: SortOrder
    applicationData?: SortOrder
    feedback?: SortOrder
    feedbackAt?: SortOrder
    eligibility?: SortOrder
    signals?: SortOrder
  }

  export type ScrapedJobSumOrderByAggregateInput = {
    id?: SortOrder
    aiScore?: SortOrder
    resumeId?: SortOrder
    feedback?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumJobStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.JobStatus | EnumJobStatusFieldRefInput<$PrismaModel>
    in?: $Enums.JobStatus[] | ListEnumJobStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.JobStatus[] | ListEnumJobStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumJobStatusWithAggregatesFilter<$PrismaModel> | $Enums.JobStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumJobStatusFilter<$PrismaModel>
    _max?: NestedEnumJobStatusFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type AppConfigCountOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    updatedAt?: SortOrder
  }

  export type AppConfigMaxOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    updatedAt?: SortOrder
  }

  export type AppConfigMinOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumSkipRuleTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.SkipRuleType | EnumSkipRuleTypeFieldRefInput<$PrismaModel>
    in?: $Enums.SkipRuleType[] | ListEnumSkipRuleTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.SkipRuleType[] | ListEnumSkipRuleTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumSkipRuleTypeFilter<$PrismaModel> | $Enums.SkipRuleType
  }

  export type SkipRuleCountOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    pattern?: SortOrder
    active?: SortOrder
    createdAt?: SortOrder
  }

  export type SkipRuleAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type SkipRuleMaxOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    pattern?: SortOrder
    active?: SortOrder
    createdAt?: SortOrder
  }

  export type SkipRuleMinOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    pattern?: SortOrder
    active?: SortOrder
    createdAt?: SortOrder
  }

  export type SkipRuleSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type EnumSkipRuleTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SkipRuleType | EnumSkipRuleTypeFieldRefInput<$PrismaModel>
    in?: $Enums.SkipRuleType[] | ListEnumSkipRuleTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.SkipRuleType[] | ListEnumSkipRuleTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumSkipRuleTypeWithAggregatesFilter<$PrismaModel> | $Enums.SkipRuleType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSkipRuleTypeFilter<$PrismaModel>
    _max?: NestedEnumSkipRuleTypeFilter<$PrismaModel>
  }

  export type ScanLogCountOrderByAggregateInput = {
    id?: SortOrder
    board?: SortOrder
    jobsFound?: SortOrder
    jobsSaved?: SortOrder
    errors?: SortOrder
    durationMs?: SortOrder
    createdAt?: SortOrder
  }

  export type ScanLogAvgOrderByAggregateInput = {
    id?: SortOrder
    jobsFound?: SortOrder
    jobsSaved?: SortOrder
    durationMs?: SortOrder
  }

  export type ScanLogMaxOrderByAggregateInput = {
    id?: SortOrder
    board?: SortOrder
    jobsFound?: SortOrder
    jobsSaved?: SortOrder
    errors?: SortOrder
    durationMs?: SortOrder
    createdAt?: SortOrder
  }

  export type ScanLogMinOrderByAggregateInput = {
    id?: SortOrder
    board?: SortOrder
    jobsFound?: SortOrder
    jobsSaved?: SortOrder
    errors?: SortOrder
    durationMs?: SortOrder
    createdAt?: SortOrder
  }

  export type ScanLogSumOrderByAggregateInput = {
    id?: SortOrder
    jobsFound?: SortOrder
    jobsSaved?: SortOrder
    durationMs?: SortOrder
  }

  export type ScrapedJobRelationFilter = {
    is?: ScrapedJobWhereInput
    isNot?: ScrapedJobWhereInput
  }

  export type AnalysisLogCountOrderByAggregateInput = {
    id?: SortOrder
    scrapedJobId?: SortOrder
    model?: SortOrder
    approved?: SortOrder
    score?: SortOrder
    reason?: SortOrder
    tokensUsed?: SortOrder
    durationMs?: SortOrder
    createdAt?: SortOrder
  }

  export type AnalysisLogAvgOrderByAggregateInput = {
    id?: SortOrder
    scrapedJobId?: SortOrder
    score?: SortOrder
    tokensUsed?: SortOrder
    durationMs?: SortOrder
  }

  export type AnalysisLogMaxOrderByAggregateInput = {
    id?: SortOrder
    scrapedJobId?: SortOrder
    model?: SortOrder
    approved?: SortOrder
    score?: SortOrder
    reason?: SortOrder
    tokensUsed?: SortOrder
    durationMs?: SortOrder
    createdAt?: SortOrder
  }

  export type AnalysisLogMinOrderByAggregateInput = {
    id?: SortOrder
    scrapedJobId?: SortOrder
    model?: SortOrder
    approved?: SortOrder
    score?: SortOrder
    reason?: SortOrder
    tokensUsed?: SortOrder
    durationMs?: SortOrder
    createdAt?: SortOrder
  }

  export type AnalysisLogSumOrderByAggregateInput = {
    id?: SortOrder
    scrapedJobId?: SortOrder
    score?: SortOrder
    tokensUsed?: SortOrder
    durationMs?: SortOrder
  }

  export type BytesFilter<$PrismaModel = never> = {
    equals?: Buffer | BytesFieldRefInput<$PrismaModel>
    in?: Buffer[] | ListBytesFieldRefInput<$PrismaModel>
    notIn?: Buffer[] | ListBytesFieldRefInput<$PrismaModel>
    not?: NestedBytesFilter<$PrismaModel> | Buffer
  }

  export type ResumeCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    fileName?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    data?: SortOrder
    textContent?: SortOrder
    parsed?: SortOrder
    tags?: SortOrder
    isDefault?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ResumeAvgOrderByAggregateInput = {
    id?: SortOrder
    sizeBytes?: SortOrder
  }

  export type ResumeMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    fileName?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    data?: SortOrder
    textContent?: SortOrder
    parsed?: SortOrder
    tags?: SortOrder
    isDefault?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ResumeMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    fileName?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    data?: SortOrder
    textContent?: SortOrder
    parsed?: SortOrder
    tags?: SortOrder
    isDefault?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ResumeSumOrderByAggregateInput = {
    id?: SortOrder
    sizeBytes?: SortOrder
  }

  export type BytesWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Buffer | BytesFieldRefInput<$PrismaModel>
    in?: Buffer[] | ListBytesFieldRefInput<$PrismaModel>
    notIn?: Buffer[] | ListBytesFieldRefInput<$PrismaModel>
    not?: NestedBytesWithAggregatesFilter<$PrismaModel> | Buffer
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBytesFilter<$PrismaModel>
    _max?: NestedBytesFilter<$PrismaModel>
  }

  export type SavedAnswerCountOrderByAggregateInput = {
    id?: SortOrder
    question?: SortOrder
    answer?: SortOrder
    tags?: SortOrder
    uses?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SavedAnswerAvgOrderByAggregateInput = {
    id?: SortOrder
    uses?: SortOrder
  }

  export type SavedAnswerMaxOrderByAggregateInput = {
    id?: SortOrder
    question?: SortOrder
    answer?: SortOrder
    tags?: SortOrder
    uses?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SavedAnswerMinOrderByAggregateInput = {
    id?: SortOrder
    question?: SortOrder
    answer?: SortOrder
    tags?: SortOrder
    uses?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SavedAnswerSumOrderByAggregateInput = {
    id?: SortOrder
    uses?: SortOrder
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type AiUsageCountOrderByAggregateInput = {
    id?: SortOrder
    task?: SortOrder
    provider?: SortOrder
    model?: SortOrder
    ok?: SortOrder
    inputTokens?: SortOrder
    outputTokens?: SortOrder
    cacheReadTokens?: SortOrder
    cacheWriteTokens?: SortOrder
    costUsd?: SortOrder
    durationMs?: SortOrder
    error?: SortOrder
    createdAt?: SortOrder
  }

  export type AiUsageAvgOrderByAggregateInput = {
    id?: SortOrder
    inputTokens?: SortOrder
    outputTokens?: SortOrder
    cacheReadTokens?: SortOrder
    cacheWriteTokens?: SortOrder
    costUsd?: SortOrder
    durationMs?: SortOrder
  }

  export type AiUsageMaxOrderByAggregateInput = {
    id?: SortOrder
    task?: SortOrder
    provider?: SortOrder
    model?: SortOrder
    ok?: SortOrder
    inputTokens?: SortOrder
    outputTokens?: SortOrder
    cacheReadTokens?: SortOrder
    cacheWriteTokens?: SortOrder
    costUsd?: SortOrder
    durationMs?: SortOrder
    error?: SortOrder
    createdAt?: SortOrder
  }

  export type AiUsageMinOrderByAggregateInput = {
    id?: SortOrder
    task?: SortOrder
    provider?: SortOrder
    model?: SortOrder
    ok?: SortOrder
    inputTokens?: SortOrder
    outputTokens?: SortOrder
    cacheReadTokens?: SortOrder
    cacheWriteTokens?: SortOrder
    costUsd?: SortOrder
    durationMs?: SortOrder
    error?: SortOrder
    createdAt?: SortOrder
  }

  export type AiUsageSumOrderByAggregateInput = {
    id?: SortOrder
    inputTokens?: SortOrder
    outputTokens?: SortOrder
    cacheReadTokens?: SortOrder
    cacheWriteTokens?: SortOrder
    costUsd?: SortOrder
    durationMs?: SortOrder
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type ExtensionLogCountOrderByAggregateInput = {
    id?: SortOrder
    level?: SortOrder
    message?: SortOrder
    sessionId?: SortOrder
    createdAt?: SortOrder
  }

  export type ExtensionLogAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type ExtensionLogMaxOrderByAggregateInput = {
    id?: SortOrder
    level?: SortOrder
    message?: SortOrder
    sessionId?: SortOrder
    createdAt?: SortOrder
  }

  export type ExtensionLogMinOrderByAggregateInput = {
    id?: SortOrder
    level?: SortOrder
    message?: SortOrder
    sessionId?: SortOrder
    createdAt?: SortOrder
  }

  export type ExtensionLogSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type AnalysisLogCreateNestedManyWithoutScrapedJobInput = {
    create?: XOR<AnalysisLogCreateWithoutScrapedJobInput, AnalysisLogUncheckedCreateWithoutScrapedJobInput> | AnalysisLogCreateWithoutScrapedJobInput[] | AnalysisLogUncheckedCreateWithoutScrapedJobInput[]
    connectOrCreate?: AnalysisLogCreateOrConnectWithoutScrapedJobInput | AnalysisLogCreateOrConnectWithoutScrapedJobInput[]
    createMany?: AnalysisLogCreateManyScrapedJobInputEnvelope
    connect?: AnalysisLogWhereUniqueInput | AnalysisLogWhereUniqueInput[]
  }

  export type AnalysisLogUncheckedCreateNestedManyWithoutScrapedJobInput = {
    create?: XOR<AnalysisLogCreateWithoutScrapedJobInput, AnalysisLogUncheckedCreateWithoutScrapedJobInput> | AnalysisLogCreateWithoutScrapedJobInput[] | AnalysisLogUncheckedCreateWithoutScrapedJobInput[]
    connectOrCreate?: AnalysisLogCreateOrConnectWithoutScrapedJobInput | AnalysisLogCreateOrConnectWithoutScrapedJobInput[]
    createMany?: AnalysisLogCreateManyScrapedJobInputEnvelope
    connect?: AnalysisLogWhereUniqueInput | AnalysisLogWhereUniqueInput[]
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type EnumJobStatusFieldUpdateOperationsInput = {
    set?: $Enums.JobStatus
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type AnalysisLogUpdateManyWithoutScrapedJobNestedInput = {
    create?: XOR<AnalysisLogCreateWithoutScrapedJobInput, AnalysisLogUncheckedCreateWithoutScrapedJobInput> | AnalysisLogCreateWithoutScrapedJobInput[] | AnalysisLogUncheckedCreateWithoutScrapedJobInput[]
    connectOrCreate?: AnalysisLogCreateOrConnectWithoutScrapedJobInput | AnalysisLogCreateOrConnectWithoutScrapedJobInput[]
    upsert?: AnalysisLogUpsertWithWhereUniqueWithoutScrapedJobInput | AnalysisLogUpsertWithWhereUniqueWithoutScrapedJobInput[]
    createMany?: AnalysisLogCreateManyScrapedJobInputEnvelope
    set?: AnalysisLogWhereUniqueInput | AnalysisLogWhereUniqueInput[]
    disconnect?: AnalysisLogWhereUniqueInput | AnalysisLogWhereUniqueInput[]
    delete?: AnalysisLogWhereUniqueInput | AnalysisLogWhereUniqueInput[]
    connect?: AnalysisLogWhereUniqueInput | AnalysisLogWhereUniqueInput[]
    update?: AnalysisLogUpdateWithWhereUniqueWithoutScrapedJobInput | AnalysisLogUpdateWithWhereUniqueWithoutScrapedJobInput[]
    updateMany?: AnalysisLogUpdateManyWithWhereWithoutScrapedJobInput | AnalysisLogUpdateManyWithWhereWithoutScrapedJobInput[]
    deleteMany?: AnalysisLogScalarWhereInput | AnalysisLogScalarWhereInput[]
  }

  export type AnalysisLogUncheckedUpdateManyWithoutScrapedJobNestedInput = {
    create?: XOR<AnalysisLogCreateWithoutScrapedJobInput, AnalysisLogUncheckedCreateWithoutScrapedJobInput> | AnalysisLogCreateWithoutScrapedJobInput[] | AnalysisLogUncheckedCreateWithoutScrapedJobInput[]
    connectOrCreate?: AnalysisLogCreateOrConnectWithoutScrapedJobInput | AnalysisLogCreateOrConnectWithoutScrapedJobInput[]
    upsert?: AnalysisLogUpsertWithWhereUniqueWithoutScrapedJobInput | AnalysisLogUpsertWithWhereUniqueWithoutScrapedJobInput[]
    createMany?: AnalysisLogCreateManyScrapedJobInputEnvelope
    set?: AnalysisLogWhereUniqueInput | AnalysisLogWhereUniqueInput[]
    disconnect?: AnalysisLogWhereUniqueInput | AnalysisLogWhereUniqueInput[]
    delete?: AnalysisLogWhereUniqueInput | AnalysisLogWhereUniqueInput[]
    connect?: AnalysisLogWhereUniqueInput | AnalysisLogWhereUniqueInput[]
    update?: AnalysisLogUpdateWithWhereUniqueWithoutScrapedJobInput | AnalysisLogUpdateWithWhereUniqueWithoutScrapedJobInput[]
    updateMany?: AnalysisLogUpdateManyWithWhereWithoutScrapedJobInput | AnalysisLogUpdateManyWithWhereWithoutScrapedJobInput[]
    deleteMany?: AnalysisLogScalarWhereInput | AnalysisLogScalarWhereInput[]
  }

  export type EnumSkipRuleTypeFieldUpdateOperationsInput = {
    set?: $Enums.SkipRuleType
  }

  export type ScrapedJobCreateNestedOneWithoutAnalysisLogsInput = {
    create?: XOR<ScrapedJobCreateWithoutAnalysisLogsInput, ScrapedJobUncheckedCreateWithoutAnalysisLogsInput>
    connectOrCreate?: ScrapedJobCreateOrConnectWithoutAnalysisLogsInput
    connect?: ScrapedJobWhereUniqueInput
  }

  export type ScrapedJobUpdateOneRequiredWithoutAnalysisLogsNestedInput = {
    create?: XOR<ScrapedJobCreateWithoutAnalysisLogsInput, ScrapedJobUncheckedCreateWithoutAnalysisLogsInput>
    connectOrCreate?: ScrapedJobCreateOrConnectWithoutAnalysisLogsInput
    upsert?: ScrapedJobUpsertWithoutAnalysisLogsInput
    connect?: ScrapedJobWhereUniqueInput
    update?: XOR<XOR<ScrapedJobUpdateToOneWithWhereWithoutAnalysisLogsInput, ScrapedJobUpdateWithoutAnalysisLogsInput>, ScrapedJobUncheckedUpdateWithoutAnalysisLogsInput>
  }

  export type BytesFieldUpdateOperationsInput = {
    set?: Buffer
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumJobStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.JobStatus | EnumJobStatusFieldRefInput<$PrismaModel>
    in?: $Enums.JobStatus[] | ListEnumJobStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.JobStatus[] | ListEnumJobStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumJobStatusFilter<$PrismaModel> | $Enums.JobStatus
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedEnumJobStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.JobStatus | EnumJobStatusFieldRefInput<$PrismaModel>
    in?: $Enums.JobStatus[] | ListEnumJobStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.JobStatus[] | ListEnumJobStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumJobStatusWithAggregatesFilter<$PrismaModel> | $Enums.JobStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumJobStatusFilter<$PrismaModel>
    _max?: NestedEnumJobStatusFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumSkipRuleTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.SkipRuleType | EnumSkipRuleTypeFieldRefInput<$PrismaModel>
    in?: $Enums.SkipRuleType[] | ListEnumSkipRuleTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.SkipRuleType[] | ListEnumSkipRuleTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumSkipRuleTypeFilter<$PrismaModel> | $Enums.SkipRuleType
  }

  export type NestedEnumSkipRuleTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SkipRuleType | EnumSkipRuleTypeFieldRefInput<$PrismaModel>
    in?: $Enums.SkipRuleType[] | ListEnumSkipRuleTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.SkipRuleType[] | ListEnumSkipRuleTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumSkipRuleTypeWithAggregatesFilter<$PrismaModel> | $Enums.SkipRuleType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSkipRuleTypeFilter<$PrismaModel>
    _max?: NestedEnumSkipRuleTypeFilter<$PrismaModel>
  }

  export type NestedBytesFilter<$PrismaModel = never> = {
    equals?: Buffer | BytesFieldRefInput<$PrismaModel>
    in?: Buffer[] | ListBytesFieldRefInput<$PrismaModel>
    notIn?: Buffer[] | ListBytesFieldRefInput<$PrismaModel>
    not?: NestedBytesFilter<$PrismaModel> | Buffer
  }

  export type NestedBytesWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Buffer | BytesFieldRefInput<$PrismaModel>
    in?: Buffer[] | ListBytesFieldRefInput<$PrismaModel>
    notIn?: Buffer[] | ListBytesFieldRefInput<$PrismaModel>
    not?: NestedBytesWithAggregatesFilter<$PrismaModel> | Buffer
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBytesFilter<$PrismaModel>
    _max?: NestedBytesFilter<$PrismaModel>
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type AnalysisLogCreateWithoutScrapedJobInput = {
    model: string
    approved: boolean
    score?: number | null
    reason?: string | null
    tokensUsed?: number | null
    durationMs?: number | null
    createdAt?: Date | string
  }

  export type AnalysisLogUncheckedCreateWithoutScrapedJobInput = {
    id?: number
    model: string
    approved: boolean
    score?: number | null
    reason?: string | null
    tokensUsed?: number | null
    durationMs?: number | null
    createdAt?: Date | string
  }

  export type AnalysisLogCreateOrConnectWithoutScrapedJobInput = {
    where: AnalysisLogWhereUniqueInput
    create: XOR<AnalysisLogCreateWithoutScrapedJobInput, AnalysisLogUncheckedCreateWithoutScrapedJobInput>
  }

  export type AnalysisLogCreateManyScrapedJobInputEnvelope = {
    data: AnalysisLogCreateManyScrapedJobInput | AnalysisLogCreateManyScrapedJobInput[]
    skipDuplicates?: boolean
  }

  export type AnalysisLogUpsertWithWhereUniqueWithoutScrapedJobInput = {
    where: AnalysisLogWhereUniqueInput
    update: XOR<AnalysisLogUpdateWithoutScrapedJobInput, AnalysisLogUncheckedUpdateWithoutScrapedJobInput>
    create: XOR<AnalysisLogCreateWithoutScrapedJobInput, AnalysisLogUncheckedCreateWithoutScrapedJobInput>
  }

  export type AnalysisLogUpdateWithWhereUniqueWithoutScrapedJobInput = {
    where: AnalysisLogWhereUniqueInput
    data: XOR<AnalysisLogUpdateWithoutScrapedJobInput, AnalysisLogUncheckedUpdateWithoutScrapedJobInput>
  }

  export type AnalysisLogUpdateManyWithWhereWithoutScrapedJobInput = {
    where: AnalysisLogScalarWhereInput
    data: XOR<AnalysisLogUpdateManyMutationInput, AnalysisLogUncheckedUpdateManyWithoutScrapedJobInput>
  }

  export type AnalysisLogScalarWhereInput = {
    AND?: AnalysisLogScalarWhereInput | AnalysisLogScalarWhereInput[]
    OR?: AnalysisLogScalarWhereInput[]
    NOT?: AnalysisLogScalarWhereInput | AnalysisLogScalarWhereInput[]
    id?: IntFilter<"AnalysisLog"> | number
    scrapedJobId?: IntFilter<"AnalysisLog"> | number
    model?: StringFilter<"AnalysisLog"> | string
    approved?: BoolFilter<"AnalysisLog"> | boolean
    score?: IntNullableFilter<"AnalysisLog"> | number | null
    reason?: StringNullableFilter<"AnalysisLog"> | string | null
    tokensUsed?: IntNullableFilter<"AnalysisLog"> | number | null
    durationMs?: IntNullableFilter<"AnalysisLog"> | number | null
    createdAt?: DateTimeFilter<"AnalysisLog"> | Date | string
  }

  export type ScrapedJobCreateWithoutAnalysisLogsInput = {
    platform: string
    title: string
    company: string
    location?: string | null
    url: string
    manualApplyUrl?: string | null
    applyMethod?: string | null
    description?: string | null
    salary?: string | null
    techStack?: string | null
    status?: $Enums.JobStatus
    aiScore?: number | null
    aiReason?: string | null
    sheetSynced?: boolean
    createdAt?: Date | string
    stage?: string | null
    stageUpdatedAt?: Date | string | null
    appliedAt?: Date | string | null
    followUpAt?: Date | string | null
    notes?: string | null
    resumeId?: number | null
    applicationData?: string | null
    feedback?: number | null
    feedbackAt?: Date | string | null
    eligibility?: string | null
    signals?: string | null
  }

  export type ScrapedJobUncheckedCreateWithoutAnalysisLogsInput = {
    id?: number
    platform: string
    title: string
    company: string
    location?: string | null
    url: string
    manualApplyUrl?: string | null
    applyMethod?: string | null
    description?: string | null
    salary?: string | null
    techStack?: string | null
    status?: $Enums.JobStatus
    aiScore?: number | null
    aiReason?: string | null
    sheetSynced?: boolean
    createdAt?: Date | string
    stage?: string | null
    stageUpdatedAt?: Date | string | null
    appliedAt?: Date | string | null
    followUpAt?: Date | string | null
    notes?: string | null
    resumeId?: number | null
    applicationData?: string | null
    feedback?: number | null
    feedbackAt?: Date | string | null
    eligibility?: string | null
    signals?: string | null
  }

  export type ScrapedJobCreateOrConnectWithoutAnalysisLogsInput = {
    where: ScrapedJobWhereUniqueInput
    create: XOR<ScrapedJobCreateWithoutAnalysisLogsInput, ScrapedJobUncheckedCreateWithoutAnalysisLogsInput>
  }

  export type ScrapedJobUpsertWithoutAnalysisLogsInput = {
    update: XOR<ScrapedJobUpdateWithoutAnalysisLogsInput, ScrapedJobUncheckedUpdateWithoutAnalysisLogsInput>
    create: XOR<ScrapedJobCreateWithoutAnalysisLogsInput, ScrapedJobUncheckedCreateWithoutAnalysisLogsInput>
    where?: ScrapedJobWhereInput
  }

  export type ScrapedJobUpdateToOneWithWhereWithoutAnalysisLogsInput = {
    where?: ScrapedJobWhereInput
    data: XOR<ScrapedJobUpdateWithoutAnalysisLogsInput, ScrapedJobUncheckedUpdateWithoutAnalysisLogsInput>
  }

  export type ScrapedJobUpdateWithoutAnalysisLogsInput = {
    platform?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    url?: StringFieldUpdateOperationsInput | string
    manualApplyUrl?: NullableStringFieldUpdateOperationsInput | string | null
    applyMethod?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    salary?: NullableStringFieldUpdateOperationsInput | string | null
    techStack?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumJobStatusFieldUpdateOperationsInput | $Enums.JobStatus
    aiScore?: NullableIntFieldUpdateOperationsInput | number | null
    aiReason?: NullableStringFieldUpdateOperationsInput | string | null
    sheetSynced?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    stage?: NullableStringFieldUpdateOperationsInput | string | null
    stageUpdatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    appliedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUpAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    resumeId?: NullableIntFieldUpdateOperationsInput | number | null
    applicationData?: NullableStringFieldUpdateOperationsInput | string | null
    feedback?: NullableIntFieldUpdateOperationsInput | number | null
    feedbackAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    eligibility?: NullableStringFieldUpdateOperationsInput | string | null
    signals?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ScrapedJobUncheckedUpdateWithoutAnalysisLogsInput = {
    id?: IntFieldUpdateOperationsInput | number
    platform?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    url?: StringFieldUpdateOperationsInput | string
    manualApplyUrl?: NullableStringFieldUpdateOperationsInput | string | null
    applyMethod?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    salary?: NullableStringFieldUpdateOperationsInput | string | null
    techStack?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumJobStatusFieldUpdateOperationsInput | $Enums.JobStatus
    aiScore?: NullableIntFieldUpdateOperationsInput | number | null
    aiReason?: NullableStringFieldUpdateOperationsInput | string | null
    sheetSynced?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    stage?: NullableStringFieldUpdateOperationsInput | string | null
    stageUpdatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    appliedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUpAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    resumeId?: NullableIntFieldUpdateOperationsInput | number | null
    applicationData?: NullableStringFieldUpdateOperationsInput | string | null
    feedback?: NullableIntFieldUpdateOperationsInput | number | null
    feedbackAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    eligibility?: NullableStringFieldUpdateOperationsInput | string | null
    signals?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AnalysisLogCreateManyScrapedJobInput = {
    id?: number
    model: string
    approved: boolean
    score?: number | null
    reason?: string | null
    tokensUsed?: number | null
    durationMs?: number | null
    createdAt?: Date | string
  }

  export type AnalysisLogUpdateWithoutScrapedJobInput = {
    model?: StringFieldUpdateOperationsInput | string
    approved?: BoolFieldUpdateOperationsInput | boolean
    score?: NullableIntFieldUpdateOperationsInput | number | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    tokensUsed?: NullableIntFieldUpdateOperationsInput | number | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AnalysisLogUncheckedUpdateWithoutScrapedJobInput = {
    id?: IntFieldUpdateOperationsInput | number
    model?: StringFieldUpdateOperationsInput | string
    approved?: BoolFieldUpdateOperationsInput | boolean
    score?: NullableIntFieldUpdateOperationsInput | number | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    tokensUsed?: NullableIntFieldUpdateOperationsInput | number | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AnalysisLogUncheckedUpdateManyWithoutScrapedJobInput = {
    id?: IntFieldUpdateOperationsInput | number
    model?: StringFieldUpdateOperationsInput | string
    approved?: BoolFieldUpdateOperationsInput | boolean
    score?: NullableIntFieldUpdateOperationsInput | number | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    tokensUsed?: NullableIntFieldUpdateOperationsInput | number | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use ScrapedJobCountOutputTypeDefaultArgs instead
     */
    export type ScrapedJobCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ScrapedJobCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use UserDefaultArgs instead
     */
    export type UserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ScrapedJobDefaultArgs instead
     */
    export type ScrapedJobArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ScrapedJobDefaultArgs<ExtArgs>
    /**
     * @deprecated Use AppConfigDefaultArgs instead
     */
    export type AppConfigArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = AppConfigDefaultArgs<ExtArgs>
    /**
     * @deprecated Use SkipRuleDefaultArgs instead
     */
    export type SkipRuleArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = SkipRuleDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ScanLogDefaultArgs instead
     */
    export type ScanLogArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ScanLogDefaultArgs<ExtArgs>
    /**
     * @deprecated Use AnalysisLogDefaultArgs instead
     */
    export type AnalysisLogArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = AnalysisLogDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ResumeDefaultArgs instead
     */
    export type ResumeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ResumeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use SavedAnswerDefaultArgs instead
     */
    export type SavedAnswerArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = SavedAnswerDefaultArgs<ExtArgs>
    /**
     * @deprecated Use AiUsageDefaultArgs instead
     */
    export type AiUsageArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = AiUsageDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ExtensionLogDefaultArgs instead
     */
    export type ExtensionLogArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ExtensionLogDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}