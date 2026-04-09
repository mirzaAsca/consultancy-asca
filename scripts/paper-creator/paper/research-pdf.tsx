/**
 * Research Paper — hypothesis-driven SEO study.
 * Composes all parts into a single Document.
 */

import React from "react";
import { Document } from "@react-pdf/renderer";

// Part I: Front Matter + Study Setup
import {
  TitlePage,
  ExecutiveSummaryPage,
  TableOfContentsPage,
  AbstractPage,
  DatasetPage,
  PortfolioSnapshotPage,
  HowToReadPage,
} from "./pdf-sections/part1-study";

// Part II: The Discoveries
import {
  F1_LifecyclePage, F2_AgeCurvePage, F3_CtrCliffPage, F4_FreshnessPage,
  F5_EngagementPage, F6_AITrafficPage, F7_CombinationsPage, F8_AgeFreshnessPage,
  F9_DiversificationPage, F10_AIModelPage, F11_SeasonalPage,
  F12_KeywordDriftPage, F12_KeywordDriftPerformancePage,
} from "./pdf-sections/part2-discoveries";

// Part III: The Surprises
import {
  FailuresOverviewPage,
  Myth1_SearchVolumePage, Myth2_FlagStackingPage, Myth3_WordCountPage,
  Myth4_AIContentPage, Myth5_CompetitionPage, Myth6_FreshnessPage,
  Myth7_PublishVelocityPage, Myth8_CPCPage, Myth9_EngagementPage,
  Myth10_IntentPage, Myth11_VisibilityGrowthPage,
} from "./pdf-sections/part3-surprises";

// Part IV: What the Data Says (ML-backed, validated)
import {
  ML1_CorrelationPage, ML2_ClustersPage,
  ML3_GrowthPredictionPage, ML4_ZombieRecoveryPage,
  ML5_MomentumPage, ML6_RefreshROIPage,
  ML7_ThresholdsPage, ML8_SignificancePage,
} from "./pdf-sections/part4-ml";

// Part V: Playbook + Methodology
import {
  PlaybookActionsPage, PlaybookRefreshPage, PlaybookAITrafficPage,
  PlaybookQuickWinsPage, RisksPage, MethodologyPage,
} from "./pdf-sections/part5-playbook";

// Part VI: Why FlyRank
import { FlyRankPage1, FlyRankPage2 } from "./pdf-sections/part6-flyrank";

export function ResearchPaper({ data }: { data: any }) {
  const policy = data.sectionPolicy ?? {};

  return (
    <Document>
      {/* Part I: Front Matter + Study Setup */}
      <TitlePage d={data} />
      <ExecutiveSummaryPage d={data} />
      <TableOfContentsPage d={data} />
      <AbstractPage d={data} />
      <DatasetPage d={data} />
      <PortfolioSnapshotPage d={data} />
      <HowToReadPage d={data} />
      <MethodologyPage d={data} />

      {/* Part II: Core Findings */}
      <F1_LifecyclePage d={data} />
      <F2_AgeCurvePage d={data} />
      <F4_FreshnessPage d={data} />
      <F8_AgeFreshnessPage d={data} />
      {policy.includeCtrPage !== false && <F3_CtrCliffPage d={data} />}
      <F5_EngagementPage d={data} />
      <F7_CombinationsPage d={data} />
      <F9_DiversificationPage d={data} />
      <F6_AITrafficPage d={data} />
      <F10_AIModelPage d={data} />
      <F11_SeasonalPage d={data} />
      <F12_KeywordDriftPage d={data} />
      <F12_KeywordDriftPerformancePage d={data} />

      {/* Part III: Myth Tests */}
      <FailuresOverviewPage d={data} />
      <Myth1_SearchVolumePage d={data} />
      {policy.includeFlagsPage !== false && <Myth2_FlagStackingPage d={data} />}
      <Myth3_WordCountPage d={data} />
      <Myth4_AIContentPage d={data} />
      <Myth5_CompetitionPage d={data} />
      <Myth6_FreshnessPage d={data} />
      <Myth7_PublishVelocityPage d={data} />
      <Myth8_CPCPage d={data} />
      <Myth9_EngagementPage d={data} />
      <Myth10_IntentPage d={data} />
      <Myth11_VisibilityGrowthPage d={data} />

      {/* Part IV: What the Data Says — ML-backed, validated findings */}
      {policy.includeRisksPage !== false && <RisksPage d={data} />}
      <ML1_CorrelationPage d={data} />
      <ML2_ClustersPage d={data} />
      <ML3_GrowthPredictionPage d={data} />
      <ML4_ZombieRecoveryPage d={data} />
      <ML5_MomentumPage d={data} />
      <ML6_RefreshROIPage d={data} />
      <ML7_ThresholdsPage d={data} />
      <ML8_SignificancePage d={data} />

      {/* Part V: Playbook */}
      <PlaybookActionsPage d={data} />
      <PlaybookRefreshPage d={data} />
      <PlaybookAITrafficPage d={data} />
      <PlaybookQuickWinsPage d={data} />

      {/* Part VI: Why FlyRank */}
      <FlyRankPage1 d={data} />
      <FlyRankPage2 d={data} />
    </Document>
  );
}
