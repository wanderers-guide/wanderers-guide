// These types are defined in `@mintlify/models/src/types/cliScoreResponse.ts`.
// The server (mintlify/server) is the source of truth for this contract — it
// implements the response shape in `agentReadinessScore.controller.ts` →
// `getCliSiteScore`. Do not redefine the shape locally; update the shared
// package (and bump the dependency in both repos) if you need to change it.
export type {
  CliCheckStatus,
  CliGrade,
  CliScoreCheck as Check,
  CliScorePendingResponse,
  CliScoreResolveResponse as ResolveResult,
  CliScoreResolveStatus as ResolveStatus,
  CliScoreResponse as ScoreResponse,
  CliScoreResponseStatus,
} from '@mintlify/models';
