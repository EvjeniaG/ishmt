/**
 * Politikat e afateve sipas Udhëzimit ISHMT dhe rregullores së tregut.
 * Burim i vetëm i së vërtetës për copy UI dhe llogaritje.
 */

/** Afati maksimal për çdo procedurë administrative (nga protokolli). */
export const PROCEDURE_WORKING_DAYS = 10;

/** Inspektim periodik: ndërtesa banimi / të tjera (muaj). */
export const INSPECTION_INTERVAL_MONTHS_DEFAULT = 12;

/** Insëktim periodik: vend pune, ndërtesë publike (muaj). */
export const INSPECTION_INTERVAL_MONTHS_WORKPLACE = 6;

/** Ditë paralajmërimi para skadimit të inspektimit / certifikatës / kontratës. */
export const COMPLIANCE_WARNING_DAYS = 30;

/** Raport mujor mirëmbajtjeje - alarm pas ditëve pa ndërhyrje. */
export const MAINTENANCE_REPORT_MAX_DAYS = 30;

export const ISHMT_DEADLINE_PRINCIPLES = [
  "Afati maksimal për çdo procedurë: 10 ditë pune nga protokollimi i kërkesës së plotë.",
  "Çdo ndryshim ose përditësim që prek të dhënat → certifikatë e re CR (kurrë mbishkrim).",
  "Çdo veprim dokumentohet me lidhje elektronike (hyperlink) në regjistër.",
  "Asnjë e dhënë nuk fshihet fizikisht - ruhet gjurmueshmëria historike.",
  "Inspektimet periodike: 6 muaj (vend pune / ndërtesë publike) ose 12 muaj (të tjera).",
  "ISHMT kryen vlerësim periodik; ndryshimet ligjore reflektohen me amendamente.",
] as const;
