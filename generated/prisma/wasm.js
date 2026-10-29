
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.ScrapedJobScalarFieldEnum = {
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

exports.Prisma.AppConfigScalarFieldEnum = {
  key: 'key',
  value: 'value',
  updatedAt: 'updatedAt'
};

exports.Prisma.SkipRuleScalarFieldEnum = {
  id: 'id',
  type: 'type',
  pattern: 'pattern',
  active: 'active',
  createdAt: 'createdAt'
};

exports.Prisma.ScanLogScalarFieldEnum = {
  id: 'id',
  board: 'board',
  jobsFound: 'jobsFound',
  jobsSaved: 'jobsSaved',
  errors: 'errors',
  durationMs: 'durationMs',
  createdAt: 'createdAt'
};

exports.Prisma.AnalysisLogScalarFieldEnum = {
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

exports.Prisma.ResumeScalarFieldEnum = {
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

exports.Prisma.SavedAnswerScalarFieldEnum = {
  id: 'id',
  question: 'question',
  answer: 'answer',
  tags: 'tags',
  uses: 'uses',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AiUsageScalarFieldEnum = {
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

exports.Prisma.ExtensionLogScalarFieldEnum = {
  id: 'id',
  level: 'level',
  message: 'message',
  sessionId: 'sessionId',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.JobStatus = exports.$Enums.JobStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

exports.SkipRuleType = exports.$Enums.SkipRuleType = {
  TITLE: 'TITLE',
  COMPANY: 'COMPANY',
  URL: 'URL'
};

exports.Prisma.ModelName = {
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

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
