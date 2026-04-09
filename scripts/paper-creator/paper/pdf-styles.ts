import { StyleSheet } from "@react-pdf/renderer";

export const colors = {
  background: "#FFFFFF",
  cardBg: "#FFFFFF",
  cardBorder: "#E2E8F0",
  tableHeader: "#F1F5F9",
  tableRowAlt: "#F8FAFC",

  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  textOnDark: "#FFFFFF",

  purple: "#86628D",
  purpleDark: "#5F4364",
  purpleLight: "#A889AE",
  purpleVLight: "#C9B3CE",
  green: "#10B981",
  greenBright: "#53FF45",
  yellow: "#F59E0B",
  red: "#EF4444",
  cyan: "#06B6D4",

  border: "#CBD5E1",
  borderLight: "#E2E8F0",

  chartPrimary: "#5F4364",
  chartSecondary: "#86628D",
  chartTertiary: "#A889AE",
  chartQuaternary: "#C9B3CE",
  chartGreen: "#10B981",
  chartYellow: "#F59E0B",
  chartRed: "#EF4444",
  chartCyan: "#06B6D4",
};

export const styles = StyleSheet.create({
  // ── Page ──
  page: {
    padding: 40,
    paddingBottom: 60,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },

  // ── Title page ──
  titlePage: {
    padding: 40,
    paddingBottom: 60,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  titleAccentBar: {
    width: 60,
    height: 4,
    backgroundColor: colors.purple,
    marginBottom: 24,
  },
  titleMain: {
    fontSize: 36,
    fontWeight: "bold",
    color: colors.textPrimary,
    lineHeight: 1.2,
    marginBottom: 8,
  },
  titleAccent: {
    fontSize: 36,
    fontWeight: "bold",
    color: colors.purple,
    lineHeight: 1.2,
    marginBottom: 16,
  },
  titleSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 1.5,
    marginBottom: 32,
  },
  titleMeta: {
    fontSize: 10,
    color: colors.textMuted,
  },

  // ── Header/Footer ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerBrand: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.purple,
  },
  headerSection: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 8,
  },
  footerBrand: {
    fontSize: 8,
    color: colors.textMuted,
  },
  footerPage: {
    fontSize: 8,
    color: colors.textMuted,
  },

  // ── Section titles ──
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionTitleAccent: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.purple,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 22,
    lineHeight: 1.5,
  },

  // ── Stat callouts (giant numbers) ──
  heroStat: {
    fontSize: 48,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  heroStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  heroStatSub: {
    fontSize: 9,
    color: colors.textMuted,
  },

  // ── Stat card grid ──
  statCardRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    backgroundColor: colors.cardBg,
  },
  statCardLabel: {
    fontSize: 8,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  statCardSub: {
    fontSize: 8,
    color: colors.textMuted,
  },
  statCardAccent: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: colors.purple,
  },
  statCardAccentLabel: {
    fontSize: 8,
    color: colors.textOnDark,
    opacity: 0.8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statCardAccentValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textOnDark,
    marginBottom: 2,
  },
  statCardAccentSub: {
    fontSize: 8,
    color: colors.textOnDark,
    opacity: 0.8,
  },

  // ── Disruption cards (bordered, like 10x.ai) ──
  disruptionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  disruptionCard: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  disruptionValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.purple,
    marginBottom: 4,
  },
  disruptionLabel: {
    fontSize: 9,
    color: colors.textSecondary,
  },

  // ── Narrative text ──
  narrative: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 1.6,
    marginBottom: 18,
  },
  narrativeBold: {
    fontWeight: "bold",
    color: colors.textPrimary,
  },

  // ── Tables ──
  table: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tableHeaderRow: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: colors.purple,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.textOnDark,
    textTransform: "uppercase",
  },
  tableCell: {
    fontSize: 8,
    color: colors.textPrimary,
  },
  tableCellMuted: {
    fontSize: 8,
    color: colors.textSecondary,
  },
  tableRowAlt: {
    backgroundColor: colors.tableRowAlt,
  },

  // ── Chart container ──
  chartContainer: {
    marginTop: 8,
    marginBottom: 20,
  },
  chartLabel: {
    fontSize: 8,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // ── Legend ──
  legendRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 8,
    color: colors.textSecondary,
  },

  // ── Problem cards (stakeholder breakdown like 10x.ai) ──
  problemCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  problemBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    backgroundColor: colors.purple,
  },
  problemBadgeText: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.textOnDark,
  },
  problemText: {
    flex: 1,
  },
  problemTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  problemDescription: {
    fontSize: 9,
    color: colors.textSecondary,
  },

  // ── Methodology ──
  defBox: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    backgroundColor: colors.tableRowAlt,
    marginBottom: 12,
  },
  defBoxWarning: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
    marginBottom: 12,
  },
  defTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  defText: {
    fontSize: 8,
    color: colors.textSecondary,
    lineHeight: 1.5,
  },

  // ── Action steps ──
  actionCallout: {
    backgroundColor: "#F5F0F6",
    borderLeftWidth: 4,
    borderLeftColor: colors.purple,
    borderRadius: 8,
    padding: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  actionStepTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.purpleDark,
    marginBottom: 4,
  },
  actionStepMeta: {
    fontSize: 9,
    color: colors.textSecondary,
    lineHeight: 1.45,
    marginBottom: 2,
  },
  actionStepImpact: {
    fontSize: 9,
    color: colors.green,
    fontWeight: "bold",
    lineHeight: 1.45,
    marginTop: 2,
  },

  // ── Comparison / cluster cards ──
  comparisonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  comparisonCard: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
  },
  comparisonCardPositive: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },
  comparisonCardNegative: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  comparisonCardTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  comparisonMetricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  comparisonMetricCol: {
    width: "47%",
  },
  comparisonMetricLabel: {
    fontSize: 7,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  comparisonMetricValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  clusterCard: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    backgroundColor: colors.cardBg,
  },
  clusterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  clusterMetricRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  clusterMetricCol: {
    flex: 1,
  },
  clusterMetricLabel: {
    fontSize: 7,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  clusterMetricValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  clusterInterpretation: {
    fontSize: 8,
    color: colors.textSecondary,
    lineHeight: 1.45,
    marginTop: 8,
  },
});
