import { describe, expect, it } from "vitest";
import {
  buildContractsExportHref,
  buildContractsFilterHref,
  isContractsSearchParamsChange,
  parseContractIssueFilters,
} from "@/lib/ishmt/contract-issue-filters";

describe("contract issue filters", () => {
  it("parses issue and expiring window", () => {
    const filters = parseContractIssueFilters({
      issue: "no-inspection-contract",
      expiringWithin: "7",
      page: "2",
    });

    expect(filters.issue).toBe("no-inspection-contract");
    expect(filters.expiringWithin).toBe(7);
    expect(filters.page).toBe(2);
  });

  it("builds export href without pagination", () => {
    const href = buildContractsExportHref({
      issue: "no-maintenance-contract",
      page: 4,
    });

    expect(href).toBe("/api/ishmt/contracts/export?issue=no-maintenance-contract");
    expect(href).not.toContain("page=");
  });

  it("detects contracts query changes", () => {
    expect(isContractsSearchParamsChange("issue=a", "issue=b")).toBe(true);
    expect(isContractsSearchParamsChange("issue=a", "issue=a")).toBe(false);
  });

  it("round-trips filter href", () => {
    const href = buildContractsFilterHref({
      issueCategory: "missing",
      q: "000901",
      page: 3,
    });

    expect(href).toContain("issueCategory=missing");
    expect(href).toContain("q=000901");
    expect(href).toContain("page=3");
  });
});
