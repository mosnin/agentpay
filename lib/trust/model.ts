/** Versioned marketplace-behavior evidence. Never a measure of personal worth. */
export const TRUST_MODEL = "bids-trust-v1";
export const TRUST_WINDOW_DAYS = 365;
const DAY = 86400000;
export interface TrustJob {
  id: string;
  buyerId: string;
  sellerId: string;
  buyerOrganizationId: string | null;
  sellerOrganizationId: string | null;
  confirmedLiveFunding: boolean;
  status: string;
  fundedAt: Date | null;
  acceptedAt: Date | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  deadline: Date | null;
  buyerRespondedAt: Date | null;
  rating: number | null;
  findings: { subjectUserId: string; outcome: string; createdAt: Date }[];
}
export interface TrustMetric {
  key: string;
  label: string;
  weight: number;
  samples: number;
  rate: number | null;
  explanation: string;
}
export interface TrustDimension {
  role: "buyer" | "seller";
  score: number | null;
  confidence: "insufficient" | "limited" | "established" | "extensive";
  sampleCount: number;
  counterparties: number;
  coverage: number;
  metrics: TrustMetric[];
}
export interface TrustReport {
  model: string;
  calculatedAt: string;
  windowDays: number;
  buyer: TrustDimension;
  seller: TrustDimension;
  eligibleJobs: number;
  excludedJobs: number;
  explanation: string;
}
const DEFINITIONS = {
  delivery: {
    label: "Delivery outcomes",
    weight: 40,
    explanation:
      "Approved deliveries and evidenced non-delivery after an accepted deadline. No-fault refunds are neutral.",
  },
  timing: {
    label: "Delivery on time",
    weight: 20,
    explanation:
      "Submission against an agreed deadline. Jobs without a deadline do not count.",
  },
  reviews: {
    label: "Buyer feedback",
    weight: 25,
    explanation:
      "Buyer ratings on completed, live-funded jobs; one result per counterparty per month.",
  },
  conduct: {
    label: "Agreement conduct",
    weight: 15,
    explanation:
      "Completed agreements and adjudicated findings. An open complaint never lowers this metric.",
  },
  response: {
    label: "Review responsiveness",
    weight: 60,
    explanation:
      "Approval or a recorded dispute within 72 hours of a valid delivery. Missing historical timestamps are excluded.",
  },
};
function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}
export function trustReport(
  userId: string,
  jobs: TrustJob[],
  now = new Date(),
): TrustReport {
  const eligible = jobs.filter(
    (j) =>
      j.confirmedLiveFunding &&
      j.fundedAt &&
      j.fundedAt <= now &&
      now.getTime() - j.fundedAt.getTime() <= TRUST_WINDOW_DAYS * DAY &&
      j.buyerId !== j.sellerId &&
      !(
        j.buyerOrganizationId &&
        j.buyerOrganizationId === j.sellerOrganizationId
      ),
  );
  function dimension(role: "buyer" | "seller"): TrustDimension {
    const rows = eligible
      .filter((j) => (role === "buyer" ? j.buyerId : j.sellerId) === userId)
      .sort(
        (a, b) =>
          b.fundedAt!.getTime() - a.fundedAt!.getTime() ||
          a.id.localeCompare(b.id),
      );
    // Repeated transactions cannot buy unlimited influence from one counterparty.
    const seen = new Set<string>();
    const samples = rows.filter((j) => {
      if (
        j.status === "cancelled" &&
        !j.findings.some((f) => f.subjectUserId === userId)
      )
        return false;
      const resolved =
        j.completedAt ||
        j.findings.length ||
        (j.status !== "cancelled" &&
          j.acceptedAt &&
          j.deadline &&
          j.deadline < now &&
          !j.submittedAt);
      if (
        !resolved &&
        !(
          role === "buyer" &&
          j.submittedAt &&
          now.getTime() - j.submittedAt.getTime() >= 3 * DAY
        )
      )
        return false;
      const key = `${role === "buyer" ? j.sellerId : j.buyerId}:${j.fundedAt!.toISOString().slice(0, 7)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const keys =
      role === "seller"
        ? (["delivery", "timing", "reviews", "conduct"] as const)
        : (["response", "conduct"] as const);
    let scoreSum = 0,
      measuredWeight = 0;
    const metrics = keys.map((key) => {
      const definition = DEFINITIONS[key];
      const weight =
        role === "buyer" && key === "conduct" ? 40 : definition.weight;
      let total = 0,
        positive = 0,
        count = 0;
      for (const j of samples) {
        const adverse = j.findings.some(
          (f) => f.subjectUserId === userId && f.outcome === "breach",
        );
        let value: number | null = null;
        if (key === "delivery") {
          if (j.status === "completed" && j.completedAt) value = 1;
          else if (
            adverse ||
            (j.status !== "cancelled" &&
              j.acceptedAt &&
              j.deadline &&
              j.deadline < now &&
              !j.submittedAt)
          )
            value = 0;
        }
        if (
          key === "timing" &&
          j.status !== "cancelled" &&
          j.deadline &&
          j.acceptedAt
        ) {
          if (j.submittedAt) value = j.submittedAt <= j.deadline ? 1 : 0;
          else if (j.deadline < now) value = 0;
        }
        if (
          key === "reviews" &&
          j.status === "completed" &&
          j.rating !== null &&
          j.rating >= 1 &&
          j.rating <= 5
        )
          value = (j.rating - 1) / 4;
        if (key === "conduct") {
          if (adverse) value = 0;
          else if (j.status === "completed" && j.completedAt) value = 1;
          else if (
            j.findings.some(
              (f) => f.subjectUserId === userId && f.outcome === "cleared",
            )
          )
            value = 1;
        }
        if (key === "response" && j.submittedAt) {
          if (j.buyerRespondedAt && j.buyerRespondedAt >= j.submittedAt)
            value =
              j.buyerRespondedAt.getTime() - j.submittedAt.getTime() <= 3 * DAY
                ? 1
                : 0;
          else if (now.getTime() - j.submittedAt.getTime() >= 3 * DAY)
            value = 0;
        }
        if (value !== null) {
          const decay = Math.pow(
            0.5,
            (now.getTime() - j.fundedAt!.getTime()) / (90 * DAY),
          );
          total += decay;
          positive += value * decay;
          count++;
        }
      }
      if (count) {
        scoreSum += (weight * (positive + 2)) / (total + 4);
        measuredWeight += weight;
      }
      return {
        key,
        ...definition,
        weight,
        samples: count,
        rate: count ? Math.round(clamp((positive / total) * 100)) : null,
      };
    });
    const counterparties = new Set(
      samples.map((j) => (role === "buyer" ? j.sellerId : j.buyerId)),
    ).size;
    const enough =
      samples.length >= 5 &&
      counterparties >= 3 &&
      metrics.filter((m) => m.samples >= 3).length >= 2;
    const confidence = !enough
      ? "insufficient"
      : samples.length >= 50 && counterparties >= 10 && measuredWeight >= 75
        ? "extensive"
        : samples.length >= 20 && counterparties >= 5
          ? "established"
          : "limited";
    return {
      role,
      score:
        enough && measuredWeight
          ? Math.round(clamp((scoreSum / measuredWeight) * 100))
          : null,
      confidence,
      sampleCount: samples.length,
      counterparties,
      coverage: measuredWeight,
      metrics,
    };
  }
  return {
    model: TRUST_MODEL,
    calculatedAt: now.toISOString(),
    windowDays: TRUST_WINDOW_DAYS,
    buyer: dimension("buyer"),
    seller: dimension("seller"),
    eligibleJobs: eligible.length,
    excludedJobs: jobs.length - eligible.length,
    explanation:
      "Only confirmed live-funded marketplace behavior counts. Scores use a neutral statistical prior, 90-day evidence half-life and capped counterparty influence. At least five outcomes, three counterparties and two measured metrics are required. Wallet wealth and unproven complaints do not affect the score. This is not identity verification or a guarantee of future performance.",
  };
}
