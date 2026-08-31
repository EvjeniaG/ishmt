import { DelegationStatus, DelegationType } from "@prisma/client";

type RecipientOrg = {
  name: string;
  nipt?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  representativeName?: string | null;
  representativeNid?: string | null;
  representativeEmail?: string | null;
  representativePhone?: string | null;
};

type RecipientDelegation = {
  accessType: DelegationType;
  status: DelegationStatus;
  acceptedAt?: Date | null;
  organization?: RecipientOrg | null;
};

export type OwnershipTransferRecipientProfile = {
  name: string;
  nipt?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  representativeName?: string | null;
  representativeNid?: string | null;
  delegationStatus?: DelegationStatus;
  acceptedAt?: Date | null;
  transferReason?: string | null;
};

export function resolveOwnershipTransferRecipient(input: {
  responsibleEntityName?: string | null;
  responsibleEntityIdentifier?: string | null;
  updateFields?: unknown;
  delegations?: RecipientDelegation[] | null;
}): OwnershipTransferRecipientProfile | null {
  const delegation = input.delegations?.find(
    (d) => d.accessType === DelegationType.OWNERSHIP_RECIPIENT,
  );
  const org = delegation?.organization;

  const name = input.responsibleEntityName ?? org?.name;
  const nipt = input.responsibleEntityIdentifier ?? org?.nipt;
  if (!name && !nipt) return null;

  const changes = Array.isArray(input.updateFields)
    ? (input.updateFields as { reason?: string }[])
    : [];
  const transferReason = changes.find((c) => c.reason)?.reason ?? null;

  return {
    name: name ?? "-",
    nipt,
    address: org?.address ?? null,
    email: org?.email ?? org?.representativeEmail ?? null,
    phone: org?.phone ?? org?.representativePhone ?? null,
    representativeName: org?.representativeName ?? null,
    representativeNid: org?.representativeNid ?? null,
    delegationStatus: delegation?.status,
    acceptedAt: delegation?.acceptedAt ?? null,
    transferReason,
  };
}

export function formatOwnershipTransferAcceptedAt(value?: Date | null): string | null {
  if (!value) return null;
  return value.toLocaleDateString("sq-AL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
