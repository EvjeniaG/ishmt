/** MIME types and extensions allowed by DocumentService.validateUpload for contracts. */
export const CONTRACT_DOCUMENT_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const CONTRACT_DOCUMENT_HINT = "PDF, foto (JPG/PNG) ose Word (DOC/DOCX)";

/** Same allowed formats for maintenance logs, inspection reports, and company compliance uploads. */
export const COMPLIANCE_DOCUMENT_ACCEPT = CONTRACT_DOCUMENT_ACCEPT;
export const COMPLIANCE_DOCUMENT_HINT = CONTRACT_DOCUMENT_HINT;
