import { ApplicationType } from "@prisma/client";

export const APPLICATION_TYPE_LABELS: Record<ApplicationType, string> = {
  NEW_REGISTRATION: "Regjistrim i ri",
  DEREGISTRATION: "Çregjistrim",
  DATA_CORRECTION: "Ndryshim të dhënash",
  DATA_UPDATE: "Përditësim të dhënave",
  MODERNIZATION: "Modernizim",
};

export const OWNERSHIP_TRANSFER_LABEL = "Transferim pronësie";
