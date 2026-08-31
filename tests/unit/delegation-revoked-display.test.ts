import {
  ApplicationStatus,
  ApplicationType,
  DelegationStatus,
  DelegationType,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import { ApplicationService } from "@/lib/services/application-service";
import {
  DELEGATION_REVOKED_ACTION_LABEL,
  DELEGATION_REVOKED_STATUS_LABEL,
  displayCertifierColumn,
  displayInstallerColumn,
  isDelegationRevokedForOrg,
} from "@/lib/delegation/delegation-revoked";
import { ROLE_CODES } from "@/lib/constants/roles";
import { COMPLETED_APPLICATION_STATUS_LABEL, NO_FURTHER_ACTION_LABEL } from "@/lib/registration/status-presentation";

describe("isDelegationRevokedForOrg", () => {
  const delegations = [
    {
      organizationId: "org-certifier",
      accessType: DelegationType.CERTIFIER,
      status: DelegationStatus.REVOKED,
    },
  ];

  it("detects revoked certifier delegation for the org", () => {
    expect(
      isDelegationRevokedForOrg(delegations, ROLE_CODES.CERTIFIER, "org-certifier"),
    ).toBe(true);
  });

  it("stays revoked while the application progresses with another certifier", () => {
    expect(
      isDelegationRevokedForOrg(
        delegations,
        ROLE_CODES.CERTIFIER,
        "org-certifier",
        {
          certifierOrgId: "org-other",
          installerOrgId: "org-installer",
          status: ApplicationStatus.SUBMITTED,
        } as never,
      ),
    ).toBe(true);
  });

  it("clears revoked view after the same company is invited again", () => {
    expect(
      isDelegationRevokedForOrg(
        [
          {
            organizationId: "org-certifier",
            accessType: DelegationType.CERTIFIER,
            status: DelegationStatus.INVITED,
          },
        ],
        ROLE_CODES.CERTIFIER,
        "org-certifier",
        { certifierOrgId: "org-certifier", installerOrgId: null },
      ),
    ).toBe(false);
  });

  it("ignores revoked delegation for another org", () => {
    expect(
      isDelegationRevokedForOrg(delegations, ROLE_CODES.CERTIFIER, "org-other"),
    ).toBe(false);
  });
});

describe("delegate list columns", () => {
  it("shows revoked certifier name for the withdrawn company", () => {
    expect(
      displayCertifierColumn(
        {
          certifierOrg: null,
          certifierOrgId: null,
          delegations: [
            {
              organizationId: "org-certifier",
              accessType: DelegationType.CERTIFIER,
              status: DelegationStatus.REVOKED,
              organization: { name: "Blerim Vata OM" },
            },
          ],
        },
        {
          roleCode: ROLE_CODES.CERTIFIER,
          activeOrgId: "org-certifier",
          activeOrgName: "Blerim Vata OM",
        },
        (name) => name ?? null,
      ),
    ).toBe("Blerim Vata OM (e tërhequr)");
  });

  it("shows revoked installer trace for owner list", () => {
    expect(
      displayInstallerColumn(
        {
          installerOrg: null,
          installerOrgId: null,
          delegations: [
            {
              organizationId: "org-installer",
              accessType: DelegationType.INSTALLER,
              status: DelegationStatus.REVOKED,
              organization: { name: "Ashensorë Pro Sh.p.k." },
            },
          ],
        },
        { roleCode: ROLE_CODES.OWNER, activeOrgId: "org-owner", activeOrgName: "Owner" },
      ),
    ).toBe("Ashensorë Pro Sh.p.k. (e tërhequr)");
  });
});

describe("ApplicationService.getNextRequiredAction for revoked delegation", () => {
  const revokedCertifierApp = {
    id: "app-1",
    type: ApplicationType.NEW_REGISTRATION,
    status: ApplicationStatus.SUBMITTED,
    certifierOrgId: "org-other",
    installerOrgId: "org-installer",
    delegations: [
      {
        organizationId: "org-certifier",
        accessType: DelegationType.CERTIFIER,
        status: DelegationStatus.REVOKED,
      },
    ],
  };

  it("returns revoked action label instead of live application workflow label", () => {
    expect(
      ApplicationService.getNextRequiredAction(
        revokedCertifierApp,
        ROLE_CODES.CERTIFIER,
        "org-certifier",
      ),
    ).toBe(DELEGATION_REVOKED_ACTION_LABEL);
  });

  it("exports stable revoked status label for list badges", () => {
    expect(DELEGATION_REVOKED_STATUS_LABEL).toBe("Ftesa u tërhoq");
  });
});

describe("ApplicationService.getNextRequiredAction for ownership transfer", () => {
  const approvedTransferApp = {
    id: "app-transfer-1",
    type: ApplicationType.DATA_UPDATE,
    status: ApplicationStatus.APPROVED,
    delegations: [
      {
        organizationId: "org-recipient",
        accessType: DelegationType.OWNERSHIP_RECIPIENT,
        status: DelegationStatus.ACCEPTED,
      },
    ],
  };

  it("shows completed next step after approved ownership transfer", () => {
    expect(
      ApplicationService.getNextRequiredAction(
        approvedTransferApp,
        ROLE_CODES.OWNER,
        "org-sender",
      ),
    ).toBe(NO_FURTHER_ACTION_LABEL);
  });

  it("shows submit step when delegation is accepted but not yet submitted", () => {
    expect(
      ApplicationService.getNextRequiredAction(
        {
          ...approvedTransferApp,
          status: ApplicationStatus.BASIC_DATA_COMPLETED,
        },
        ROLE_CODES.OWNER,
        "org-sender",
      ),
    ).toBe("Parashtroni te IQMT");
  });
});
